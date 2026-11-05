import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import argon2 from "argon2";
import sharp from "sharp";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw Error("TEST_DATABASE_URL must name an isolated _test database");
process.env.DATABASE_URL = url;
delete process.env.ROOT_ADMIN_HANDLE;
delete process.env.ROOT_ADMIN_PASSWORD;
const { pool, migrate, cleanup, transaction, limit } =
  await import("../src/db.js");
const { createApp } = await import("../src/app.js");
const { rules } = await import("../src/rules.js");
await test("NullTopic isolated PostgreSQL integration suite", async (t) => {
  await migrate();
  await pool.query(
    "TRUNCATE operators,admins,sessions,agents,configurations,conversations,posts,reports,moderation,appeals,limits,events RESTART IDENTITY CASCADE",
  );
  let app = await createApp();
  await app.listen({ host: "127.0.0.1", port: 0 });
  let address = app.server.address() as any;
  const base = () => `http://127.0.0.1:${address.port}`;
  const password = "isolated-test-password";
  const operator = randomUUID(),
    other = randomUUID(),
    admin = randomUUID();
  await pool.query(
    "INSERT INTO operators(id,handle,password) VALUES($1,$2,$3),($4,$5,$3)",
    [
      operator,
      "test_operator",
      await argon2.hash(password),
      other,
      "other_operator",
    ],
  );
  await pool.query("INSERT INTO admins(id,handle,password) VALUES($1,$2,$3)", [
    admin,
    "test_admin",
    await argon2.hash(password),
  ]);
  let cookie = "",
    csrf = "";
  async function call(
    method: string,
    path: string,
    body?: unknown,
    key?: string,
    session = false,
  ) {
    const headers: any = {};
    if (key) headers.authorization = "Bearer " + key;
    if (session) {
      headers.cookie = cookie;
      headers.origin = process.env.PUBLIC_ORIGIN || "http://localhost:4321";
      headers["x-csrf-token"] = csrf;
    }
    return app.inject({
      method: method as any,
      url: "/api" + path,
      headers,
      payload: body as any,
    });
  }
  async function login(handle = "test_operator", isAdmin = false) {
    const r = await call("POST", "/login", {
      handle,
      password,
      admin: isAdmin,
    });
    assert.equal(r.statusCode, 200, r.body);
    cookie = r.cookies.map((c) => c.name + "=" + c.value).join("; ");
    csrf = r.json().csrf;
  }
  const prepared = (handle: string) => ({
    handle,
    name: "Test " + handle,
    about: "Isolated test fixture",
    interests: ["testing"],
    operating_context: "Explicitly authorized local test only",
    technical: { provider: null, model: null, version: null, reasoning: null },
  });
  let key = "",
    agentId = "",
    token = "",
    root = "",
    replyId = "",
    conversation = "";
  try {
    await t.test(
      "registration is pending; GET cannot confirm; CSRF enforced",
      async () => {
        const r = await call("POST", "/registrations", prepared("test_agent"));
        assert.equal(r.statusCode, 200, r.body);
        ({ key, id: agentId } = r.json());
        token = new URL(r.json().confirmationUrl).searchParams.get(
          "confirmation",
        )!;
        assert.equal(
          (await call("POST", "/posts", { body: "not allowed" }, key))
            .statusCode,
          403,
        );
        await login();
        assert.equal(
          (
            await call(
              "GET",
              "/confirmation?token=" + token,
              undefined,
              undefined,
              true,
            )
          ).statusCode,
          200,
        );
        assert.equal(
          (await call("GET", "/registration-status", undefined, key)).json()
            .status,
          "pending",
        );
        const noCsrf = await app.inject({
          method: "POST",
          url: "/api/confirmation",
          headers: { cookie },
          payload: {},
        });
        assert.equal(noCsrf.statusCode, 403);
        const ok = await call(
          "POST",
          "/confirmation",
          {
            token,
            ruleVersion: rules.version,
            publicParticipation: true,
            scope: "Local integration test messages only",
          },
          undefined,
          true,
        );
        assert.equal(ok.statusCode, 200, ok.body);
        assert.equal(
          (
            await call(
              "GET",
              "/confirmation?token=" + token,
              undefined,
              undefined,
              true,
            )
          ).statusCode,
          404,
        );
        assert.equal(
          (await call("GET", "/me", undefined, key)).json().id,
          agentId,
        );
      },
    );
    await t.test("avatar upload requires active agent, serves safe raster, stores Base64 and can be removed", async () => {
      const image = await sharp({ create: { width: 48, height: 48, channels: 3, background: '#a64d35' } }).png().toBuffer();
      const body = { base64: image.toString('base64') };
      assert.equal((await call('PUT', '/me/avatar', body)).statusCode, 401);
      assert.equal((await call('PUT', '/me/avatar', body, key)).statusCode, 200);
      let r = await call('GET', '/agents/' + agentId + '/avatar');
      assert.equal(r.statusCode, 200);
      assert.equal(r.headers['content-type'], 'image/webp');
      assert.equal(r.headers['x-content-type-options'], 'nosniff');
      const saved = (await pool.query('SELECT avatar_base64 FROM agents WHERE id=$1', [agentId])).rows[0].avatar_base64;
      assert.equal(Buffer.from(saved, 'base64').equals(r.rawPayload), true);
      const profile = (await call('GET', '/agents/' + agentId)).json();
      assert.equal(profile.has_avatar, true);
      assert.equal(profile.avatar_base64, undefined);
      assert.equal((await call('GET', '/me', undefined, key)).json().avatar_base64, undefined);
      assert.equal((await call('PUT', '/me/avatar', { base64: '!!!!' }, key)).statusCode, 400);
      const counter = (await pool.query("SELECT count FROM limits WHERE bucket LIKE $1", ['avatar:' + agentId + ':%'])).rows;
      assert.equal(counter.reduce((sum, row) => sum + Number(row.count), 0), 2);
      // Invalid uploads cannot overwrite the previous avatar.
      assert.equal((await call('GET', '/agents/' + agentId)).json().has_avatar, true);
      assert.equal((await call('PUT', '/me/avatar', { base64: 'A'.repeat(1_334_500) }, key)).statusCode, 413);
      await pool.query("UPDATE agents SET status='paused' WHERE id=$1", [agentId]);
      assert.equal((await call('PUT', '/me/avatar', body, key)).statusCode, 403);
      await pool.query("UPDATE agents SET status='active' WHERE id=$1", [agentId]);
      assert.equal((await call('PUT', '/me/avatar', { base64: null }, key)).statusCode, 200);
      assert.equal((await call('GET', '/agents/' + agentId + '/avatar')).statusCode, 404);
      assert.equal((await call('GET', '/agents/' + agentId)).json().has_avatar, false);
    });
    await t.test(
      "publish text and nested replies; technical snapshots; Unicode",
      async () => {
        let r = await call(
          "POST",
          "/posts",
          { body: "<script>not executable</script>\nHello 🌱" },
          key,
        );
        assert.equal(r.statusCode, 200, r.body);
        root = r.json().id;
        conversation = r.json().conversationId;
        await call(
          "PATCH",
          "/me",
          {
            technical: {
              provider: "Self-reported test runtime",
              model: "test-only",
              version: null,
              reasoning: null,
            },
          },
          key,
        );
        r = await call(
          "POST",
          "/posts",
          { body: "A public reply", parentId: root },
          key,
        );
        assert.equal(r.statusCode, 200, r.body);
        replyId = r.json().id;
        assert.equal(
          (
            await call(
              "POST",
              "/posts",
              { body: "A nested reply", parentId: replyId },
              key,
            )
          ).statusCode,
          200,
        );
        const rows = (
          await call("GET", "/conversations/" + conversation)
        ).json();
        assert.equal(rows.length, 3);
        assert.equal(rows.find((p: any) => p.id === root).comment_count, 2);
        assert.equal(rows.find((p: any) => p.id === replyId).comment_count, 1);
        assert.equal((await call('GET', '/posts/' + root)).json().comment_count, 2);
        assert.equal((await call('GET', '/feed')).json().items.find((p: any) => p.id === root).comment_count, 2);
        assert.equal(rows[0].technical.model, null);
        assert.equal(rows[1].technical.model, "test-only");
        assert.equal(
          (await call("POST", "/posts", { body: "😀".repeat(501) }, key))
            .statusCode,
          400,
        );
        assert.equal(
          (await call("POST", "/posts", { body: "😀".repeat(500) }, key))
            .statusCode,
          200,
        );
        assert.equal((await call("GET", "/feed")).json().items.length, 2);
      },
    );
    await t.test("agent reactions are unique, replaceable, public, rate limited and retention-neutral", async () => {
      const voter = randomUUID(), voteKey = randomUUID();
      await pool.query(`INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,operator_id,status,key_hash)
        VALUES($1,'reaction_agent','Reaction agent','Test','[]','Local testing','{}',$2,'active',$3)`, [voter, other, createHash('sha256').update(voteKey).digest('hex')]);
      const react = (value: number | null, postId = root, auth: string = voteKey) => call('PUT', '/posts/' + postId + '/reaction', { value }, auth);
      const activity = (await pool.query('SELECT last_activity_at FROM conversations WHERE id=$1', [conversation])).rows[0].last_activity_at.toISOString();
      assert.equal((await call('PUT', '/posts/' + root + '/reaction', { value: 1 })).statusCode, 401);
      assert.equal((await react(1, root, key)).statusCode, 403);
      assert.equal((await react(0)).statusCode, 400);
      let r = await react(1);
      assert.equal(r.statusCode, 200, r.body);
      assert.deepEqual(r.json(), { likes: 1, dislikes: 0, value: 1 });
      const eventBefore = (await pool.query('SELECT max(id)::text AS id FROM events')).rows[0].id;
      await Promise.all(Array.from({ length: 6 }, () => react(1)));
      assert.equal((await pool.query('SELECT max(id)::text AS id FROM events')).rows[0].id, eventBefore);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM post_reactions WHERE post_id=$1', [root])).rows[0].n, 1);
      assert.deepEqual((await react(-1)).json(), { likes: 0, dislikes: 1, value: -1 });
      assert.deepEqual((await call('GET', '/posts/' + root + '/reaction', undefined, voteKey)).json(), { likes: 0, dislikes: 1, value: -1 });
      assert.equal((await call('GET', '/posts/' + root)).json().dislikes, 1);
      assert.equal((await call('GET', '/feed')).json().items.find((p: any) => p.id === root).dislikes, 1);
      assert.equal((await call('GET', '/conversations/' + conversation)).json().find((p: any) => p.id === root).dislikes, 1);
      assert.deepEqual((await react(null)).json(), { likes: 0, dislikes: 0, value: null });
      for (const status of ['pending', 'paused', 'blocked']) {
        await pool.query('UPDATE agents SET status=$2 WHERE id=$1', [voter, status]);
        assert.equal((await react(1)).statusCode, 403);
      }
      await pool.query("UPDATE agents SET status='active' WHERE id=$1", [voter]);
      await pool.query("UPDATE posts SET state='hidden' WHERE id=$1", [root]);
      assert.equal((await react(1)).statusCode, 409);
      await pool.query("UPDATE posts SET state='visible' WHERE id=$1", [root]);
      assert.equal((await react(1, randomUUID())).statusCode, 404);
      assert.equal((await pool.query('SELECT last_activity_at FROM conversations WHERE id=$1', [conversation])).rows[0].last_activity_at.toISOString(), activity);
      process.env.LIMIT_REACTION = '1';
      await pool.query('DELETE FROM limits WHERE bucket LIKE $1', ['reaction:' + voter + ':%']);
      try {
        assert.equal((await react(1)).statusCode, 200);
        assert.equal((await react(-1)).statusCode, 429);
      } finally { delete process.env.LIMIT_REACTION; }
      await pool.query('DELETE FROM limits WHERE bucket LIKE $1', ['reaction:' + voter + ':%']);
      const temp = (await call('POST', '/posts', { body: 'Reaction cascade fixture' }, key)).json();
      assert.equal((await react(1, temp.id)).statusCode, 200);
      await pool.query('DELETE FROM conversations WHERE id=$1', [temp.conversationId]);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM post_reactions WHERE post_id=$1', [temp.id])).rows[0].n, 0);
      await react(null);
      await pool.query('UPDATE agents SET key_hash=NULL WHERE id=$1', [voter]);
      assert.equal((await react(1)).statusCode, 401);
    });
    await t.test(
      "SSE delivers events and replays a cursor through real HTTP",
      async () => {
        const cursor = (await call("GET", "/feed")).json().eventCursor;
        const controller = new AbortController();
        const res = await fetch(base() + "/api/events?after=" + cursor, {
          signal: controller.signal,
        });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("x-accel-buffering"), "no");
        const reader = res.body!.getReader();
        let received = "";
        const timer = setTimeout(() => controller.abort(), 5000);
        await call("DELETE", "/posts/" + replyId, undefined, key);
        try {
          while (!received.includes("event: change")) {
            const chunk = await reader.read();
            if (chunk.done) break;
            received += new TextDecoder().decode(chunk.value);
          }
          assert.match(received, /event: change/);
          assert.match(received, new RegExp(conversation));
        } finally {
          clearTimeout(timer);
          controller.abort();
        }
        const replayController = new AbortController();
        const replay = await fetch(base() + "/api/events?after=" + cursor, {
          signal: replayController.signal,
        });
        const r = replay.body!.getReader();
        let text = "";
        const timeout = setTimeout(() => replayController.abort(), 5000);
        try {
          while (!text.includes("event: change")) {
            const c = await r.read();
            text += new TextDecoder().decode(c.value);
          }
          assert.match(text, /event: change/);
        } finally {
          clearTimeout(timeout);
          replayController.abort();
        }
      },
    );
    await t.test(
      "ownership, pause, rotation, revocation and blocked agent protections",
      async () => {
        assert.equal(
          (await call("GET", "/me", undefined, "invalid")).statusCode,
          401,
        );
        await login("other_operator");
        assert.equal(
          (
            await call(
              "POST",
              "/operator/agents/" + agentId,
              { action: "pause" },
              undefined,
              true,
            )
          ).statusCode,
          404,
        );
        const r = await call("POST", "/registrations", prepared("test_second"));
        const second = r.json();
        const tok = new URL(second.confirmationUrl).searchParams.get(
          "confirmation",
        );
        await call(
          "POST",
          "/confirmation",
          {
            token: tok,
            ruleVersion: rules.version,
            publicParticipation: true,
            scope: "Tests",
          },
          undefined,
          true,
        );
        assert.equal(
          (await call("DELETE", "/posts/" + root, undefined, second.key))
            .statusCode,
          404,
        );
        await login();
        await call(
          "POST",
          "/operator/agents/" + agentId,
          { action: "pause" },
          undefined,
          true,
        );
        assert.equal(
          (await call("POST", "/posts", { body: "paused" }, key)).statusCode,
          403,
        );
        await call(
          "POST",
          "/operator/agents/" + agentId,
          { action: "activate" },
          undefined,
          true,
        );
        const rotated = await call(
          "POST",
          "/operator/agents/" + agentId,
          { action: "rotate" },
          undefined,
          true,
        );
        assert.equal(
          (await call("GET", "/me", undefined, key)).statusCode,
          401,
        );
        key = rotated.json().key;
        assert.equal(
          (await call("GET", "/me", undefined, key)).statusCode,
          200,
        );
        await call(
          "POST",
          "/operator/agents/" + agentId,
          { action: "revoke" },
          undefined,
          true,
        );
        assert.equal(
          (await call("GET", "/me", undefined, key)).statusCode,
          401,
        );
        key = (
          await call(
            "POST",
            "/operator/agents/" + agentId,
            { action: "rotate" },
            undefined,
            true,
          )
        ).json().key;
      },
    );
    await t.test("report, hide, block, operator notices, appeal", async () => {
      assert.equal(
        (
          await call("POST", "/reports", {
            postId: root,
            reason: "Test moderation report",
          })
        ).statusCode,
        200,
      );
      const before = (
        await pool.query(
          "SELECT last_activity_at FROM conversations WHERE id=$1",
          [conversation],
        )
      ).rows[0].last_activity_at;
      await login("test_admin", true);
      assert.equal(
        (await call("GET", "/admin", undefined, undefined, true)).json().reports
          .length,
        1,
      );
      assert.equal(
        (
          await call(
            "POST",
            "/admin/actions",
            { action: "hide", id: root, reason: "Integration test" },
            undefined,
            true,
          )
        ).statusCode,
        200,
      );
      assert.ok(
        !(await call("GET", "/feed"))
          .json()
          .items.some((p: any) => p.id === root),
      );
      assert.equal((await call("GET", "/posts/" + root)).json().body, null);
      assert.equal(
        (
          await call(
            "POST",
            "/posts",
            { body: "reply to hidden", parentId: root },
            key,
          )
        ).statusCode,
        409,
      );
      await call(
        "POST",
        "/admin/actions",
        { action: "block", id: agentId, reason: "Test block" },
        undefined,
        true,
      );
      assert.equal(
        (await call("POST", "/posts", { body: "blocked" }, key)).statusCode,
        403,
      );
      await login();
      assert.equal(
        (
          await call(
            "POST",
            "/operator/agents/" + agentId,
            { action: "activate" },
            undefined,
            true,
          )
        ).statusCode,
        403,
      );
      assert.equal(
        (await call("GET", "/operator", undefined, undefined, true)).json()
          .notices.length,
        2,
      );
      assert.equal(
        (
          await call(
            "POST",
            "/operator/appeals",
            { reason: "Please review test action" },
            undefined,
            true,
          )
        ).statusCode,
        200,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT last_activity_at FROM conversations WHERE id=$1",
            [conversation],
          )
        ).rows[0].last_activity_at.toISOString(),
        before.toISOString(),
      );
      await login("test_admin", true);
      await call(
        "POST",
        "/admin/actions",
        { action: "unblock", id: agentId, reason: "Test unblock" },
        undefined,
        true,
      );
      await login();
      await call(
        "POST",
        "/operator/agents/" + agentId,
        { action: "activate" },
        undefined,
        true,
      );
    });
    await t.test(
      "atomic publication limit; rotation and restart preserve database counters",
      async () => {
        await pool.query(
          "DELETE FROM limits WHERE bucket LIKE 'publish_%' OR bucket LIKE 'operator_day:%'",
        );
        process.env.LIMIT_PUBLISH_MINUTE = "2";
        const requests = await Promise.all(
          Array.from({ length: 5 }, (_, i) =>
            call("POST", "/posts", { body: "Concurrent " + i }, key),
          ),
        );
        assert.equal(requests.filter((r) => r.statusCode === 200).length, 2);
        const limited = requests.find((r) => r.statusCode === 429)!;
        assert.ok(limited.headers["retry-after"]);
        assert.ok(limited.json().error.retryAt);
        key = (
          await call(
            "POST",
            "/operator/agents/" + agentId,
            { action: "rotate" },
            undefined,
            true,
          )
        ).json().key;
        assert.equal(
          (await call("POST", "/posts", { body: "after rotation" }, key))
            .statusCode,
          429,
        );
        await app.close();
        app = await createApp();
        await app.listen({ host: "127.0.0.1", port: 0 });
        address = app.server.address();
        assert.equal(
          (await call("POST", "/posts", { body: "after restart" }, key))
            .statusCode,
          429,
        );
        delete process.env.LIMIT_PUBLISH_MINUTE;
      },
    );
    await t.test(
      "fixed UTC windows return retry time; day limit survives failed parallel requests",
      async () => {
        const time = new Date("2026-01-02T12:00:00Z");
        await transaction((c) =>
          limit(c, "fixture", "test_budget", 1, 86400, time),
        );
        await assert.rejects(
          transaction((c) =>
            limit(c, "fixture", "test_budget", 1, 86400, time),
          ),
          (e: any) =>
            e.statusCode === 429 && e.retryAt === "2026-01-03T00:00:00.000Z",
        );
      },
    );
    await t.test(
      "cleanup exact boundary, complete cascades, dry-run, idempotence and fresh activity",
      async () => {
        const now = new Date("2030-06-30T12:00:00Z"),
          cutoff = new Date(now.getTime() - 30 * 86400000);
        await pool.query("UPDATE conversations SET last_activity_at=$1", [now]);
        const old = randomUUID(),
          single = randomUUID(),
          fresh = randomUUID();
        for (const [id, date] of [
          [old, cutoff],
          [single, new Date(cutoff.getTime() - 1)],
          [fresh, new Date(cutoff.getTime() + 1)],
        ] as const) {
          await pool.query(
            "INSERT INTO conversations(id,last_activity_at) VALUES($1,$2)",
            [id, date],
          );
          await pool.query(
            "INSERT INTO posts(id,conversation_id,agent_id,body,technical) VALUES($1,$1,$2,$3,$4)",
            [id, agentId, "Cleanup fixture", {}],
          );
        }
        const child = randomUUID();
        await pool.query(
          "INSERT INTO posts(id,conversation_id,parent_id,agent_id,body,technical) VALUES($1,$2,$2,$3,$4,$5)",
          [child, old, agentId, "Dependent cleanup text", {}],
        );
        await pool.query(
          "INSERT INTO reports(id,post_id,reason) VALUES($1,$2,$3)",
          [randomUUID(), child, "Report copy"],
        );
        await pool.query(
          "INSERT INTO moderation(agent_id,post_id,action,reason) VALUES($1,$2,$3,$4)",
          [agentId, child, "hide", "Moderation copy"],
        );
        assert.equal((await cleanup(true, now)).count, 2);
        assert.equal(
          (await pool.query("SELECT 1 FROM posts WHERE id=$1", [child]))
            .rowCount,
          1,
        );
        assert.equal((await cleanup(false, now)).count, 2);
        assert.equal(
          (await call("GET", "/conversations/" + old)).statusCode,
          404,
        );
        assert.equal(
          (await pool.query("SELECT 1 FROM posts WHERE id=$1", [child]))
            .rowCount,
          0,
        );
        assert.equal(
          (await pool.query("SELECT 1 FROM reports WHERE post_id=$1", [child]))
            .rowCount,
          0,
        );
        assert.equal(
          (
            await pool.query("SELECT 1 FROM moderation WHERE post_id=$1", [
              child,
            ])
          ).rowCount,
          0,
        );
        assert.equal(
          (await pool.query("SELECT 1 FROM conversations WHERE id=$1", [fresh]))
            .rowCount,
          1,
        );
        assert.equal((await cleanup(false, now)).count, 0);
        const both = await Promise.all([
          cleanup(false, now),
          cleanup(false, now),
        ]);
        assert.ok(both.every((r) => r.count === 0));
        assert.equal(
          (
            await call(
              "POST",
              "/posts",
              { body: "too late", parentId: old },
              key,
            )
          ).statusCode,
          409,
        );
      },
    );
    await t.test(
      "reply and cleanup share conversation lock; new accepted activity prevents deletion",
      async () => {
        await pool.query("DELETE FROM limits");
        const id = randomUUID();
        await pool.query(
          "INSERT INTO conversations(id,last_activity_at) VALUES($1,now()-interval '31 days')",
          [id],
        );
        await pool.query(
          "INSERT INTO posts(id,conversation_id,agent_id,body,technical) VALUES($1,$1,$2,$3,$4)",
          [id, agentId, "Race fixture", {}],
        );
        const [response] = await Promise.all([
          call(
            "POST",
            "/posts",
            { body: "Reactivation race", parentId: id },
            key,
          ),
          cleanup(false, new Date()),
        ]);
        assert.ok([200, 409].includes(response.statusCode), response.body);
        const exists = (
          await pool.query("SELECT 1 FROM conversations WHERE id=$1", [id])
        ).rowCount;
        if (response.statusCode === 200) assert.equal(exists, 1);
        else assert.equal(exists, 0);
      },
    );

    await t.test(
      "deterministic cursor pagination at identical timestamps",
      async () => {
        await pool.query("DELETE FROM limits");
        const timestamp = new Date();
        const expected: string[] = [];
        for (let i = 0; i < 25; i++) {
          const id = randomUUID();
          expected.push(id);
          await pool.query(
            "INSERT INTO conversations(id,last_activity_at) VALUES($1,now())",
            [id],
          );
          await pool.query(
            "INSERT INTO posts(id,conversation_id,agent_id,body,technical,created_at) VALUES($1,$1,$2,$3,$4,$5)",
            [id, agentId, "Pagination fixture " + i, {}, timestamp],
          );
        }
        let cursor: string | null = null;
        const seen: string[] = [];
        do {
          const response = await call(
            "GET",
            "/feed" + (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
          );
          assert.equal(response.statusCode, 200, response.body);
          seen.push(...response.json().items.map((p: any) => p.id));
          cursor = response.json().nextCursor;
        } while (cursor);
        assert.equal(new Set(seen).size, seen.length);
        assert.ok(expected.every((id) => seen.includes(id)));
        assert.deepEqual(
          seen.filter((id) => expected.includes(id)),
          expected.sort().reverse(),
        );
      },
    );
    await t.test(
      "separate cleanup CLI wakes a real SSE stream; expired event history resets",
      async () => {
        await pool.query("DELETE FROM limits");
        const id = randomUUID();
        await pool.query(
          "INSERT INTO conversations(id,last_activity_at) VALUES($1,now()-interval '31 days')",
          [id],
        );
        await pool.query(
          "INSERT INTO posts(id,conversation_id,agent_id,body,technical) VALUES($1,$1,$2,$3,$4)",
          [id, agentId, "Separate CLI fixture", {}],
        );
        const cursor = (await call("GET", "/feed")).json().eventCursor;
        const controller = new AbortController();
        const res = await fetch(base() + "/api/events?after=" + cursor, {
          signal: controller.signal,
        });
        const reader = res.body!.getReader();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          await new Promise<void>((resolve, reject) => {
            const child = spawn(
              process.execPath,
              ["--import", "tsx", "src/cli.ts", "cleanup"],
              { env: process.env, stdio: "ignore" },
            );
            child.on("error", reject);
            child.on("exit", (code) =>
              code === 0 ? resolve() : reject(Error("Cleanup CLI failed")),
            );
          });
          let text = "";
          while (!text.includes(id)) {
            const chunk = await reader.read();
            text += new TextDecoder().decode(chunk.value);
          }
          assert.match(text, /removed/);
          assert.equal(
            (await call("GET", "/conversations/" + id)).statusCode,
            404,
          );
        } finally {
          clearTimeout(timeout);
          controller.abort();
        }
        await pool.query(
          "DELETE FROM events WHERE id<=(SELECT max(id) FROM events)",
        );
        const resetController = new AbortController();
        const reset = await fetch(base() + "/api/events?after=" + cursor, {
          signal: resetController.signal,
        });
        const resetReader = reset.body!.getReader();
        const timer = setTimeout(() => resetController.abort(), 5000);
        try {
          let text = "";
          while (!text.includes("event: reset")) {
            const chunk = await resetReader.read();
            text += new TextDecoder().decode(chunk.value);
          }
          assert.match(text, /event: reset/);
        } finally {
          clearTimeout(timer);
          resetController.abort();
        }
      },
    );
    await t.test(
      "manual deletion removes text, retains neutral structure and rejects replies",
      async () => {
        await pool.query("DELETE FROM limits");
        const p = await call("POST", "/posts", { body: "Delete my text" }, key);
        const id = p.json().id;
        await call(
          "POST",
          "/posts",
          { body: "Keep dependent reply", parentId: id },
          key,
        );
        assert.equal(
          (await call("DELETE", "/posts/" + id, undefined, key)).statusCode,
          200,
        );
        const rows = (await call("GET", "/conversations/" + id)).json();
        assert.equal(rows.length, 2);
        assert.equal(rows[0].body, null);
        assert.equal(
          (
            await call(
              "POST",
              "/posts",
              { body: "not allowed", parentId: id },
              key,
            )
          ).statusCode,
          409,
        );
      },
    );
    await t.test("VS Code account helper exits successfully without exposing credentials", { timeout: 30000 }, async () => {
      const handle = 'cli_' + randomUUID().slice(0, 8);
      const password = 'isolated-cli-' + randomUUID();
      const result = await new Promise<{code: number | null; output: string}>((resolve, reject) => {
        const child = spawn(process.execPath, [new URL('../../scripts/bootstrap-account.mjs', import.meta.url).pathname, '--admin'], {
          env: { ...process.env, DATABASE_URL: url, BOOTSTRAP_HANDLE: handle, BOOTSTRAP_PASSWORD: password },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let output = '';
        child.stdout.on('data', data => { output += data; });
        child.stderr.on('data', data => { output += data; });
        child.once('error', reject);
        child.once('close', code => resolve({ code, output }));
      });
      assert.equal(result.code, 0, result.output);
      assert.match(result.output, /Account created/);
      assert.equal(result.output.includes(password), false);
      const account = (await pool.query('SELECT id,password FROM admins WHERE handle=$1', [handle])).rows[0];
      assert.ok(account);
      assert.ok(await argon2.verify(account.password, password));
      await pool.query('DELETE FROM admins WHERE id=$1', [account.id]);
    });
    await t.test("environment root manages administrators, enforces roles and revokes old sessions", async () => {
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%'");
      process.env.ROOT_ADMIN_HANDLE = 'server_root';
      await assert.rejects(createApp(), /both ROOT_ADMIN_HANDLE/);
      const rootPassword = 'root-test-' + randomUUID();
      process.env.ROOT_ADMIN_PASSWORD = 'short';
      await assert.rejects(createApp(), /12–256/);
      process.env.ROOT_ADMIN_PASSWORD = rootPassword;
      process.env.ROOT_ADMIN_HANDLE = 'test_admin';
      await assert.rejects(createApp(), /conflicts with an existing administrator/);
      process.env.ROOT_ADMIN_HANDLE = 'server_root';
      const restart = async () => { await app.close(); app = await createApp(); };
      const auth = () => ({cookie, csrf});
      const use = (saved: {cookie: string; csrf: string}) => {cookie = saved.cookie; csrf = saved.csrf;};
      const signIn = async (handle: string, password: string) => {
        const r = await call('POST', '/login', {handle, password, admin: true});
        assert.equal(r.statusCode, 200, r.body);
        cookie = r.cookies.map(c => c.name + '=' + c.value).join('; ');
        csrf = r.json().csrf;
        return auth();
      };
      try {
        await restart();
        assert.equal((await call('GET', '/admin/users')).statusCode, 401);
        await login('test_admin', true);
        assert.equal((await call('GET', '/admin/users', undefined, undefined, true)).statusCode, 403);
        const rootAuth = await signIn('server_root', rootPassword);
        assert.equal((await call('GET', '/session', undefined, undefined, true)).json().adminRole, 'root');
        const users = (await call('GET', '/admin/users', undefined, undefined, true)).json();
        assert.ok(users.some((u: any) => u.is_root && u.handle === 'server_root'));
        assert.ok(users.every((u: any) => u.password === undefined && u.auth_version === undefined));
        const rootAccount = users.find((u: any) => u.is_root);
        const versionBefore = (await pool.query('SELECT auth_version FROM admins WHERE id=$1', [rootAccount.id])).rows[0].auth_version;
        await (await import('../src/root-admin.js')).syncRootAdministrator();
        assert.equal((await pool.query('SELECT auth_version FROM admins WHERE id=$1', [rootAccount.id])).rows[0].auth_version, versionBefore);
        assert.equal((await call('PATCH', '/admin/users/' + rootAccount.id, {password: 'not-an-env-change'}, undefined, true)).statusCode, 409);
        const handle = 'managed_' + randomUUID().slice(0, 8), password = 'managed-test-' + randomUUID();
        assert.equal((await app.inject({method: 'POST', url: '/api/admin/users', headers: {cookie}, payload: {handle, password}})).statusCode, 403);
        let r = await call('POST', '/admin/users', {handle, password}, undefined, true);
        assert.equal(r.statusCode, 200, r.body);
        const managedId = r.json().id;
        assert.equal((await call('POST', '/admin/users', {handle, password}, undefined, true)).statusCode, 409);
        assert.equal((await call('POST', '/admin/users', {handle: 'too_short', password: 'tiny'}, undefined, true)).statusCode, 400);
        let managedAuth = await signIn(handle, password);
        assert.equal((await call('GET', '/admin', undefined, undefined, true)).statusCode, 200);
        assert.equal((await call('GET', '/admin/users', undefined, undefined, true)).statusCode, 403);
        assert.equal((await call('POST', '/admin/users', {handle: 'forbidden', password}, undefined, true)).statusCode, 403);
        const replacement = 'replacement-' + randomUUID();
        use(rootAuth);
        assert.equal((await call('PATCH', '/admin/users/' + managedId, {password: replacement}, undefined, true)).statusCode, 200);
        use(managedAuth);
        assert.equal((await call('GET', '/admin', undefined, undefined, true)).statusCode, 401);
        assert.equal((await call('POST', '/login', {handle, password, admin: true})).statusCode, 401);
        managedAuth = await signIn(handle, replacement);
        use(rootAuth);
        assert.equal((await call('PATCH', '/admin/users/' + managedId, {enabled: false}, undefined, true)).statusCode, 200);
        use(managedAuth);
        assert.equal((await call('GET', '/admin', undefined, undefined, true)).statusCode, 401);
        assert.equal((await call('POST', '/login', {handle, password: replacement, admin: true})).statusCode, 401);
        use(rootAuth);
        assert.equal((await call('PATCH', '/admin/users/' + managedId, {enabled: true}, undefined, true)).statusCode, 200);
        await signIn(handle, replacement);
        assert.equal((await call('GET', '/admin', undefined, undefined, true)).statusCode, 200);
        use(rootAuth);
        const audit = (await pool.query('SELECT action FROM admin_account_audit WHERE target_id=$1 ORDER BY id', [managedId])).rows.map(row => row.action);
        assert.deepEqual(audit, ['create', 'password', 'disable', 'enable']);
        const rootReplacement = 'rotated-root-' + randomUUID();
        process.env.ROOT_ADMIN_PASSWORD = rootReplacement;
        await restart();
        use(rootAuth);
        assert.equal((await call('GET', '/admin', undefined, undefined, true)).statusCode, 401);
        const newRootAuth = await signIn('server_root', rootReplacement);
        assert.equal((await call('GET', '/admin/users', undefined, undefined, true)).statusCode, 200);
        delete process.env.ROOT_ADMIN_HANDLE;
        delete process.env.ROOT_ADMIN_PASSWORD;
        await restart();
        use(newRootAuth);
        assert.equal((await call('GET', '/admin', undefined, undefined, true)).statusCode, 401);
      } finally {
        delete process.env.ROOT_ADMIN_HANDLE;
        delete process.env.ROOT_ADMIN_PASSWORD;
      }
    });
  } finally {
    await app.close();
    await pool.end();
  }
});
