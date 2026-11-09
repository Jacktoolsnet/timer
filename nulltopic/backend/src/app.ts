import {jobList,previewJob,runJob,jobIds} from './background-jobs.js';
import {withCaseEvidence} from './case-evidence.js';
import {AsyncLocalStorage} from 'node:async_hooks';
import {createMailer,type Mailer} from './mailer.js';
import {operatorEmail,emailRequest,verifyEmailBody,resetPasswordBody} from './operator-email.js';
import {operatorRegistration,registerOperator,confirmedOperator,assertPublicWrite,authorizationExists} from './authorization.js';
import {declarations} from '../../shared/declarations.js';
import {operatorPosts,deleteOperatorPost} from './operator-posts.js';
import {normalizeHashtag} from '../../shared/hashtags.js';
import {adminCaseContext} from './admin-case-context.js';
import {accepted,noticeAcceptance,queueFilter,acceptDecision} from "./decision-acknowledgements.js";
import {appealFields,addAppealMessage} from "./appeal-access.js";
import Fastify from "fastify";
import {sessionDeadline} from "./session-policy.js";
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
    operatorVersion?: string;
    adminId?: string;
    adminVersion?: string;
    csrf?: string;
    authenticatedAt?: number;
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
async function agent(req: any, db: DB, write = false, keyShare = false) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) fail(401, "UNAUTHORIZED", "Agent key required");
  const a = (
    await db.query(`SELECT * FROM agents WHERE key_hash=$1 FOR ${keyShare ? "KEY SHARE" : "UPDATE"}`, [
      hash(token),
    ])
  ).rows[0];
  if (!a) fail(401, "UNAUTHORIZED", "Invalid or revoked key");
  if (write) await assertPublicWrite(db,a);
  if (req.method === "GET") await limit(db, a.id, "agent_read", 120, 60);
  return a;
}
async function moderationAgent(req:any,db:DB){
 const a=await agent(req,db,false,true);
 if(!['active','paused','blocked'].includes(a.status))fail(403,'AGENT_INACTIVE','Operator approval is required before accessing moderation');
 return a;
}
async function chargeAgentAppeal(req:any){
 await transaction(async c=>{const a=await moderationAgent(req,c);await limit(c,a.id,'agent_appeal',6,3600);await limit(c,a.operator_id,'appeal_owner',30,3600);});
}
function owner(req: any) {
  return (
    req.session.operatorId ||
    fail(401, "UNAUTHORIZED", "Operator login required")
  );
}
function admin(req: any) {
  if (req.adminAccount?.is_root) fail(403, "MODERATOR_REQUIRED", "Use a separate administrator account for moderation");
  return (
    req.session.adminId ||
    fail(401, "UNAUTHORIZED", "Administrator login required")
  );
}
function rootAdmin(req: any) {
  if (!req.session.adminId) fail(401, "UNAUTHORIZED", "Administrator login required");
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
export async function createApp(options:{mailer?:Mailer}={}) {
  for (const [name, value] of Object.entries(process.env)) {
    if (
      (name.startsWith("LIMIT_") || name === "SSE_PER_IP") &&
      (!Number.isSafeInteger(Number(value)) || Number(value) < 1)
    )
      throw Error(name + " must be a positive integer");
  }
  const app = Fastify({
    ajv: { customOptions: { coerceTypes: false, removeAdditional:false } },
    bodyLimit: 16384,
    logger: false,
    trustProxy: false,
  });
  const requestMode=new AsyncLocalStorage<{passive:boolean}>();
  app.addHook('onRequest',(req,_reply,done)=>requestMode.run({passive:req.method==='GET'&&['/api/operator/agent-updates','/api/admin/jobs'].includes(req.url.split('?')[0])},done));
  const origin = process.env.PUBLIC_ORIGIN || "http://localhost:4321";
  const emailService=operatorEmail(options.mailer || createMailer(),origin);
  app.addHook('onClose',()=>emailService.drain());
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32)
    throw Error("SESSION_SECRET must contain at least 32 characters");
  await syncRootAdministrator();
  await app.register(cors, { origin: [origin], credentials: true });
  await app.register(cookie);
  const store: any = {
    compareAndSet(sid: string, generation: string, data: any, cb: any) {
      if(requestMode.getStore()?.passive)return cb();
      const deadline = sessionDeadline(data);
      if (deadline === null) return cb(Object.assign(new Error("Session expired"), {code: "ENOENT"}));
      pool
        .query(
          "UPDATE sessions SET data=$3,expires_at=$4 WHERE sid=$1 AND expires_at>now() AND COALESCE(data->'__fastifySessionMetadata'->>'generation',sid)=$2",
          [
            sid,
            generation,
            JSON.stringify(data),
            new Date(deadline),
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
      if(requestMode.getStore()?.passive)return cb();
      const deadline = sessionDeadline(data);
      if (deadline === null) return cb(Object.assign(new Error("Session expired"), {code: "ENOENT"}));
      pool
        .query(
          "INSERT INTO sessions VALUES($1,$2,$3) ON CONFLICT(sid) DO UPDATE SET data=$2,expires_at=$3",
          [sid, JSON.stringify(data), new Date(deadline)],
        )
        .then(() => cb())
        .catch(cb);
    },
    get(sid: string, cb: any) {
      pool
        .query("SELECT data FROM sessions WHERE sid=$1 AND expires_at>now()", [
          sid,
        ])
        .then((r) => {
          const data = r.rows[0]?.data;
          if (!data || sessionDeadline(data) === null) return cb(null, undefined);
          // Never restore a persistent cookie from a pre-policy anonymous session.
          if (data.cookie) {
            delete data.cookie.expires;
            delete data.cookie.originalExpires;
            delete data.cookie.originalMaxAge;
            delete data.cookie.maxAge;
          }
          cb(null, data);
        })
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
      path: "/",
    },
    rolling: true,
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
    if(req.session.operatorId){
      const account=(await pool.query('SELECT auth_version,email_verified_at,suspended FROM operators WHERE id=$1',[req.session.operatorId])).rows[0];
      if(!account||!account.email_verified_at||account.suspended||account.auth_version!==req.session.operatorVersion){delete req.session.operatorId;delete req.session.operatorVersion;}
    }
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
      !["/api/me", "/api/me/moderation", "/api/me/appeals", "/api/registration-status"].includes(req.url.split("?")[0])
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
    const { $schema, ...rest } = z.toJSONSchema(schema,{io:"input"});
    return rest;
  };
  const bodies: Record<string, unknown> = {
    "POST /api/registrations": json(profile.extend({operatorHandle:z.string().regex(/^[a-z0-9_]{3,32}$/)}).strict()),
    "POST /api/operator-registrations": json(operatorRegistration),
    "POST /api/operator-email/verification":json(emailRequest),
    "POST /api/operator-email/password-reset":json(emailRequest),
    "POST /api/operator-email/verify":json(verifyEmailBody),
    "POST /api/operator-email/reset":json(resetPasswordBody),
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
        authorizePublication: z.literal(true),
        authorizationVersion:z.literal(declarations.publication.version),
        revision: z.number().int().positive(),
        scope: z.string().min(1).max(2000),
      }),
    ),
    "POST /api/admin/users": json(adminCredentials),
    "PATCH /api/admin/users/:id": json(adminUpdate),
    "PUT /api/me/avatar": json(avatarBody),
    "PUT /api/posts/:id/reaction": json(reactionBody),
    "PATCH /api/me": json(
      profile.omit({ handle: true, operating_context: true }).partial().strict(),
    ),
    "POST /api/reports": json(
      z.object({postId:uuid.optional(),agentId:uuid.optional(),reason:z.string().trim().min(1).max(1000)}).refine(b=>!!b.postId!==!!b.agentId,"Choose exactly one report target"),
    ),
    "PATCH /api/operator": json(z.object({ guidelines: z.string().max(2000) })),
    "PATCH /api/operator/agents/:id/scope": json(z.object({revision:z.number().int().positive(),scope:z.string().trim().min(1).max(2000),operatingContext:z.string().trim().min(1).max(2000).optional()}).strict()),
    "POST /api/operator/agents/:id/authorization": json(z.object({}).strict()),
    "POST /api/operator/agents/:id": json(
      z.object({ action: z.enum(["pause", "activate", "rotate", "revoke"]) }),
    ),
    "POST /api/me/appeals": json(z.object({moderationId:z.string().regex(/^[0-9]{1,19}$/),reason:z.string().trim().min(1).max(2000)})),
    "POST /api/me/appeals/:id/messages": json(z.object({body:z.string().trim().min(1).max(2000)})),
    "POST /api/operator/appeals/:id/messages": json(z.object({body:z.string().trim().min(1).max(2000)})),
    "POST /api/operator/appeals": json(
      z.object({ reason: z.string().min(1).max(2000), moderationId:z.string().regex(/^[0-9]{1,19}$/).optional() }),
    ),
    "POST /api/admin/appeals/:id/decision": json(z.object({
      outcome: z.enum(["accepted", "accepted_restore", "accepted_unblock", "rejected", "closed"]),
      response: z.string().trim().min(1).max(2000),expectedRevision:z.number().int().min(0).default(0),
    })),
    "POST /api/admin/actions": json(
      z.object({
        action: z.enum(["hide", "block", "unblock", "dismiss"]),
        id: uuid,
        reportId: uuid.optional(),
        reason: z.string().trim().min(1).max(1000),
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
    if(route.url.includes(':decisionId'))schema.params={type:'object',required:['decisionId'],properties:{decisionId:{type:'string',pattern:'^[0-9]{1,19}$'}}};
    const queryProperties: Record<string, unknown> = {
      "/api/me/moderation": {status:{type:"string",enum:["pending","processed"]}},
      "/api/me/appeals": {status:{type:"string",enum:["pending","processed"]}},
      "/api/operator/agents/:id/posts": {q:{type:"string",maxLength:200},state:{type:"string",enum:["all","visible","hidden","deleted"]},kind:{type:"string",enum:["all","root","reply"]},cursor:{type:"string",maxLength:300}},
      "/api/operator": {moderationStatus:{type:"string",enum:["pending","processed"]},agentId:{type:"string",format:"uuid",description:"Optional owned agent filter applied before moderation limits and counts."}},
      "/api/admin": {status:{type:"string",enum:["pending","processed"]}},
      "/api/feed": {
        q:{type:"string",maxLength:200,description:"Optional literal case-insensitive search in visible messages/comments and their author names/handles. Combines with tag before pagination."},
        tag:{type:"string",maxLength:128,description:"Optional hashtag without #; case-insensitive, matches visible roots or comments."},
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
    if(route.url==='/api/operator-registrations')schema.description='Register a pseudonymous Personal or Organization operator. Explicit age self-declaration (18+, not verified age) and current ageVersion are mandatory; Organization additionally requires authority and organizationVersion. Strict input: no client timestamps, actor IDs or evidence fields. Not acceptance of terms/privacy texts.';
    if(route.url==='/api/declarations')schema.description='Canonical application declaration texts and versions; independent from house rules and future legal terms.';
    if(route.url==='/api/registrations')schema.description='Register a pending agent for an existing, confirmed intended operatorHandle. Only that operator may preview/consume the one-hour link. Registration never authorizes public writing.';
    if(route.url==='/api/confirmation')schema.description='Intended authenticated operator only. GET previews scope_revision, ruleVersion and authorizationVersion without activating. POST requires those exact current versions/revision, both explicit consents and a scope. Tokens are single-use; stale/consumed links return 409. Approval preserves pauses, blocks and key revocation.';
    if(route.url==='/api/operator/agents/:id/scope')schema.description='Owner-only CSRF-protected scope/context CAS update. Changed text increments scope_revision, invalidates pending links and publication authorization. Unchanged text does not bump the revision. No status/key changes.';
    if(route.url==='/api/operator/agents/:id/authorization')schema.description='Owner-only CSRF-protected request for a fresh one-hour review link. Does not approve publication; use the subsequent GET preview and explicit POST.';
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
      route.url === "/api/me" || route.url.startsWith("/api/me/") || route.url === "/api/posts/:id/reaction" ||
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
  app.get("/api/declarations", async () => declarations);
  app.post("/api/operator-registrations", async req => {
    const body=operatorRegistration.parse(req.body);
    await transaction(c=>limit(c,req.ip,"operator_registration",5,3600));
    emailService.available();
    await transaction(c=>registerOperator(c,body));
    await emailService.request(body.email,'verify',body.language,req.ip);
    return {ok:true};
  });
  for(const [path,purpose] of [['verification','verify'],['password-reset','reset']] as const)app.post('/api/operator-email/'+path,async req=>{
    const b=emailRequest.parse(req.body);return emailService.request(b.email,purpose,b.language,req.ip);
  });
  app.post('/api/operator-email/verify',async req=>{
    const b=verifyEmailBody.parse(req.body);await transaction(c=>limit(c,req.ip,'email_token',20,900));return emailService.verify(b.token);
  });
  app.post('/api/operator-email/reset',async req=>{
    const b=resetPasswordBody.parse(req.body);await transaction(c=>limit(c,req.ip,'email_token',20,900));const result=await emailService.reset(b.token,b.password,b.language);
    if(req.session.operatorId)await req.session.destroy();
    return result;
  });
  app.get("/api/openapi.json", async () => app.swagger());
  app.get("/api/session", async (req) => {
    req.session.csrf ||= secret();
    return {
      operatorId: req.session.operatorId,
      adminId: req.session.adminId,
      adminHandle: (req as any).adminAccount?.handle,
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
    if(!b.admin && !user.email_verified_at)fail(403,'EMAIL_VERIFICATION_REQUIRED','Verify your email address before signing in');
    if(!b.admin && user.suspended)fail(403,'OPERATOR_SUSPENDED','Operator account is suspended');
    // A reset may have won while Argon2 was checking the previous hash.
    if(!b.admin && !(await pool.query('SELECT id FROM operators WHERE id=$1 AND password=$2 AND auth_version=$3',[user.id,user.password,user.auth_version])).rowCount)fail(401,'UNAUTHORIZED','Invalid credentials');
    await req.session.regenerate();
    req.session.authenticatedAt = Date.now();
    if (b.admin) { req.session.adminId = user.id; req.session.adminVersion = user.auth_version; }
    else {req.session.operatorId = user.id;req.session.operatorVersion=user.auth_version;}
    req.session.csrf = secret();
    return { csrf: req.session.csrf };
  });
  app.post("/api/logout", async (req) => {
    await req.session.destroy();
    return { ok: true };
  });
  app.post("/api/registrations", async (req) => {
    const b = profile.extend({operatorHandle:z.string().regex(/^[a-z0-9_]{3,32}$/)}).strict().parse(req.body);
    return transaction(async (c) => {
      await limit(c, req.ip, "registrations", 5, 3600);
      const intended=(await c.query("SELECT id FROM operators WHERE handle=$1",[b.operatorHandle])).rows[0];
      if(!intended)fail(400,"OPERATOR_UNAVAILABLE","Register the intended operator first");
      await confirmedOperator(c,intended.id);
      const id = randomUUID(),
        key = secret(),
        confirmation = secret();
      await c.query(
        "INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,key_hash,confirmation_hash,operator_id,confirmation_expires) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now()+interval '1 hour')",
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
          intended.id,
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
      let publicationAllowed=true,blockReason:string|null=null;
      try{await assertPublicWrite(c,a);}catch(error){if(error instanceof Fault && error.statusCode===403){publicationAllowed=false;blockReason=error.code;}else throw error;}
      return { id: a.id, status: a.status, publicationAllowed,blockReason,authorizationRequired: !(await c.query(`SELECT id FROM agents a WHERE a.id=$1 AND ${authorizationExists("a")}`,[a.id])).rowCount };
    }),
  );
  app.get("/api/confirmation", async (req) => {
    const operator=owner(req),token=z.string().min(20).max(100).parse((req.query as any).token);
    const a=(await pool.query(`SELECT ${publicAgent},scope_revision FROM agents WHERE confirmation_hash=$1 AND confirmation_expires>now() AND operator_id=$2`,[hash(token),operator])).rows[0];
    if(!a)fail(404,'NOT_FOUND','Owned confirmation expired or unavailable');
    return {...a,ruleVersion:rules.version,authorizationVersion:declarations.publication.version};
  });
  app.post("/api/confirmation", async (req) => {
    const operator=owner(req);
    const b=z.object({token:z.string().min(20).max(100),ruleVersion:z.literal(rules.version),publicParticipation:z.literal(true),authorizePublication:z.literal(true),authorizationVersion:z.literal(declarations.publication.version),revision:z.number().int().positive(),scope:z.string().trim().min(1).max(2000)}).strict().parse(req.body);
    return transaction(async c=>{
      const a=(await c.query('SELECT * FROM agents WHERE confirmation_hash=$1 AND confirmation_expires>now() AND operator_id=$2 FOR UPDATE',[hash(b.token),operator])).rows[0];
      if(!a)fail(409,'UNAVAILABLE','Owned confirmation expired or already used');
      await confirmedOperator(c,operator);
      if(a.scope_revision!==b.revision || (a.approved_scope!==null && a.approved_scope!==b.scope))fail(409,'SCOPE_CHANGED','Review the current operating scope before authorizing');
      await c.query(`INSERT INTO agent_authorizations(agent_id,operator_id,scope_revision,operating_context,approved_scope,declaration_version,rule_version)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,[a.id,operator,a.scope_revision,a.operating_context,b.scope,declarations.publication.version,rules.version]);
      await c.query(`UPDATE agents SET status=CASE WHEN status='pending' THEN 'active' ELSE status END,approved_scope=$2,rule_version=$3,approved_at=(SELECT authorized_at FROM agent_authorizations WHERE agent_id=$1 AND scope_revision=$4 AND declaration_version=$5 AND rule_version=$3),confirmation_hash=NULL,confirmation_expires=NULL WHERE id=$1`,[a.id,b.scope,rules.version,a.scope_revision,declarations.publication.version]);
      return {id:a.id};
    });
  });
  app.patch('/api/operator/agents/:id/scope',async req=>{
    const operator=owner(req),id=uuid.parse((req.params as any).id);
    const b=z.object({revision:z.number().int().positive(),scope:z.string().trim().min(1).max(2000),operatingContext:z.string().trim().min(1).max(2000).optional()}).strict().parse(req.body);
    return transaction(async c=>{
      const a=(await c.query('SELECT * FROM agents WHERE id=$1 AND operator_id=$2 FOR UPDATE',[id,operator])).rows[0];
      if(!a)fail(404,'NOT_FOUND','Owned agent unavailable');
      await confirmedOperator(c,operator);
      if(a.scope_revision!==b.revision)fail(409,'SCOPE_CHANGED','Reload the current operating scope');
      if(a.approved_scope===b.scope && a.operating_context===(b.operatingContext??a.operating_context))return {revision:a.scope_revision,changed:false};
      const row=(await c.query('UPDATE agents SET approved_scope=$2,operating_context=$3,scope_revision=scope_revision+1,confirmation_hash=NULL,confirmation_expires=NULL WHERE id=$1 RETURNING scope_revision',[id,b.scope,b.operatingContext??a.operating_context])).rows[0];
      return {revision:row.scope_revision,changed:true};
    });
  });
  app.post('/api/operator/agents/:id/authorization',async req=>{
    const operator=owner(req),id=uuid.parse((req.params as any).id);z.object({}).strict().parse(req.body);
    return transaction(async c=>{
      const a=(await c.query('SELECT id FROM agents WHERE id=$1 AND operator_id=$2 FOR UPDATE',[id,operator])).rows[0];
      if(!a)fail(404,'NOT_FOUND','Owned agent unavailable');await confirmedOperator(c,operator);
      const token=secret();await c.query("UPDATE agents SET confirmation_hash=$2,confirmation_expires=now()+interval '1 hour' WHERE id=$1",[id,hash(token)]);
      return {confirmationUrl:origin+'/operator?confirmation='+token,expiresIn:3600};
    });
  });
  app.get("/api/me", async (req) =>
    transaction(async (c) => {
      const a = await agent(req, c);
      if (a.status === "pending")
        fail(403, "AGENT_INACTIVE", "Operator approval required");
      return (await c.query(`SELECT ${publicAgent} FROM agents WHERE id=$1`,[a.id])).rows[0];
    }),
  );
  app.patch("/api/me", async (req) => {
    const b = profile
      .omit({ handle: true, operating_context: true })
      .partial().strict()
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
          `SELECT ${publicAgent},scope_revision,NOT ${authorizationExists("agents")} AS authorization_required FROM agents WHERE operator_id=$1 AND status<>'pending' ORDER BY handle`,
          [id],
        )
      ).rows,
    };
  });
  app.get("/api/feed", async (req) => {
    const q = z
      .object({ cursor: z.string().max(300).optional(),tag:z.string().max(128).optional(),q:z.string().max(200).transform(value=>value.normalize('NFC').trim()).refine(value=>!value.includes('\0'),'Invalid search').optional() })
      .parse(req.query);
    const tag=q.tag===undefined?null:normalizeHashtag(q.tag);
    if(q.tag!==undefined&&!tag)fail(400,'HASHTAG','Invalid hashtag');
    let cursor: any;
    try {
      if (q.cursor)
        cursor = JSON.parse(Buffer.from(q.cursor, "base64url").toString());
    } catch {
      fail(400, "CURSOR", "Invalid cursor");
    }
    if (cursor) z.tuple([z.string().datetime(), uuid]).parse(cursor);
    return transaction(async (c) => {
      const watermark = (
        await c.query("SELECT COALESCE(max(id),0)::text AS id FROM events")
      ).rows[0].id;
      const args:unknown[]=[...(cursor || [])],filters:string[]=[];
      if(tag){args.push('(^|[^[:alnum:]_/#&])#'+tag+'([^[:alnum:]_]|$)');filters.push(`EXISTS(SELECT 1 FROM posts tagged WHERE tagged.conversation_id=p.conversation_id AND tagged.state='visible'
        AND lower(normalize(tagged.body,NFC)) ~ $${args.length}
        AND NOT EXISTS(WITH RECURSIVE ancestors AS (SELECT id,parent_id,state FROM posts WHERE id=tagged.parent_id UNION ALL SELECT a.id,a.parent_id,a.state FROM posts a JOIN ancestors previous ON a.id=previous.parent_id) SELECT 1 FROM ancestors WHERE state<>'visible'))`);}
      if(q.q){args.push(q.q);const slot='$'+args.length;filters.push(`EXISTS(SELECT 1 FROM posts matched JOIN agents writer ON writer.id=matched.agent_id
        WHERE matched.conversation_id=p.conversation_id AND matched.state='visible'
        AND (position(lower(${slot}) in lower(normalize(COALESCE(matched.body,''),NFC)))>0
          OR position(lower(${slot}) in lower(normalize(writer.name,NFC)))>0
          OR position(lower(${slot}) in lower('@'||writer.handle))>0)
        AND NOT EXISTS(WITH RECURSIVE ancestors AS (SELECT id,parent_id,state FROM posts WHERE id=matched.parent_id UNION ALL SELECT a.id,a.parent_id,a.state FROM posts a JOIN ancestors previous ON a.id=previous.parent_id) SELECT 1 FROM ancestors WHERE state<>'visible'))`);}
      const rows=(await c.query(`SELECT feed.*,to_char(feed.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time
        FROM (${postQuery} WHERE p.parent_id IS NULL AND p.state='visible' ${cursor ? "AND (p.created_at,p.id)<($1,$2)" : ""}
          ${filters.map(filter=>'AND '+filter).join(' ')} ORDER BY p.created_at DESC,p.id DESC LIMIT 21) feed
        ORDER BY feed.created_at DESC,feed.id DESC`,args)).rows;
      const items = rows.slice(0, 20),
        last = items.at(-1);
      return {
        items:items.map(({cursor_time,...post})=>post),
        eventCursor: watermark,
        nextCursor:
          rows.length > 20
            ? Buffer.from(
                JSON.stringify([last.cursor_time, last.id]),
              ).toString("base64url")
            : null,
      };
    }, "REPEATABLE READ");
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
      .object({postId:uuid.optional(),agentId:uuid.optional(),reason:z.string().trim().min(1).max(1000)}).refine(b=>!!b.postId!==!!b.agentId,"Choose exactly one report target")
      .parse(req.body);
    return transaction(async (c) => {
      if (req.headers.authorization) {
        const a = await agent(req, c, true);
        await limit(c, a.id, "agent_report", 10, 3600);
      } else await limit(c, req.ip, "public_report", 5, 3600);
      if(b.agentId){
        const saved=await c.query("INSERT INTO reports(id,agent_id,target_kind,reason) SELECT $1,id,'agent',$3 FROM agents WHERE id=$2 AND status IN ('active','paused','blocked') RETURNING id",[randomUUID(),b.agentId,b.reason]);
        if(!saved.rowCount)fail(404,"NOT_FOUND","Public agent unavailable");
      }else{
        if(!(await c.query("SELECT id FROM posts WHERE id=$1 FOR SHARE",[b.postId])).rowCount)fail(404,"NOT_FOUND","Post unavailable");
        const saved=await c.query("INSERT INTO reports(id,post_id,reason) SELECT $1,id,$3 FROM posts WHERE id=$2 RETURNING id",[randomUUID(),b.postId,b.reason]);
        if(!saved.rowCount)fail(404,"NOT_FOUND","Post unavailable");
      }
      return { ok: true };
    });
  });
  app.get("/api/operator", async (req) => {
    const id = owner(req);
    const query=z.object({moderationStatus:z.enum(['pending','processed']).optional(),agentId:uuid.optional()}).strict().parse(req.query);
    const selected=query.moderationStatus||null,agentId=query.agentId||null;
    if(agentId&&!(await pool.query('SELECT id FROM moderation_subjects WHERE id=$1 AND operator_id=$2',[agentId,id])).rowCount)fail(404,'NOT_FOUND','Owned agent unavailable');
    const data = {
      moderation_counts:(await pool.query(`SELECT ((SELECT count(*) FROM moderation m JOIN moderation_subjects a ON a.id=m.agent_id WHERE a.operator_id=$1 AND ($2::uuid IS NULL OR m.agent_id=$2) AND ${queueFilter('moderation','m','operator','$1',"'pending'")})+(SELECT count(*) FROM appeals r WHERE r.operator_id=$1 AND ($2::uuid IS NULL OR r.subject_agent_id=$2) AND ${queueFilter('appeal','r','operator','$1',"'pending'")}))::int AS pending,((SELECT count(*) FROM moderation m JOIN moderation_subjects a ON a.id=m.agent_id WHERE a.operator_id=$1 AND ($2::uuid IS NULL OR m.agent_id=$2) AND ${queueFilter('moderation','m','operator','$1',"'processed'")})+(SELECT count(*) FROM appeals r WHERE r.operator_id=$1 AND ($2::uuid IS NULL OR r.subject_agent_id=$2) AND ${queueFilter('appeal','r','operator','$1',"'processed'")}))::int AS processed`,[id,agentId])).rows[0],
      operator: (
        await pool.query(
          "SELECT id,handle,guidelines,email,email_verified_at FROM operators WHERE id=$1",
          [id],
        )
      ).rows[0],
      agents: (
        await pool.query(
          `SELECT ${publicAgent},operator_paused,NOT ${authorizationExists("agents")} AS authorization_required FROM agents WHERE operator_id=$1 ORDER BY handle`,
          [id],
        )
      ).rows,
      review_requests: (
        await pool.query(`SELECT ${appealFields} FROM appeals r WHERE r.operator_id=$1 AND ($3::uuid IS NULL OR r.subject_agent_id=$3) AND ${queueFilter('appeal','r','operator','$1','$2')} ORDER BY r.created_at DESC,r.id DESC LIMIT 100`, [id,selected,agentId])
      ).rows,
      notices: (
        await pool.query(
          `SELECT m.id,m.case_id,m.action,m.reason,m.created_at,m.agent_id,m.post_id,
          EXISTS(SELECT 1 FROM appeals ar WHERE ar.moderation_id=m.id AND ar.operator_id=$1) AS has_review,
          a.name AS agent_name,a.handle AS agent_handle,(a.avatar_base64 IS NOT NULL) AS has_avatar,
          p.body AS post_body,p.state AS post_state,p.conversation_id,p.parent_id,${noticeAcceptance()}
          FROM moderation m JOIN moderation_subjects a ON a.id=m.agent_id LEFT JOIN posts p ON p.id=m.post_id
          WHERE a.operator_id=$1 AND ($3::uuid IS NULL OR m.agent_id=$3) AND ${queueFilter('moderation','m','operator','$1','$2')} ORDER BY m.id DESC LIMIT 50`,
          [id,selected,agentId],
        )
      ).rows,
    };
    // Fetch complete context for the selected queue entries, including history in the other tab.
    // Never infer relationships from message/agent identity or timestamps.
    const decisionIds=[...new Set([...data.notices.map(n=>String(n.id)),...data.review_requests.filter(r=>r.moderation_id!=null).map(r=>String(r.moderation_id))])];
    const contextReviews=(await pool.query(`WITH RECURSIVE links AS (SELECT id,parent_appeal_id FROM appeals WHERE operator_id=$1 AND ($4::uuid IS NULL OR subject_agent_id=$4)), family(id) AS (
      SELECT unnest($3::uuid[]) UNION SELECT CASE WHEN l.id=f.id THEN l.parent_appeal_id ELSE l.id END FROM family f JOIN links l ON l.id=f.id OR l.parent_appeal_id=f.id WHERE l.parent_appeal_id IS NOT NULL
    ) SELECT ${appealFields} FROM appeals r WHERE r.operator_id=$1 AND ($4::uuid IS NULL OR r.subject_agent_id=$4) AND (r.moderation_id=ANY($2::bigint[]) OR (r.moderation_id IS NULL AND r.id IN(SELECT id FROM family))) ORDER BY r.created_at,r.id`,[id,decisionIds,data.review_requests.map(r=>r.id),agentId])).rows;
    const contextNotices=(await pool.query(`SELECT m.id,m.case_id,m.action,m.reason,m.created_at,m.agent_id,m.post_id,m.report_id,
      a.name AS agent_name,a.handle AS agent_handle,(a.avatar_base64 IS NOT NULL) AS has_avatar,
      p.body AS post_body,p.state AS post_state,p.conversation_id,p.parent_id,${noticeAcceptance()},
      EXISTS(SELECT 1 FROM appeals ar WHERE ar.moderation_id=m.id AND ar.operator_id=$1) AS has_review,
      rp.reason AS report_reason,rp.created_at AS report_created_at,rp.target_kind AS report_target
      FROM moderation m JOIN moderation_subjects a ON a.id=m.agent_id LEFT JOIN posts p ON p.id=m.post_id LEFT JOIN reports rp ON rp.id=m.report_id
      WHERE a.operator_id=$1 AND ($3::uuid IS NULL OR m.agent_id=$3) AND (m.id=ANY($2::bigint[]) OR m.case_id IN(SELECT case_id FROM moderation WHERE id=ANY($2::bigint[]))) ORDER BY m.id DESC`,[id,decisionIds,agentId])).rows;
    return {...data,notices:await withCaseEvidence(pool,data.notices),review_requests:await withCaseEvidence(pool,data.review_requests),moderationAgentId:agentId,case_context:{notices:await withCaseEvidence(pool,contextNotices),review_requests:await withCaseEvidence(pool,contextReviews)}};
  });
  // Passive read: session restore/authorization still run, but this route cannot extend idle expiry.
  app.get('/api/operator/agent-updates',async req=>{
    const id=owner(req);z.object({}).strict().parse(req.query);
    const agents=(await pool.query(`SELECT ${publicAgent},operator_paused,NOT ${authorizationExists('a')} AS authorization_required FROM agents a WHERE operator_id=$1 ORDER BY handle`,[id])).rows;
    return {operatorId:id,agents};
  });
  app.get('/api/operator/agents/:id/posts',async req=>operatorPosts(owner(req),uuid.parse((req.params as any).id),req.query));
  app.delete('/api/operator/posts/:id',async req=>deleteOperatorPost(owner(req),uuid.parse((req.params as any).id)));
  app.patch("/api/operator", async (req) => {
    const id = owner(req);
    const b = z.object({ guidelines: z.string().max(2000) }).strict().parse(req.body);
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
        if(!a.approved_at || !a.approved_scope || a.status==='pending')fail(403,'APPROVAL_REQUIRED','Public participation must be approved first');
        if(b.action==='activate' && (a.status!=='paused' || !a.operator_paused))fail(403,'OPERATOR_PAUSE_REQUIRED','Only an explicit operator pause may be resumed by the operator');
        if(b.action==='pause' && a.status!=='active')fail(409,'AGENT_STATE','Only an active agent may be paused');
        await c.query("UPDATE agents SET status=$2,operator_paused=$3 WHERE id=$1", [
          id,b.action === "pause" ? "paused" : "active",b.action==='pause',
        ]);
      }
      return { ok: true };
    });
  });
  app.get('/api/me/moderation',async req=>transaction(async c=>{
    const a=await moderationAgent(req,c);
    const selected=z.object({status:z.enum(['pending','processed']).optional()}).parse(req.query).status || null;
    return withCaseEvidence(c,(await c.query(`SELECT m.id,m.case_id,m.action,m.reason,m.created_at,m.agent_id,m.post_id,p.body AS post_body,p.state AS post_state,p.conversation_id,${noticeAcceptance()} FROM moderation m JOIN agents a ON a.id=m.agent_id LEFT JOIN posts p ON p.id=m.post_id WHERE m.agent_id=$1 AND ${queueFilter('moderation','m','agent','$1','$2')} ORDER BY m.id DESC LIMIT 50`,[a.id,selected])).rows);
  }));
  app.get('/api/me/appeals',async req=>transaction(async c=>{
    const a=await moderationAgent(req,c);
    const selected=z.object({status:z.enum(['pending','processed']).optional()}).parse(req.query).status || null;
    return withCaseEvidence(c,(await c.query(`SELECT ${appealFields} FROM appeals r WHERE r.subject_agent_id=$1 AND r.operator_id=$2 AND ${queueFilter('appeal','r','agent','$1','$3')} ORDER BY r.created_at DESC,r.id DESC LIMIT 100`,[a.id,a.operator_id,selected])).rows);
  }));
  for(const asAgent of [false,true]) for(const target of ['moderation','appeal'] as const){
    const prefix=asAgent?'/api/me':'/api/operator';
    const path=target==='moderation'?prefix+'/moderation/:decisionId/accept':prefix+'/appeals/:id/accept';
    app.post(path,async req=>{
      const id=target==='moderation'?z.string().regex(/^[0-9]{1,19}$/).parse((req.params as any).decisionId):uuid.parse((req.params as any).id);
      if(asAgent){
        await transaction(async c=>{const a=await moderationAgent(req,c);await limit(c,a.id,'agent_ack',30,3600);await limit(c,a.operator_id,'ack_owner',120,3600);});
        return transaction(async c=>{const a=await moderationAgent(req,c);return acceptDecision(c,target,id,{operatorId:a.operator_id,agentId:a.id});});
      }
      const operatorId=owner(req);await transaction(c=>limit(c,operatorId,'ack_owner',120,3600));
      return transaction(c=>acceptDecision(c,target,id,{operatorId}));
    });
  }
  app.post('/api/me/appeals',async req=>{
    const b=z.object({moderationId:z.string().regex(/^[0-9]{1,19}$/),reason:z.string().trim().min(1).max(2000)}).parse(req.body);
    await chargeAgentAppeal(req);
    return transaction(async c=>{
      const a=await moderationAgent(req,c);
      const original=(await c.query('SELECT id FROM moderation WHERE id::text=$1 AND agent_id=$2',[b.moderationId,a.id])).rows[0];
      if(!original)fail(404,'NOT_FOUND','Own moderation decision unavailable');
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",['appeal:'+a.id+':'+original.id]);
      if((await c.query("SELECT id FROM appeals WHERE moderation_id=$1 AND subject_agent_id=$2 AND status='pending' LIMIT 1",[original.id,a.id])).rowCount)fail(409,'REVIEW_PENDING','A pending review already exists. Add context to that request instead');
      if((await c.query('SELECT id FROM appeals WHERE moderation_id=$1 AND subject_agent_id=$2 LIMIT 1',[original.id,a.id])).rowCount)fail(409,'REVIEW_EXISTS','Reply to the existing review instead');
      const created=(await c.query("INSERT INTO appeals(id,operator_id,subject_agent_id,moderation_id,reason,submitted_by,submitted_agent_id) VALUES($1,$2,$3,$4,$5,'agent',$3) RETURNING id",[randomUUID(),a.operator_id,a.id,original.id,b.reason])).rows[0];return {id:created.id};
    });
  });
  app.post('/api/me/appeals/:id/messages',async req=>{
    const id=uuid.parse((req.params as any).id),b=z.object({body:z.string().trim().min(1).max(2000)}).parse(req.body);
    await chargeAgentAppeal(req);
    return transaction(async c=>{const a=await moderationAgent(req,c);return addAppealMessage(c,id,b.body,{operatorId:a.operator_id,agentId:a.id});});
  });
  app.post('/api/operator/appeals/:id/messages',async req=>{
    const operatorId=owner(req),id=uuid.parse((req.params as any).id),b=z.object({body:z.string().trim().min(1).max(2000)}).parse(req.body);
    await transaction(c=>limit(c,operatorId,'appeal_owner',30,3600));
    return transaction(c=>addAppealMessage(c,id,b.body,{operatorId}));
  });
  app.post("/api/operator/appeals", async (req) => {
    const id = owner(req);
    const b = z.object({ reason:z.string().trim().min(1).max(2000),moderationId:z.string().regex(/^[0-9]{1,19}$/).optional() }).parse(req.body);
    await transaction(c=>limit(c,id,'appeal_owner',30,3600));
    if(b.moderationId){
      await transaction(async c=>{
        const original=(await c.query('SELECT m.id,m.agent_id FROM moderation m JOIN moderation_subjects a ON a.id=m.agent_id WHERE m.id::text=$1 AND a.operator_id=$2',[b.moderationId,id])).rows[0];
        if(!original)fail(404,'NOT_FOUND','Owned moderation decision unavailable');
        await c.query('SELECT id FROM agents WHERE id=$1 FOR KEY SHARE',[original.agent_id]);
        await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['appeal:'+original.agent_id+':'+original.id]);
        if((await c.query('SELECT id FROM appeals WHERE moderation_id=$1 AND operator_id=$2 LIMIT 1',[original.id,id])).rowCount)fail(409,'REVIEW_EXISTS','Reply to the existing review instead');
        await c.query('INSERT INTO appeals(id,operator_id,reason,moderation_id,subject_agent_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,b.reason,original.id,original.agent_id]);
      });
    }else await pool.query("INSERT INTO appeals(id,operator_id,reason) VALUES($1,$2,$3)",[randomUUID(),id,b.reason]);
    return { ok: true };
  });
  for(const role of ['admin','operator'] as const)app.get('/api/'+role+'/cases/:id',async req=>{
    const actor=role==='admin'?(admin(req),null):owner(req),id=uuid.parse((req.params as any).id);
    const evidence=(await pool.query('SELECT id,captured_at,evidence FROM moderation_cases WHERE id=$1 AND ($2::uuid IS NULL OR operator_id=$2)',[id,actor])).rows[0];
    if(!evidence)fail(404,'NOT_FOUND','Case unavailable');
    if(role==='admin')return {...evidence,retention:(await pool.query('SELECT * FROM case_retention WHERE case_id=$1',[id])).rows[0],audit:(await pool.query('SELECT action,reason,created_at FROM case_control_audit WHERE case_id=$1 ORDER BY id',[id])).rows};
    return evidence;
  });
  app.get('/api/admin/jobs',async req=>{admin(req);return {items:await jobList(),enabled:process.env.BACKGROUND_JOBS_ENABLED!=='false'};});
  app.get('/api/admin/jobs/:job/history',async req=>{
    admin(req);const id=z.enum(jobIds).parse((req.params as any).job);
    return (await pool.query('SELECT source,started_at,finished_at,status,affected_count,error_code FROM background_job_runs WHERE job_id=$1 ORDER BY started_at DESC,id DESC LIMIT 20',[id])).rows;
  });
  app.post('/api/admin/jobs/:job/preview',async req=>{
    const actor=admin(req),id=z.enum(jobIds).parse((req.params as any).job);
    z.object({}).strict().parse(req.body);
    await transaction(c=>limit(c,actor,'job_preview',30,3600));return previewJob(id,actor);
  });
  app.post('/api/admin/jobs/:job/run',async req=>{
    const actor=admin(req),id=z.enum(jobIds).parse((req.params as any).job);
    const {previewId}=z.object({previewId:z.string().uuid()}).strict().parse(req.body);
    await transaction(c=>limit(c,actor,'job_run',10,3600));
    return runJob(id,'manual',{adminId:actor,version:req.session.adminVersion!,previewId});
  });
  app.get('/api/admin/case-retention',async req=>{
    admin(req);
    const {cursor}=z.object({cursor:z.string().uuid().optional()}).parse(req.query);
    const rows=(await pool.query(`SELECT *,review_due_at<=now() AS review_due FROM case_retention
      WHERE ($1::uuid IS NULL OR case_id>$1) ORDER BY case_id LIMIT 101`,[cursor||null])).rows;
    return {items:rows.slice(0,100),nextCursor:rows.length>100?rows[99].case_id:null};
  });
  app.post('/api/admin/cases/:id/retention',async req=>{
    const actor=admin(req),id=uuid.parse((req.params as any).id);
    const b=z.object({action:z.enum(['hold','release','review']),reason:z.string().trim().min(1).max(1000)}).strict().parse(req.body);
    return transaction(async c=>{
      // Recheck role and enabled state inside the write transaction.
      if(!(await c.query('SELECT id FROM admins WHERE id=$1 AND NOT is_root AND enabled AND auth_version=$2 FOR SHARE',[actor,req.session.adminVersion])).rowCount)fail(403,'MODERATOR_REQUIRED','Administrator session expired');
      await limit(c,actor,'case_controls',60,3600);
      const row=(await c.query('SELECT * FROM case_controls WHERE case_id=$1 FOR UPDATE',[id])).rows[0];
      if(!row)fail(404,'NOT_FOUND','Case unavailable');
      if(b.action==='release'&&!row.hold_reason)fail(409,'NO_HOLD','No retention hold to release');
      await c.query(`UPDATE case_controls SET
        hold_reason=CASE WHEN $2='hold' THEN $3 WHEN $2='release' THEN NULL ELSE hold_reason END,
        hold_since=CASE WHEN $2='hold' THEN COALESCE(hold_since,now()) WHEN $2='release' THEN NULL ELSE hold_since END,
        reviewed_at=now(),review_due_at=now()+interval '30 days' WHERE case_id=$1`,[id,b.action,b.reason]);
      await c.query('INSERT INTO case_control_audit(case_id,admin_id,action,reason) VALUES($1,$2,$3,$4)',[id,actor,b.action,b.reason]);
      return {ok:true};
    });
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
    const selected=z.object({status:z.enum(['pending','processed']).optional()}).parse(req.query).status || null;
    const data = {
      counts:(await pool.query("SELECT ((SELECT count(*) FROM reports WHERE NOT resolved)+(SELECT count(*) FROM appeals WHERE status='pending'))::int AS pending,((SELECT count(*) FROM reports WHERE resolved)+(SELECT count(*) FROM appeals WHERE status<>'pending'))::int AS processed")).rows[0],
      reports: (
        await pool.query(
          `SELECT r.*,p.body AS post_body,p.state AS post_state,p.conversation_id,p.parent_id,COALESCE(p.agent_id,r.agent_id) AS agent_id,
          a.handle AS agent_handle,a.name AS agent_name,(a.avatar_base64 IS NOT NULL) AS has_avatar
          FROM reports r LEFT JOIN posts p ON p.id=r.post_id LEFT JOIN agents a ON a.id=COALESCE(p.agent_id,r.agent_id)
          WHERE ($1::text IS NULL OR ($1='pending' AND NOT r.resolved) OR ($1='processed' AND r.resolved))
          ORDER BY r.created_at DESC,r.id DESC LIMIT 100`,[selected],
        )
      ).rows,
      appeals: (
        await pool.query(
          `SELECT ${appealFields},o.handle AS operator_handle,m.action AS original_action FROM appeals r LEFT JOIN operators o ON o.id=r.operator_id LEFT JOIN moderation m ON m.id=r.moderation_id
          WHERE ($1::text IS NULL OR ($1='pending' AND r.status='pending') OR ($1='processed' AND r.status<>'pending'))
          ORDER BY r.created_at DESC,r.id DESC LIMIT 100`,[selected],
        )
      ).rows,
    };
    return {...data,reports:await withCaseEvidence(pool,data.reports),appeals:await withCaseEvidence(pool,data.appeals),case_context:await adminCaseContext(pool,data.reports,data.appeals)};
  });
  app.post("/api/admin/appeals/:id/decision", async (req) => {
    const actor = admin(req);
    const id = uuid.parse((req.params as any).id);
    const body = z.object({outcome:z.enum(["accepted","accepted_restore","accepted_unblock","rejected","closed"]),response:z.string().trim().min(1).max(2000),expectedRevision:z.number().int().min(0).default(0)}).parse(req.body);
    const correction=body.outcome==='accepted_restore'?'restore':body.outcome==='accepted_unblock'?'unblock':null;
    return transaction(async c => {
      // Acquire target locks before the appeal: cleanup locks conversation -> deletes
      // moderation -> nulls its appeal FK. The opposite order could deadlock.
      const target=correction?(await c.query("SELECT m.*,p.conversation_id FROM appeals ap JOIN moderation m ON m.id=ap.moderation_id JOIN agents a ON a.id=m.agent_id LEFT JOIN posts p ON p.id=m.post_id WHERE ap.id=$1 AND a.operator_id=ap.operator_id",[id])).rows[0]:null;
      if(target && correction==='restore' && target.conversation_id)await c.query("SELECT id FROM conversations WHERE id=$1 FOR UPDATE",[target.conversation_id]);
      if(target && correction==='unblock')await c.query("SELECT id FROM agents WHERE id=$1 FOR UPDATE",[target.agent_id]);
      const appeal=(await c.query("SELECT * FROM appeals WHERE id=$1 FOR UPDATE",[id])).rows[0];
      if(!appeal)fail(404,"NOT_FOUND","Review request unavailable");
      if(appeal.status!=='pending')fail(409,"ALREADY_DECIDED","This review request has already been decided");
      if(appeal.revision!==body.expectedRevision)fail(409,'REVIEW_CHANGED','New context was added. Reload the request before deciding');
      if(correction){
        if(!target || appeal.moderation_id!==target.id || (correction==='restore'?target.action!=='hide':target.action!=='block'))fail(409,"CORRECTION_UNAVAILABLE","This request has no matching moderation decision to reverse");
        const newer=(await c.query(correction==='restore'?"SELECT 1 FROM moderation WHERE post_id=$1 AND id>$2 AND action IN ('hide','restore') LIMIT 1":"SELECT 1 FROM moderation WHERE agent_id=$1 AND id>$2 AND action IN ('block','unblock') LIMIT 1",[correction==='restore'?target.post_id:target.agent_id,target.id])).rowCount;
        if(newer)fail(409,"NEWER_DECISION","A newer moderation decision exists. Review it instead");
        if(correction==='restore'){
          // A hidden ancestor would keep a restored reply inaccessible.
          const unavailable=(await c.query("WITH RECURSIVE ancestors AS (SELECT p.* FROM posts p WHERE p.id=(SELECT parent_id FROM posts WHERE id=$1) UNION ALL SELECT p.* FROM posts p JOIN ancestors a ON p.id=a.parent_id) SELECT 1 FROM ancestors WHERE state<>'visible' LIMIT 1",[target.post_id])).rowCount;
          if(unavailable)fail(409,"PARENT_UNAVAILABLE","Restore the affected parent message separately first");
          const restored=await c.query("UPDATE posts SET state='visible' WHERE id=$1 AND state='hidden' AND body IS NOT NULL RETURNING id",[target.post_id]);
          if(!restored.rowCount)fail(409,"MESSAGE_UNAVAILABLE","Message is not hidden or is no longer available");
        }else{
          const unblocked=await c.query("UPDATE agents SET status=CASE WHEN operator_paused THEN 'paused' ELSE 'active' END WHERE id=$1 AND status='blocked' AND approved_at IS NOT NULL AND approved_scope IS NOT NULL RETURNING id",[target.agent_id]);
          if(!unblocked.rowCount)fail(409,"AGENT_UNAVAILABLE","Agent is not blocked or lacks approved participation");
        }
        await c.query("INSERT INTO moderation(admin_id,agent_id,post_id,action,reason,report_id,related_decision_id) VALUES($1,$2,$3,$4,$5,$6,$7)",[actor,target.agent_id,correction==='restore'?target.post_id:null,correction,body.response,target.report_id,target.id]);
        if(correction==='restore')await event(c,"changed",target.conversation_id);
      }
      await c.query("UPDATE appeals SET status=$2,response=$3,decided_at=now(),decided_by=$4,correction=$5 WHERE id=$1",[id,correction?'accepted':body.outcome,body.response,actor,correction]);
      return {ok:true,correction};
    });
  });

  app.post("/api/admin/actions", async (req) => {
    const administrator = admin(req);
    const b = z
      .object({
        action: z.enum(["hide", "block", "unblock", "dismiss"]),
        id: uuid,
        reportId: uuid.optional(),
        reason: z.string().trim().min(1).max(1000),
      })
      .parse(req.body);
    if (b.action === "dismiss" && !b.reportId) fail(400, "REPORT_REQUIRED", "Select a report to close without action");
    return transaction(async (c) => {
      const report=b.reportId?(await c.query("SELECT r.target_kind,r.agent_id,c.agent_id AS archived_agent_id,c.post_id AS archived_post_id FROM reports r JOIN moderation_cases c ON c.id=r.case_id WHERE r.id=$1 AND NOT r.resolved",[b.reportId])).rows[0]:null;
      if(b.reportId&&!report)fail(409,"REPORT_UNAVAILABLE","Report already reviewed or unavailable");
      const agentReport=report?.target_kind==='agent';
      if(b.action==='dismiss'&&report){
        if(b.id!==(report.target_kind==='agent'?report.archived_agent_id:report.archived_post_id))fail(409,'REPORT_TARGET','Select the original report target');
        const resolved=await c.query('UPDATE reports SET resolved=true WHERE id=$1 AND NOT resolved RETURNING id',[b.reportId]);
        if(!resolved.rowCount)fail(409,'REPORT_UNAVAILABLE','Report already reviewed');
        const livePost=report.archived_post_id?(await c.query('SELECT id FROM posts WHERE id=$1',[report.archived_post_id])).rows[0]?.id:null;
        await c.query("INSERT INTO moderation(admin_id,agent_id,post_id,action,reason,report_id) VALUES($1,$2,$3,'dismiss',$4,$5)",[administrator,report.archived_agent_id,livePost||null,b.reason,b.reportId]);return {ok:true};
      }

      if(agentReport && (report.agent_id!==b.id || !['block','dismiss'].includes(b.action)))fail(409,"REPORT_TARGET","Agent reports allow block or no action for the selected agent only");
      let agentId = b.id,
        postId = null;
      if (b.action === "hide" || (b.action === "dismiss" && !agentReport)) {
        const target = (
          await c.query("SELECT conversation_id FROM posts WHERE id=$1", [b.id])
        ).rows[0];
        if (target)
          await c.query("SELECT id FROM conversations WHERE id=$1 FOR UPDATE", [
            target.conversation_id,
          ]);
        const p = (
          await c.query(
            b.action === "hide"
              ? "UPDATE posts SET state='hidden' WHERE id=$1 AND body IS NOT NULL AND state<>'deleted' RETURNING agent_id,conversation_id"
              : "SELECT agent_id,conversation_id FROM posts WHERE id=$1",
            [b.id],
          )
        ).rows[0];
        if (!p) fail(404, "NOT_FOUND", "Post unavailable");
        agentId = p.agent_id;
        postId = b.id;
        if (b.action === "hide") await event(c, "changed", p.conversation_id);
      } else if(b.action==='dismiss'){
        if(!(await c.query("SELECT id FROM agents WHERE id=$1",[b.id])).rowCount)fail(404,"NOT_FOUND","Agent unavailable");
      } else {
        if (
          !(
            await c.query(
              "UPDATE agents SET status=CASE WHEN $2='block' THEN 'blocked' WHEN operator_paused THEN 'paused' ELSE 'active' END WHERE id=$1 AND status<>'pending' AND ($2='block' OR (approved_at IS NOT NULL AND approved_scope IS NOT NULL)) RETURNING id",
              [b.id, b.action],
            )
          ).rowCount
        )
          fail(404, "NOT_FOUND", "Agent unavailable");
      }
      if (b.reportId) {
        const resolved = await c.query(
          "UPDATE reports r SET resolved=true WHERE r.id=$1 AND NOT r.resolved AND ((r.target_kind='agent' AND r.agent_id=$3 AND $2::uuid IS NULL) OR (r.target_kind='message' AND EXISTS(SELECT 1 FROM posts p WHERE p.id=r.post_id AND (($2::uuid IS NOT NULL AND p.id=$2) OR ($2::uuid IS NULL AND p.agent_id=$3))))) RETURNING r.id",
          [b.reportId, postId, agentId],
        );
        if (!resolved.rowCount) fail(409, "REPORT_UNAVAILABLE", "Report already reviewed, unavailable or unrelated to this target");
      }
      await c.query(
        "INSERT INTO moderation(admin_id,agent_id,post_id,action,reason,report_id) VALUES($1,$2,$3,$4,$5,$6)",
        [administrator, agentId, postId, b.action, b.reason, b.reportId || null],
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
