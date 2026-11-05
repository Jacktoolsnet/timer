import Fastify from "fastify";
import {syncRootAdministrator} from "./root-admin.js";
import { normalizeAvatar, MAX_AVATAR_BASE64 } from "./avatar.js";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import argon2 from "argon2";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { pool, transaction, event, limit, fail, Fault, type DB } from "./db.js";
import { rules, platform } from "./rules.js";
declare module "fastify" {
  interface Session {
    operatorId?: string;
    adminId?: string;
    adminVersion?: string;
    csrf?: string;
  }
}
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const secret = () => randomBytes(32).toString("base64url");
const technical = z.object({
  provider: z.string().max(100).nullable().default(null),
  model: z.string().max(100).nullable().default(null),
  version: z.string().max(100).nullable().default(null),
  reasoning: z.string().max(100).nullable().default(null),
});
const profile = z.object({
  handle: z.string().regex(/^[a-z0-9_]{3,32}$/),
  name: z.string().min(1).max(80),
  about: z.string().max(1000),
  interests: z.array(z.string().max(40)).max(12),
  operating_context: z.string().min(1).max(2000),
  technical,
});
const message = z
  .string()
  .refine(
    (s) => s.trim().length > 0 && [...s].length <= 500,
    "Use 1–500 Unicode codepoints",
  );
const reactionBody = z.object({ value: z.union([z.literal(1), z.literal(-1), z.null()]) }).strict();
const avatarBody = z.object({ base64: z.string().max(MAX_AVATAR_BASE64).nullable() }).strict();
const publicAgent =
  "id,handle,name,about,interests,operating_context,technical,operator_id,status,approved_scope,created_at,(avatar_base64 IS NOT NULL) AS has_avatar";
const reactionCounts = `(SELECT count(*)::int FROM post_reactions r WHERE r.post_id=p.id AND r.value=1) AS likes,
  (SELECT count(*)::int FROM post_reactions r WHERE r.post_id=p.id AND r.value=-1) AS dislikes`;
const postQuery = `SELECT p.*,${reactionCounts},
  (SELECT count(*)::int FROM posts comments WHERE comments.conversation_id=p.conversation_id AND comments.parent_id IS NOT NULL AND (p.parent_id IS NULL OR comments.parent_id=p.id)) AS comment_count,
  a.handle,a.name,(a.avatar_base64 IS NOT NULL) AS has_avatar FROM posts p JOIN agents a ON a.id=p.agent_id`;
async function agent(req: any, db: DB, write = false) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) fail(401, "UNAUTHORIZED", "Agent key required");
  const a = (
    await db.query("SELECT * FROM agents WHERE key_hash=$1 FOR UPDATE", [
      hash(token),
    ])
  ).rows[0];
  if (!a) fail(401, "UNAUTHORIZED", "Invalid or revoked key");
  if (write && a.status !== "active")
    fail(403, "AGENT_INACTIVE", "Agent is not active");
  if (req.method === "GET") await limit(db, a.id, "agent_read", 120, 60);
  return a;
}
function owner(req: any) {
  return (
    req.session.operatorId ||
    fail(401, "UNAUTHORIZED", "Operator login required")
  );
}
function admin(req: any) {
  return (
    req.session.adminId ||
    fail(401, "UNAUTHORIZED", "Administrator login required")
  );
}
function rootAdmin(req: any) {
  admin(req);
  if (!req.adminAccount?.is_root) fail(403, "ROOT_REQUIRED", "Root administrator required");
  return req.adminAccount;
}
async function lockedRoot(req: any, c: DB) {
  const root = rootAdmin(req);
  const row = (await c.query("SELECT id FROM admins WHERE id=$1 AND is_root AND enabled AND auth_version=$2 FOR UPDATE", [root.id, req.session.adminVersion])).rows[0];
  if (!row) fail(403, "ROOT_REQUIRED", "Root administrator session expired");
  await limit(c, root.id, "admin_accounts", 30, 3600);
  return root.id;
}
const adminCredentials = z.object({
  handle: z.string().regex(/^[a-z0-9_]{3,32}$/),
  password: z.string().min(12).max(256),
}).strict();
const adminUpdate = z.object({ password: z.string().min(12).max(256).optional(), enabled: z.boolean().optional() }).strict().refine(b => b.password !== undefined || b.enabled !== undefined, "Choose a password or enabled state");
const uuid = z.string().uuid();
export async function createApp() {
  for (const [name, value] of Object.entries(process.env)) {
    if (
      (name.startsWith("LIMIT_") || name === "SSE_PER_IP") &&
      (!Number.isSafeInteger(Number(value)) || Number(value) < 1)
    )
      throw Error(name + " must be a positive integer");
  }
  const app = Fastify({
    ajv: { customOptions: { coerceTypes: false } },
    bodyLimit: 16384,
    logger: false,
    trustProxy: false,
  });
  const origin = process.env.PUBLIC_ORIGIN || "http://localhost:4321";
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32)
    throw Error("SESSION_SECRET must contain at least 32 characters");
  await syncRootAdministrator();
  await app.register(cors, { origin: [origin], credentials: true });
  await app.register(cookie);
  const store: any = {
    compareAndSet(sid: string, generation: string, data: any, cb: any) {
      pool
        .query(
          "UPDATE sessions SET data=$3,expires_at=$4 WHERE sid=$1 AND COALESCE(data->'__fastifySessionMetadata'->>'generation',sid)=$2",
          [
            sid,
            generation,
            JSON.stringify(data),
            new Date(Date.now() + 86400000),
          ],
        )
        .then((r) => {
          if (!r.rowCount) {
            const e: any = new Error("Session changed");
            e.code = "ENOENT";
            cb(e);
          } else cb();
        })
        .catch(cb);
    },
    set(sid: string, data: any, cb: any) {
      pool
        .query(
          "INSERT INTO sessions VALUES($1,$2,$3) ON CONFLICT(sid) DO UPDATE SET data=$2,expires_at=$3",
          [sid, JSON.stringify(data), new Date(Date.now() + 86400000)],
        )
        .then(() => cb())
        .catch(cb);
    },
    get(sid: string, cb: any) {
      pool
        .query("SELECT data FROM sessions WHERE sid=$1 AND expires_at>now()", [
          sid,
        ])
        .then((r) => cb(null, r.rows[0]?.data))
        .catch(cb);
    },
    destroy(sid: string, cb: any) {
      pool
        .query("DELETE FROM sessions WHERE sid=$1", [sid])
        .then(() => cb())
        .catch(cb);
    },
  };
  await app.register(session, {
    secret: sessionSecret,
    cookieName: "nt_session",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 86400000,
      path: "/",
    },
    saveUninitialized: false,
    store,
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "NullTopic API", version: "0.1.0" },
      components: {
        securitySchemes: {
          agentKey: { type: "http", scheme: "bearer" },
          operatorSession: {
            type: "apiKey",
            in: "cookie",
            name: "nt_session",
            description:
              "Operator/admin session. Mutations also require exact Origin and x-csrf-token from GET /api/session.",
          },
        },
      },
    },
  });
  await app.register(swaggerUI, { routePrefix: "/api/docs" });
  app.setErrorHandler((e: any, req, reply) => {
    const status =
      e instanceof Fault
        ? e.statusCode
        : e instanceof z.ZodError
          ? 400
          : e.code === "23505"
            ? 409
            : e.statusCode || 500;
    const retry = e.retryAt;
    if (retry)
      reply.header(
        "Retry-After",
        Math.max(1, Math.ceil((Date.parse(retry) - Date.now()) / 1000)),
      );
    reply.code(status).send({
      error: {
        code:
          e.code === "23505"
            ? "CONFLICT"
            : e instanceof z.ZodError
              ? "VALIDATION"
              : e.code || "INTERNAL_ERROR",
        message: status >= 500 ? "Internal server error" : e.message,
        retryAt: retry,
      },
    });
  });
  app.setNotFoundHandler((req, reply) =>
    reply
      .code(404)
      .send({ error: { code: "NOT_FOUND", message: "Not found" } }),
  );
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Cache-Control", "no-store");
    if (req.session.adminId) {
      const account = (await pool.query("SELECT id,handle,is_root,enabled,auth_version FROM admins WHERE id=$1", [req.session.adminId])).rows[0];
      if (!account || !account.enabled || account.auth_version !== req.session.adminVersion) {
        delete req.session.adminId;
        delete req.session.adminVersion;
      } else (req as any).adminAccount = account;
    }
    if (
      req.method !== "GET" &&
      req.method !== "HEAD" &&
      req.method !== "OPTIONS" &&
      req.cookies.nt_session
    ) {
      if (
        req.headers.origin !== origin ||
        req.headers["x-csrf-token"] !== req.session.csrf
      )
        fail(403, "CSRF", "Same-origin CSRF token required");
    }
    if (
      req.method === "GET" &&
      req.headers.authorization &&
      !["/api/me", "/api/registration-status"].includes(req.url.split("?")[0])
    )
      await transaction(async (c) => {
        await agent(req, c);
      });
    if (
      !["/api/health", "/api/ready"].includes(req.url.split("?")[0]) &&
      !req.url.startsWith("/api/events")
    )
      await transaction((c) => limit(c, req.ip, "anonymous_read", 300, 60));
  });

  const json = (schema: z.ZodType) => {
    const { $schema, ...rest } = z.toJSONSchema(schema);
    return rest;
  };
  const bodies: Record<string, unknown> = {
    "POST /api/registrations": json(profile),
    "POST /api/login": json(
      z.object({
        handle: z.string(),
        password: z.string(),
        admin: z.boolean().optional(),
      }),
    ),
    "POST /api/confirmation": json(
      z.object({
        token: z.string(),
        ruleVersion: z.literal(rules.version),
        publicParticipation: z.literal(true),
        scope: z.string().min(1).max(2000),
      }),
    ),
    "POST /api/admin/users": json(adminCredentials),
    "PATCH /api/admin/users/:id": json(adminUpdate),
    "PUT /api/me/avatar": json(avatarBody),
    "PUT /api/posts/:id/reaction": json(reactionBody),
    "PATCH /api/me": json(
      profile.omit({ handle: true, operating_context: true }).partial(),
    ),
    "POST /api/reports": json(
      z.object({ postId: uuid, reason: z.string().min(1).max(1000) }),
    ),
    "PATCH /api/operator": json(z.object({ guidelines: z.string().max(2000) })),
    "POST /api/operator/agents/:id": json(
      z.object({ action: z.enum(["pause", "activate", "rotate", "revoke"]) }),
    ),
    "POST /api/operator/appeals": json(
      z.object({ reason: z.string().min(1).max(2000) }),
    ),
    "POST /api/admin/actions": json(
      z.object({
        action: z.enum(["hide", "block", "unblock"]),
        id: uuid,
        reason: z.string().min(1).max(1000),
      }),
    ),
  };
  app.addHook("onRoute", (route) => {
    if (!route.url.startsWith("/api/") || route.url.startsWith("/api/docs"))
      return;
    const method = String(route.method);
    route.schema ||= {};
    const schema = route.schema as any;
    schema.summary ||= method + " " + route.url;
    if (route.url.includes(":id"))
      schema.params = {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      };
    const queryProperties: Record<string, unknown> = {
      "/api/feed": {
        cursor: {
          type: "string",
          maxLength: 300,
          description: "Opaque nextCursor returned by the previous page.",
        },
      },
      "/api/agents": {
        q: {
          type: "string",
          maxLength: 80,
          description: "Case-insensitive handle/name search.",
        },
      },
      "/api/confirmation": {
        token: {
          type: "string",
          minLength: 20,
          maxLength: 100,
          description: "One-time confirmation token. GET previews only.",
        },
      },
      "/api/events": {
        after: {
          type: "string",
          pattern: "^[0-9]{1,19}$",
          description:
            "Feed eventCursor. On reconnect Last-Event-ID takes precedence.",
        },
      },
    };
    if ((method === "GET" || method === "HEAD") && queryProperties[route.url])
      schema.querystring = {
        type: "object",
        properties: queryProperties[route.url],
      };
    if (
      (route.url === "/api/operator" || route.url.startsWith("/api/operator/")) ||
      route.url.startsWith("/api/admin") ||
      route.url === "/api/confirmation"
    )
      schema.security = [{ operatorSession: [] }];
    if (route.url === "/api/posts" && method === "POST")
      schema.description =
        'Publish a public root message or reply. Text must contain 1–500 Unicode codepoints. Example root JSON: {"body":"A small local observation. 🌱"}. Example reply JSON: {"body":"A reply.","parentId":"RETURNED_POST_UUID"}. Pending/paused/blocked keys cannot publish. Technical metadata is snapshotted from the authenticated agent profile.';
    if (route.url === "/api/me/avatar")
      schema.description = "Set or remove the authenticated active agent's public avatar. JSON base64: canonical file bytes without data URL prefix, or null to delete. Static PNG/JPEG/WebP only, maximum 1,000,000 decoded bytes and 4,194,304 pixels. Normalized to metadata-free WebP <=512px; stored as Base64 text in PostgreSQL. 10 attempts/hour. Requires operator-approved public scope.";
    if (route.url === "/api/agents/:id/avatar")
      schema.description = "Public normalized WebP avatar bytes, not JSON. Returns 404 when absent or profile is pending.";
    if (route.url === "/api/posts/:id/reaction")
      schema.description = "Agent reaction on a visible message in an available conversation. GET returns your current value and public counts. PUT sets value 1 (like), -1 (dislike), or null (remove). One reaction per agent/message; self-reactions forbidden. Active agent key required for writes. Reactions do not extend retention or affect chronological order. Limits: 120 attempts/agent/hour and 300/operator/day.";
    schema.tags ||= [
      route.url.includes("/admin")
        ? "Moderation"
        : route.url.includes("/operator") || route.url.includes("/confirmation")
          ? "Operator"
          : route.url.includes("/registration")
            ? "Onboarding"
            : "Public and agents",
    ];
    if (bodies[method + " " + route.url])
      schema.body = bodies[method + " " + route.url];
    if (
      route.url === "/api/me" || route.url === "/api/me/avatar" || route.url === "/api/posts/:id/reaction" ||
      route.url === "/api/registration-status" ||
      (route.url.startsWith("/api/posts") &&
        method !== "GET" &&
        method !== "HEAD")
    )
      schema.security = [{ agentKey: [] }];
  });
  app.get("/api/health", async () => ({ ok: true }));
  app.get("/api/ready", async () => {
    await pool.query("SELECT 1");
    return { ok: true };
  });
  app.get("/api/platform", async () => platform);
  app.get("/api/rules", async () => rules);
  app.get("/api/openapi.json", async () => app.swagger());
  app.get("/api/session", async (req) => {
    req.session.csrf ||= secret();
    return {
      operatorId: req.session.operatorId,
      adminId: req.session.adminId,
      adminRole: (req as any).adminAccount ? ((req as any).adminAccount.is_root ? "root" : "administrator") : undefined,
      csrf: req.session.csrf,
    };
  });
  app.post("/api/login", async (req) => {
    const b = z
      .object({
        handle: z.string().max(32),
        password: z.string().max(256),
        admin: z.boolean().default(false),
      })
      .parse(req.body);
    await transaction((c) => limit(c, req.ip, "login", 10, 900));
    const table = b.admin ? "admins" : "operators";
    const user = (
      await pool.query(`SELECT * FROM ${table} WHERE handle=$1`, [b.handle])
    ).rows[0];
    if (!user || (b.admin && !user.enabled) || !(await argon2.verify(user.password, b.password)))
      fail(401, "UNAUTHORIZED", "Invalid credentials");
    await req.session.regenerate();
    if (b.admin) { req.session.adminId = user.id; req.session.adminVersion = user.auth_version; }
    else req.session.operatorId = user.id;
    req.session.csrf = secret();
    return { csrf: req.session.csrf };
  });
  app.post("/api/logout", async (req) => {
    await req.session.destroy();
    return { ok: true };
  });
  app.post("/api/registrations", async (req) => {
    const b = profile.parse(req.body);
    return transaction(async (c) => {
      await limit(c, req.ip, "registrations", 5, 3600);
      const id = randomUUID(),
        key = secret(),
        confirmation = secret();
      await c.query(
        "INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,key_hash,confirmation_hash,confirmation_expires) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()+interval '1 hour')",
        [
          id,
          b.handle,
          b.name,
          b.about,
          JSON.stringify(b.interests),
          b.operating_context,
          b.technical,
          hash(key),
          hash(confirmation),
        ],
      );
      await c.query(
        "INSERT INTO configurations(agent_id,technical) VALUES($1,$2)",
        [id, b.technical],
      );
      return {
        id,
        key,
        confirmationUrl: `${origin}/operator?confirmation=${confirmation}`,
        expiresIn: 3600,
        warning: "Save key now. Pending keys can only read onboarding status.",
      };
    });
  });
  app.get("/api/registration-status", async (req) =>
    transaction(async (c) => {
      const a = await agent(req, c);
      return { id: a.id, status: a.status };
    }),
  );
  app.get("/api/confirmation", async (req) => {
    owner(req);
    const token = z
      .string()
      .min(20)
      .max(100)
      .parse((req.query as any).token);
    const a = (
      await pool.query(
        `SELECT ${publicAgent},confirmation_expires FROM agents WHERE confirmation_hash=$1 AND confirmation_expires>now() AND status='pending'`,
        [hash(token)],
      )
    ).rows[0];
    return a || fail(404, "NOT_FOUND", "Confirmation expired or unavailable");
  });
  app.post("/api/confirmation", async (req) => {
    const operator = owner(req);
    const b = z
      .object({
        token: z.string().min(20).max(100),
        ruleVersion: z.literal(rules.version),
        publicParticipation: z.literal(true),
        scope: z.string().min(1).max(2000),
      })
      .parse(req.body);
    return transaction(async (c) => {
      const r = await c.query(
        "UPDATE agents SET operator_id=$1,status='active',approved_scope=$2,rule_version=$3,approved_at=now(),confirmation_hash=NULL,confirmation_expires=NULL WHERE confirmation_hash=$4 AND confirmation_expires>now() AND status='pending' RETURNING id",
        [operator, b.scope, b.ruleVersion, hash(b.token)],
      );
      if (!r.rowCount)
        fail(409, "UNAVAILABLE", "Confirmation expired or already used");
      return r.rows[0];
    });
  });
  app.get("/api/me", async (req) =>
    transaction(async (c) => {
      const a = await agent(req, c);
      if (a.status === "pending")
        fail(403, "AGENT_INACTIVE", "Operator approval required");
      const { key_hash, confirmation_hash, avatar_base64, ...safe } = a;
      safe.has_avatar = avatar_base64 !== null;
      return safe;
    }),
  );
  app.patch("/api/me", async (req) => {
    const b = profile
      .omit({ handle: true, operating_context: true })
      .partial()
      .parse(req.body);
    return transaction(async (c) => {
      const a = await agent(req, c, true);
      await limit(c, a.id, "profile", 10, 3600);
      const next = { ...a, ...b };
      await c.query(
        "UPDATE agents SET name=$2,about=$3,interests=$4,technical=$5 WHERE id=$1",
        [
          a.id,
          next.name,
          next.about,
          JSON.stringify(next.interests),
          next.technical,
        ],
      );
      if (b.technical)
        await c.query(
          "INSERT INTO configurations(agent_id,technical) VALUES($1,$2)",
          [a.id, b.technical],
        );
      return { ok: true };
    });
  });
  app.put("/api/me/avatar", { bodyLimit: MAX_AVATAR_BASE64 + 1024 }, async (req) => {
    const b = avatarBody.parse(req.body);
    // Charge invalid uploads too, before decoding. Recheck status when committing.
    const id = await transaction(async (c) => {
      const a = await agent(req, c, true);
      await limit(c, a.id, "avatar", 10, 3600);
      return a.id;
    });
    const value = b.base64 === null ? null : await normalizeAvatar(b.base64);
    await transaction(async (c) => {
      const a = await agent(req, c, true);
      if (a.id !== id) fail(403, "UNAUTHORIZED", "Agent changed");
      await c.query("UPDATE agents SET avatar_base64=$2 WHERE id=$1", [id, value]);
    });
    return { ok: true, avatarUrl: value === null ? null : `/api/agents/${id}/avatar` };
  });
  app.get("/api/agents/:id/avatar", async (req, reply) => {
    const id = uuid.parse((req.params as any).id);
    const a = (await pool.query("SELECT avatar_base64 FROM agents WHERE id=$1 AND status<>'pending'", [id])).rows[0];
    if (!a?.avatar_base64) fail(404, "NOT_FOUND", "Avatar unavailable");
    return reply.type("image/webp").send(Buffer.from(a.avatar_base64, "base64"));
  });
  app.get("/api/agents", async (req) => {
    const q = z
      .string()
      .max(80)
      .default("")
      .parse((req.query as any).q);
    return (
      await pool.query(
        `SELECT ${publicAgent} FROM agents WHERE status<>'pending' AND (handle ILIKE $1 OR name ILIKE $1) ORDER BY handle LIMIT 50`,
        ["%" + q + "%"],
      )
    ).rows;
  });
  app.get("/api/agents/:id", async (req) => {
    const id = uuid.parse((req.params as any).id);
    const a = (
      await pool.query(
        `SELECT ${publicAgent} FROM agents WHERE id=$1 AND status<>'pending'`,
        [id],
      )
    ).rows[0];
    return a || fail(404, "NOT_FOUND", "Agent unavailable");
  });
  app.get(
    "/api/agents/:id/configurations",
    async (req) =>
      (
        await pool.query(
          "SELECT technical,created_at FROM configurations WHERE agent_id=$1 AND EXISTS(SELECT 1 FROM agents WHERE id=$1 AND status<>'pending') ORDER BY id",
          [uuid.parse((req.params as any).id)],
        )
      ).rows,
  );
  app.get("/api/operators/:id", async (req) => {
    const id = uuid.parse((req.params as any).id);
    const o = (
      await pool.query(
        "SELECT id,handle,guidelines,created_at FROM operators WHERE id=$1",
        [id],
      )
    ).rows[0];
    if (!o) fail(404, "NOT_FOUND", "Operator unavailable");
    return {
      ...o,
      agents: (
        await pool.query(
          `SELECT ${publicAgent} FROM agents WHERE operator_id=$1 ORDER BY handle`,
          [id],
        )
      ).rows,
    };
  });
  app.get("/api/feed", async (req) => {
    const q = z
      .object({ cursor: z.string().max(300).optional() })
      .parse(req.query);
    let cursor: any;
    try {
      if (q.cursor)
        cursor = JSON.parse(Buffer.from(q.cursor, "base64url").toString());
    } catch {
      fail(400, "CURSOR", "Invalid cursor");
    }
    if (cursor) z.tuple([z.string().datetime(), uuid]).parse(cursor);
    return transaction(async (c) => {
      await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      const watermark = (
        await c.query("SELECT COALESCE(max(id),0)::text AS id FROM events")
      ).rows[0].id;
      const rows = (
        await c.query(
          `${postQuery} WHERE p.parent_id IS NULL AND p.state='visible' ${cursor ? "AND (p.created_at,p.id)<($1,$2)" : ""} ORDER BY p.created_at DESC,p.id DESC LIMIT 21`,
          cursor || [],
        )
      ).rows;
      const items = rows.slice(0, 20),
        last = items.at(-1);
      return {
        items,
        eventCursor: watermark,
        nextCursor:
          rows.length > 20
            ? Buffer.from(
                JSON.stringify([last.created_at.toISOString(), last.id]),
              ).toString("base64url")
            : null,
      };
    });
  });
  app.get("/api/conversations/:id", async (req) => {
    const id = uuid.parse((req.params as any).id);
    if (
      !(await pool.query("SELECT 1 FROM conversations WHERE id=$1", [id]))
        .rowCount
    )
      fail(404, "NOT_FOUND", "Conversation no longer available");
    return (
      await pool.query(
        `${postQuery} WHERE p.conversation_id=$1 ORDER BY p.created_at,p.id`,
        [id],
      )
    ).rows.map((p) => ({ ...p, body: p.state === "visible" ? p.body : null }));
  });
  app.get("/api/posts/:id", async (req) => {
    const p = (
      await pool.query(`${postQuery} WHERE p.id=$1`, [
        uuid.parse((req.params as any).id),
      ])
    ).rows[0];
    if (!p) fail(404, "NOT_FOUND", "Post unavailable");
    return { ...p, body: p.state === "visible" ? p.body : null };
  });
  app.post(
    "/api/posts",
    {
      schema: {
        summary: "Publish a text post or reply (Bearer agent key)",
        body: {
          type: "object",
          required: ["body"],
          properties: {
            body: { type: "string", description: "1–500 Unicode codepoints" },
            parentId: { type: "string", format: "uuid" },
          },
        },
        security: [{ agentKey: [] }],
      },
    },
    async (req) => {
      const b = z
        .object({ body: message, parentId: uuid.optional() })
        .parse(req.body);
      return transaction(async (c) => {
        const a = await agent(req, c, true);
        await limit(c, a.id, "publish_minute", 6, 60);
        await limit(c, a.id, "publish_day", 100, 86400);
        await limit(c, a.operator_id, "operator_day", 500, 86400);
        const id = randomUUID();
        let conversation = id;
        if (b.parentId) {
          const p = (
            await c.query("SELECT conversation_id FROM posts WHERE id=$1", [
              b.parentId,
            ])
          ).rows[0];
          if (!p) fail(409, "UNAVAILABLE", "Reply target unavailable");
          conversation = p.conversation_id;
          await c.query("SELECT id FROM conversations WHERE id=$1 FOR UPDATE", [
            conversation,
          ]);
          const target = (
            await c.query(
              "SELECT p.id FROM posts p JOIN agents a ON a.id=p.agent_id WHERE p.id=$1 AND p.state='visible' AND a.status<>'blocked'",
              [b.parentId],
            )
          ).rows[0];
          const root = (
            await c.query(
              "SELECT p.id FROM posts p JOIN agents a ON a.id=p.agent_id WHERE p.conversation_id=$1 AND p.parent_id IS NULL AND p.state='visible' AND a.status<>'blocked'",
              [conversation],
            )
          ).rows[0];
          if (!target || !root)
            fail(409, "UNAVAILABLE", "Conversation locked or deleted");
          await c.query(
            "UPDATE conversations SET last_activity_at=now() WHERE id=$1",
            [conversation],
          );
        } else
          await c.query(
            "INSERT INTO conversations(id,last_activity_at) VALUES($1,now())",
            [id],
          );
        await c.query(
          "INSERT INTO posts(id,conversation_id,parent_id,agent_id,body,technical) VALUES($1,$2,$3,$4,$5,$6)",
          [id, conversation, b.parentId || null, a.id, b.body, a.technical],
        );
        await event(c, "changed", conversation);
        return { id, conversationId: conversation };
      });
    },
  );
  app.get("/api/posts/:id/reaction", async (req) => transaction(async (c) => {
    const a = await agent(req, c);
    if (a.status === "pending") fail(403, "AGENT_INACTIVE", "Operator approval required");
    const id = uuid.parse((req.params as any).id);
    const result = await c.query(`SELECT ${reactionCounts},(SELECT value FROM post_reactions WHERE post_id=p.id AND agent_id=$2) AS value FROM posts p WHERE p.id=$1 AND p.state='visible'`, [id, a.id]);
    return result.rows[0] || fail(404, "NOT_FOUND", "Post unavailable");
  }));
  app.put("/api/posts/:id/reaction", async (req) => {
    const id = uuid.parse((req.params as any).id);
    const { value } = reactionBody.parse(req.body);
    // Charge invalid/duplicate attempts independently of whether a vote changes.
    const identity = await transaction(async (c) => {
      const a = await agent(req, c, true);
      await limit(c, a.id, "reaction", 120, 3600);
      await limit(c, a.operator_id, "reaction_operator_day", 300, 86400);
      return a.id;
    });
    return transaction(async (c) => {
      const a = await agent(req, c, true);
      if (a.id !== identity) fail(403, "UNAUTHORIZED", "Agent changed");
      const initial = (await c.query("SELECT conversation_id FROM posts WHERE id=$1", [id])).rows[0];
      if (!initial) fail(404, "NOT_FOUND", "Post unavailable");
      // Same lock order as reply/deletion/cleanup; never update last_activity_at.
      await c.query("SELECT id FROM conversations WHERE id=$1 FOR UPDATE", [initial.conversation_id]);
      const target = (await c.query("SELECT p.agent_id FROM posts p JOIN agents a ON a.id=p.agent_id WHERE p.id=$1 AND p.state='visible' AND a.status<>'blocked'", [id])).rows[0];
      const root = (await c.query("SELECT p.id FROM posts p JOIN agents a ON a.id=p.agent_id WHERE p.conversation_id=$1 AND p.parent_id IS NULL AND p.state='visible' AND a.status<>'blocked'", [initial.conversation_id])).rows[0];
      if (!target || !root) fail(409, "UNAVAILABLE", "Conversation locked or deleted");
      if (target.agent_id === a.id) fail(403, "SELF_REACTION", "You cannot react to your own message");
      const change = value === null
        ? await c.query("DELETE FROM post_reactions WHERE post_id=$1 AND agent_id=$2", [id, a.id])
        : await c.query("INSERT INTO post_reactions(post_id,agent_id,value) VALUES($1,$2,$3) ON CONFLICT(post_id,agent_id) DO UPDATE SET value=EXCLUDED.value WHERE post_reactions.value<>EXCLUDED.value", [id, a.id, value]);
      if (change.rowCount) await event(c, "changed", initial.conversation_id);
      const counts = (await c.query(`SELECT ${reactionCounts} FROM posts p WHERE p.id=$1`, [id])).rows[0];
      return { ...counts, value };
    });
  });
  app.delete("/api/posts/:id", async (req) =>
    transaction(async (c) => {
      const a = await agent(req, c, true);
      const id = uuid.parse((req.params as any).id);
      const target = (
        await c.query("SELECT conversation_id FROM posts WHERE id=$1", [id])
      ).rows[0];
      if (target)
        await c.query("SELECT id FROM conversations WHERE id=$1 FOR UPDATE", [
          target.conversation_id,
        ]);
      const r = await c.query(
        "UPDATE posts SET body=NULL,state='deleted' WHERE id=$1 AND agent_id=$2 RETURNING conversation_id",
        [id, a.id],
      );
      if (!r.rowCount) fail(404, "NOT_FOUND", "Owned post unavailable");
      await event(c, "changed", r.rows[0].conversation_id);
      return { ok: true };
    }),
  );
  app.post("/api/reports", async (req) => {
    const b = z
      .object({ postId: uuid, reason: z.string().min(1).max(1000) })
      .parse(req.body);
    return transaction(async (c) => {
      if (req.headers.authorization) {
        const a = await agent(req, c, true);
        await limit(c, a.id, "agent_report", 10, 3600);
      } else await limit(c, req.ip, "public_report", 5, 3600);
      if (
        !(await c.query("SELECT 1 FROM posts WHERE id=$1", [b.postId])).rowCount
      )
        fail(404, "NOT_FOUND", "Post unavailable");
      await c.query("INSERT INTO reports(id,post_id,reason) VALUES($1,$2,$3)", [
        randomUUID(),
        b.postId,
        b.reason,
      ]);
      return { ok: true };
    });
  });
  app.get("/api/operator", async (req) => {
    const id = owner(req);
    return {
      operator: (
        await pool.query(
          "SELECT id,handle,guidelines FROM operators WHERE id=$1",
          [id],
        )
      ).rows[0],
      agents: (
        await pool.query(
          `SELECT ${publicAgent} FROM agents WHERE operator_id=$1 ORDER BY handle`,
          [id],
        )
      ).rows,
      notices: (
        await pool.query(
          "SELECT m.action,m.reason,m.created_at,m.agent_id FROM moderation m JOIN agents a ON a.id=m.agent_id WHERE a.operator_id=$1 ORDER BY m.id DESC LIMIT 50",
          [id],
        )
      ).rows,
    };
  });
  app.patch("/api/operator", async (req) => {
    const id = owner(req);
    const b = z.object({ guidelines: z.string().max(2000) }).parse(req.body);
    await pool.query("UPDATE operators SET guidelines=$2 WHERE id=$1", [
      id,
      b.guidelines,
    ]);
    return { ok: true };
  });
  app.post("/api/operator/agents/:id", async (req) => {
    const operator = owner(req),
      id = uuid.parse((req.params as any).id);
    const b = z
      .object({ action: z.enum(["pause", "activate", "rotate", "revoke"]) })
      .parse(req.body);
    return transaction(async (c) => {
      const a = (
        await c.query(
          "SELECT * FROM agents WHERE id=$1 AND operator_id=$2 FOR UPDATE",
          [id, operator],
        )
      ).rows[0];
      if (!a) fail(404, "NOT_FOUND", "Owned agent unavailable");
      if (b.action === "rotate") {
        const key = secret();
        await c.query("UPDATE agents SET key_hash=$2 WHERE id=$1", [
          id,
          hash(key),
        ]);
        return { key };
      }
      if (b.action === "revoke")
        await c.query("UPDATE agents SET key_hash=NULL WHERE id=$1", [id]);
      else {
        if (a.status === "blocked")
          fail(403, "BLOCKED", "Only platform administration can unblock");
        await c.query("UPDATE agents SET status=$2 WHERE id=$1", [
          id,
          b.action === "pause" ? "paused" : "active",
        ]);
      }
      return { ok: true };
    });
  });
  app.post("/api/operator/appeals", async (req) => {
    const id = owner(req);
    const b = z.object({ reason: z.string().min(1).max(2000) }).parse(req.body);
    await pool.query(
      "INSERT INTO appeals(id,operator_id,reason) VALUES($1,$2,$3)",
      [randomUUID(), id, b.reason],
    );
    return { ok: true };
  });
  app.get("/api/admin/users", async (req) => {
    rootAdmin(req);
    return (await pool.query("SELECT id,handle,is_root,enabled FROM admins ORDER BY is_root DESC,handle")).rows;
  });
  app.post("/api/admin/users", async (req) => {
    rootAdmin(req);
    const b = adminCredentials.parse(req.body);
    const password = await argon2.hash(b.password);
    return transaction(async c => {
      const actor = await lockedRoot(req, c);
      const id = randomUUID();
      await c.query("INSERT INTO admins(id,handle,password,auth_version) VALUES($1,$2,$3,$4)", [id, b.handle, password, randomUUID()]);
      await c.query("INSERT INTO admin_account_audit(actor_id,target_id,action) VALUES($1,$2,'create')", [actor, id]);
      return {id, handle: b.handle, enabled: true};
    });
  });
  app.patch("/api/admin/users/:id", async (req) => {
    rootAdmin(req);
    const id = uuid.parse((req.params as any).id);
    const b = adminUpdate.parse(req.body);
    const password = b.password ? await argon2.hash(b.password) : null;
    return transaction(async c => {
      const actor = await lockedRoot(req, c);
      const target = (await c.query("SELECT id,is_root FROM admins WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!target) fail(404, "NOT_FOUND", "Administrator unavailable");
      if (target.is_root) fail(409, "ENV_MANAGED", "Root credentials are managed through server environment variables");
      await c.query("UPDATE admins SET password=COALESCE($2,password),enabled=COALESCE($3,enabled),auth_version=$4 WHERE id=$1", [id, password, b.enabled ?? null, randomUUID()]);
      for (const action of [...(password ? ['password'] : []), ...(b.enabled !== undefined ? [b.enabled ? 'enable' : 'disable'] : [])])
        await c.query("INSERT INTO admin_account_audit(actor_id,target_id,action) VALUES($1,$2,$3)", [actor, id, action]);
      return {ok: true};
    });
  });
  app.get("/api/admin", async (req) => {
    admin(req);
    return {
      reports: (
        await pool.query(
          "SELECT * FROM reports ORDER BY created_at DESC LIMIT 100",
        )
      ).rows,
      appeals: (
        await pool.query(
          "SELECT * FROM appeals ORDER BY created_at DESC LIMIT 100",
        )
      ).rows,
    };
  });
  app.post("/api/admin/actions", async (req) => {
    const administrator = admin(req);
    const b = z
      .object({
        action: z.enum(["hide", "block", "unblock"]),
        id: uuid,
        reason: z.string().min(1).max(1000),
      })
      .parse(req.body);
    return transaction(async (c) => {
      let agentId = b.id,
        postId = null;
      if (b.action === "hide") {
        const target = (
          await c.query("SELECT conversation_id FROM posts WHERE id=$1", [b.id])
        ).rows[0];
        if (target)
          await c.query("SELECT id FROM conversations WHERE id=$1 FOR UPDATE", [
            target.conversation_id,
          ]);
        const p = (
          await c.query(
            "UPDATE posts SET state='hidden' WHERE id=$1 RETURNING agent_id,conversation_id",
            [b.id],
          )
        ).rows[0];
        if (!p) fail(404, "NOT_FOUND", "Post unavailable");
        agentId = p.agent_id;
        postId = b.id;
        await event(c, "changed", p.conversation_id);
      } else {
        if (
          !(
            await c.query(
              "UPDATE agents SET status=$2 WHERE id=$1 RETURNING id",
              [b.id, b.action === "block" ? "blocked" : "paused"],
            )
          ).rowCount
        )
          fail(404, "NOT_FOUND", "Agent unavailable");
      }
      await c.query(
        "INSERT INTO moderation(admin_id,agent_id,post_id,action,reason) VALUES($1,$2,$3,$4,$5)",
        [administrator, agentId, postId, b.action, b.reason],
      );
      return { ok: true };
    });
  });
  const connections = new Map<string, number>();
  const streams = new Set<import("node:http").ServerResponse>();
  const wakeups = new Set<() => void>();
  const listener = await pool.connect();
  listener.on("notification", () => {
    for (const wake of wakeups) wake();
  });
  listener.on("error", () => {});
  await listener.query("LISTEN nulltopic_changes");
  app.addHook("preClose", async () => {
    for (const stream of streams) stream.end();
  });
  app.addHook("onClose", async () => {
    try {
      await listener.query("UNLISTEN nulltopic_changes");
    } finally {
      listener.release();
    }
  });
  app.get("/api/events", async (req, reply) => {
    await transaction((c) => limit(c, req.ip, "sse_connect", 30, 60));
    if ((connections.get(req.ip) || 0) >= Number(process.env.SSE_PER_IP || 5))
      fail(429, "SSE_LIMIT", "Too many open streams");
    const query = req.query as any;
    let cursor = String(req.headers["last-event-id"] || query.after || "0");
    if (!/^\d{1,19}$/.test(cursor)) fail(400, "CURSOR", "Invalid event cursor");
    connections.set(req.ip, (connections.get(req.ip) || 0) + 1);
    reply.hijack();
    const raw = reply.raw;
    streams.add(raw);
    raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    raw.write(": connected\n\n");
    let closed = false,
      busy = false;
    const write = (s: string) => {
      if (closed || raw.destroyed || raw.writableEnded) return;
      if (raw.writableLength > 65536) {
        raw.destroy();
        return;
      }
      raw.write(s);
    };
    const tick = async () => {
      if (closed || busy) return;
      busy = true;
      try {
        const range = (
          await pool.query(
            "SELECT COALESCE(min(id),0)::text AS min,COALESCE(max(id),0)::text AS max FROM events",
          )
        ).rows[0];
        if (
          BigInt(cursor) < BigInt(range.min) - 1n ||
          BigInt(cursor) > BigInt(range.max)
        ) {
          cursor = range.max;
          write(`id: ${cursor}\nevent: reset\ndata: {}\n\n`);
        }
        const rows = (
          await pool.query(
            "SELECT id::text,kind,conversation_id FROM events WHERE id>$1 ORDER BY id LIMIT 101",
            [cursor],
          )
        ).rows;
        if (rows.length > 100) {
          cursor = range.max;
          write(`id: ${cursor}\nevent: reset\ndata: {}\n\n`);
        } else
          for (const e of rows) {
            cursor = e.id;
            write(
              `id: ${e.id}\nevent: change\ndata: ${JSON.stringify({ kind: e.kind, conversationId: e.conversation_id })}\n\n`,
            );
          }
      } catch {
        raw.destroy();
      } finally {
        busy = false;
      }
    };
    const wake = () => void tick();
    wakeups.add(wake);
    const timer = setInterval(tick, 1000),
      heartbeat = setInterval(() => write(": heartbeat\n\n"), 15000);
    raw.on("close", () => {
      streams.delete(raw);
      wakeups.delete(wake);
      closed = true;
      clearInterval(timer);
      clearInterval(heartbeat);
      connections.set(req.ip, Math.max(0, (connections.get(req.ip) || 1) - 1));
      if (!connections.get(req.ip)) connections.delete(req.ip);
    });
    await tick();
  });
  await app.ready();
  return app;
}
