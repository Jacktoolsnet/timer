import {mkdtemp,readFile,stat,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
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
const deletionTestDirectory=await mkdtemp(join(tmpdir(),'nulltopic-deletion-suite-'));
process.env.CASE_PURGE_JOURNAL_PATH=join(deletionTestDirectory,'journal.json');
delete process.env.ROOT_ADMIN_HANDLE;
delete process.env.ROOT_ADMIN_PASSWORD;
delete process.env.ROOT_ADMIN_EMAIL;
const { pool, migrate, cleanup, transaction, limit } =
  await import("../src/db.js");
const { createApp } = await import("../src/app.js");
const { rules } = await import("../src/rules.js");
const mailbox:{to:string;subject:string;text:string}[]=[];
const testApp=()=>createApp({mailer:{available:true,send:async message=>{mailbox.push(message);}}});
async function emailTokenFor(email:string,purpose='verify'){
 for(let n=0;n<50;n++){
  const message=mailbox.filter(m=>m.to===email&&m.text.includes('#'+purpose+'=')).at(-1);
  if(message){const link=message.text.split(/\s+/).find(part=>part.includes('#'+purpose+'='))!;return new URLSearchParams(new URL(link).hash.slice(1)).get(purpose)!;}
  await new Promise(r=>setTimeout(r,5));
 }
 throw Error('Synthetic mailbox did not receive an account email');
}

await test("NullTopic isolated PostgreSQL integration suite", async (t) => {
  await migrate();
  await pool.query(
    "TRUNCATE login_challenges,identity_deletion_journal,post_deletion_journal,background_job_runs,background_job_previews,moderation_cases,operators,admins,sessions,agents,configurations,conversations,posts,reports,moderation,appeals,limits,events RESTART IDENTITY CASCADE",
  );
  const initialStats=await (await import('../src/statistics.js')).readStatistics();
  for(const key of ['operators','agents','messages'])assert.deepEqual(initialStats[key],{total:'0',today:'0',lastSevenDays:'0'});
  let app = await testApp();
  await app.listen({ host: "127.0.0.1", port: 0 });
  let address = app.server.address() as any;
  const base = () => `http://127.0.0.1:${address.port}`;
  const password = "isolated-test-password";
  const verifyOperator=async(email:string)=>{const token=await emailTokenFor(email);const r=await app.inject({method:'POST',url:'/api/operator-email/verify',remoteAddress:'127.0.0.2',payload:{token}});assert.equal(r.statusCode,200,r.body);};
  const createOperator=async(handle:string,language='en')=>{
    const r=await app.inject({method:'POST',url:'/api/operator-registrations',payload:{handle,password,email:handle+'@example.invalid',language,accountType:'personal',ageConfirmed:true,ageVersion:'age-18-v1'}});
    assert.equal(r.statusCode,200,r.body);await verifyOperator(handle+'@example.invalid');return (await pool.query('SELECT id FROM operators WHERE handle=$1',[handle])).rows[0].id as string;
  };
  const operator=await createOperator('test_operator'),other=await createOperator('other_operator'),admin=randomUUID();
  await pool.query("INSERT INTO admins(id,handle,password,email) VALUES($1,$2,$3,$2||'@example.invalid')", [
    admin,
    "test_admin",
    await argon2.hash(password),
  ]);
  let cookie = "",
    csrf = "";
  const rawLogin=async(payload:any)=>{
    await pool.query("DELETE FROM limits WHERE bucket LIKE 'login_mail_%' OR bucket LIKE 'login_code_%'");
    const started=await app.inject({method:'POST',url:'/api/login',payload});
    if(started.statusCode!==200||!started.json().twoFactorRequired)return started;
    const table=payload.admin?'admins':'operators',email=(await pool.query(`SELECT email FROM ${table} WHERE handle=$1`,[payload.handle])).rows[0].email;
    const message=mailbox.filter(m=>m.to===email&&/^\d{6}$/m.test(m.text)).at(-1);assert.ok(message,'Synthetic OTP email delivered');
    const code=message.text.match(/^\d{6}$/m)![0];
    return app.inject({method:'POST',url:'/api/login/verify',remoteAddress:'127.0.0.3',headers:{cookie:started.cookies.map(c=>c.name+'='+c.value).join('; '),origin:process.env.PUBLIC_ORIGIN||'http://localhost:4321','x-csrf-token':started.json().csrf},payload:{code}});
  };
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
    if(method==='POST'&&path==='/login')return rawLogin(body);
    if(method==='POST'&&path==='/admin/users'&&body&&typeof body==='object'&&!('email' in body))body={...body,email:(body as any).handle+'@example.invalid'};
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
    operatorHandle:"test_operator",
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
            authorizePublication:true,authorizationVersion:'agent-publication-v1',revision:1,
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
      await login('other_operator');
      const voterRegistration=await call('POST','/registrations',{...prepared('reaction_agent'),operatorHandle:'other_operator'});assert.equal(voterRegistration.statusCode,200,voterRegistration.body);
      const voter=voterRegistration.json().id,voteKey=voterRegistration.json().key;
      const voterToken=new URL(voterRegistration.json().confirmationUrl).searchParams.get('confirmation');
      const voterPreview=(await call('GET','/confirmation?token='+voterToken,undefined,undefined,true)).json();
      assert.equal((await call('POST','/confirmation',{token:voterToken,revision:voterPreview.scope_revision,scope:'Reaction fixtures',ruleVersion:voterPreview.ruleVersion,authorizationVersion:voterPreview.authorizationVersion,publicParticipation:true,authorizePublication:true},undefined,true)).statusCode,200);
      await login();
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
        await call("DELETE", "/posts/" + replyId, {confirmSubtree:true}, key);
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
        const r = await call("POST", "/registrations", {...prepared("test_second"),operatorHandle:"other_operator"});
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
            authorizePublication:true,authorizationVersion:'agent-publication-v1',revision:1,
            scope: "Tests",
          },
          undefined,
          true,
        );
        assert.equal(
          (await call("DELETE", "/posts/" + root, {confirmSubtree:true}, second.key))
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
    await t.test("dismiss closes only the selected report atomically without altering public content", async () => {
      const reportId = randomUUID(), secondReport = randomUUID();
      await pool.query("INSERT INTO reports(id,post_id,reason) VALUES($1,$3,'Fixture'),($2,$3,'Second fixture')", [reportId, secondReport, root]);
      const snapshot = async () => (await pool.query("SELECT p.body,p.state,a.status,c.last_activity_at FROM posts p JOIN agents a ON a.id=p.agent_id JOIN conversations c ON c.id=p.conversation_id WHERE p.id=$1", [root])).rows[0];
      const before = await snapshot();
      const decision = {action: "dismiss", id: root, reportId, reason: "Reviewed in context; no violation."};
      assert.equal((await call("POST", "/admin/actions", decision)).statusCode, 401);
      await login();
      assert.equal((await call("POST", "/admin/actions", decision, undefined, true)).statusCode, 401);
      await login("test_admin", true);
      assert.equal((await call("POST", "/admin/actions", {...decision, reportId: undefined}, undefined, true)).statusCode, 400);
      assert.equal((await call("POST", "/admin/actions", {...decision, reason: "   "}, undefined, true)).statusCode, 400);
      assert.equal((await call("POST", "/admin/actions", {...decision, action: "hide", reportId: randomUUID()}, undefined, true)).statusCode, 409);
      assert.deepEqual(await snapshot(), before, 'mismatched report rolls back hiding');
      assert.equal((await call("POST", "/admin/actions", decision, undefined, true)).statusCode, 200);
      assert.deepEqual(await snapshot(), before);
      const reports = (await pool.query("SELECT id,resolved FROM reports WHERE id=ANY($1::uuid[])", [[reportId,secondReport]])).rows;
      assert.equal(reports.find(r => r.id === reportId).resolved, true);
      assert.equal(reports.find(r => r.id === secondReport).resolved, false);
      const audit = (await pool.query("SELECT reason,admin_id FROM moderation WHERE post_id=$1 AND action='dismiss'", [root])).rows;
      assert.deepEqual(audit, [{reason: decision.reason, admin_id: admin}]);
      assert.equal((await call("POST", "/admin/actions", decision, undefined, true)).statusCode, 409);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM moderation WHERE post_id=$1 AND action='dismiss'", [root])).rows[0].count, 1);
      await pool.query("DELETE FROM reports WHERE id=ANY($1::uuid[])", [[reportId, secondReport]]);
      await pool.query("DELETE FROM moderation WHERE post_id=$1 AND action='dismiss'", [root]);
    });
    await t.test("report, hide, block, operator notices, appeal", async () => {
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%'");
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
      assert.equal((await call('GET', '/admin')).statusCode, 401);
      const inbox = (await call('GET', '/admin', undefined, undefined, true)).json();
      assert.equal(inbox.reports[0].agent_id, agentId);
      assert.equal(inbox.reports[0].agent_handle, 'test_agent');
      assert.equal(inbox.reports[0].conversation_id, conversation);
      assert.equal(typeof inbox.reports[0].post_body, 'string');
      assert.equal(inbox.reports[0].key_hash, undefined);
      assert.equal(inbox.reports[0].has_avatar, false);
      assert.equal(inbox.reports[0].avatar_base64, undefined);
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
            { action: "hide", id: root, reportId: inbox.reports[0].id, reason: "Integration test" },
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
      assert.equal((await call('GET', '/admin', undefined, undefined, true)).json().reports[0].post_state, 'hidden');
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
      const ownNotices=(await call("GET","/operator",undefined,undefined,true)).json().notices;
      const hiddenNotice=ownNotices.find((notice:any)=>notice.action==='hide');
      assert.equal(hiddenNotice.agent_handle,'test_agent');
      assert.equal(hiddenNotice.post_id,root);
      assert.equal(hiddenNotice.conversation_id,conversation);
      assert.equal(typeof hiddenNotice.post_body,'string');
      assert.equal(hiddenNotice.post_state,'hidden');
      assert.equal(typeof hiddenNotice.id,'string');
      assert.equal(hiddenNotice.avatar_base64,undefined);
      assert.equal(hiddenNotice.key_hash,undefined);

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
      assert.equal((await call('GET', '/admin', undefined, undefined, true)).json().appeals[0].operator_handle, 'test_operator');
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
        app = await testApp();
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

    await t.test('hashtag feed filters before pagination, includes visible comments, excludes hidden branches and preserves retention',async()=>{
      const ids:string[]=[],expected:string[]=[];
      async function root(body:string){const id=randomUUID();ids.push(id);await pool.query("INSERT INTO conversations(id,last_activity_at) VALUES($1,'2026-01-01')",[id]);await pool.query("INSERT INTO posts(id,conversation_id,agent_id,body,technical,created_at) VALUES($1,$1,$2,$3,'{}','2026-01-01')",[id,agentId,body]);return id;}
      async function reply(thread:string,parent:string,body:string,state='visible'){const id=randomUUID();await pool.query("INSERT INTO posts(id,conversation_id,parent_id,agent_id,body,technical,state) VALUES($1,$2,$3,$4,$5,'{}',$6)",[id,thread,parent,agentId,body,state]);return id;}
      try{
        for(let i=0;i<25;i++){expected.push(await root(i%2?'[Local test] #Art':'[Local test] #ART'));await root('Noise #artist https://example.test/#art word#art ##art');}
        const comments=await root('Root without a tag');expected.push(comments);await reply(comments,comments,'[Local test] Comment #art');
        const hidden=await root('Hidden comment test');await reply(hidden,hidden,'#art','hidden');
        const branch=await root('Hidden ancestor test');const parent=await reply(branch,branch,'Unavailable','hidden');await reply(branch,parent,'#art');
        const unicode=await root('[Local test] #Grüße #Cafe\u0301');
        const seen:string[]=[];let cursor:string|null=null;
        do{const response=await call('GET','/feed?tag=ArT'+(cursor?'&cursor='+encodeURIComponent(cursor):''));assert.equal(response.statusCode,200,response.body);const page=response.json();seen.push(...page.items.map((p:any)=>p.id));cursor=page.nextCursor;}while(cursor);
        assert.deepEqual([...seen].sort(),expected.sort());assert.equal(new Set(seen).size,seen.length);
        for(const tag of ['GRÜßE','café']){const response=await call('GET','/feed?tag='+encodeURIComponent(tag));assert.equal(response.statusCode,200,response.body);assert.deepEqual(response.json().items.map((p:any)=>p.id),[unicode]);}
        for(const tag of ['','bad tag','#art','a'.repeat(65),'art|.*'])assert.equal((await call('GET','/feed?tag='+encodeURIComponent(tag))).statusCode,400);
        assert.equal((await pool.query("SELECT count(*)::int AS count FROM conversations WHERE id=ANY($1::uuid[]) AND last_activity_at='2026-01-01'",[ids])).rows[0].count,ids.length);
      }finally{await pool.query('DELETE FROM conversations WHERE id=ANY($1::uuid[])',[ids]);}
    });

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
      "manual deletion removes the entire conversation and rejects replies",
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
          (await call("DELETE", "/posts/" + id, {confirmSubtree:true}, key)).statusCode,
          200,
        );
        const rows = (await call("GET", "/conversations/" + id)).json();
        assert.equal((await call("GET", "/conversations/" + id)).statusCode,404);
        assert.equal((await pool.query("SELECT id FROM posts WHERE conversation_id=$1",[id])).rowCount,0);
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
          env: { ...process.env, DATABASE_URL: url, BOOTSTRAP_HANDLE: handle, BOOTSTRAP_PASSWORD: password,BOOTSTRAP_EMAIL:'bootstrap_admin@example.invalid' },
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
      process.env.ROOT_ADMIN_EMAIL='root@example.invalid';
      process.env.ROOT_ADMIN_HANDLE = 'server_root';
      await assert.rejects(testApp(), /both ROOT_ADMIN_HANDLE/);
      const rootPassword = 'root-test-' + randomUUID();
      process.env.ROOT_ADMIN_PASSWORD = 'short';
      await assert.rejects(testApp(), /12–256/);
      process.env.ROOT_ADMIN_PASSWORD = rootPassword;
      process.env.ROOT_ADMIN_HANDLE = 'test_admin';
      await assert.rejects(testApp(), /conflicts with an existing administrator/);
      process.env.ROOT_ADMIN_EMAIL='root@example.invalid';
      process.env.ROOT_ADMIN_HANDLE = 'server_root';
      const restart = async () => { await app.close(); app = await testApp(); };
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
        const rootStats=await call('GET','/admin/statistics',undefined,undefined,true);assert.equal(rootStats.statusCode,200);assert.deepEqual(Object.keys(rootStats.json()).sort(),['agents','asOf','date','messages','operators','timezone']);
        for(const path of ['/admin','/admin/jobs','/admin/jobs/cases/history','/admin/case-retention','/admin/cases/'+randomUUID()])assert.equal((await call('GET',path,undefined,undefined,true)).statusCode,403);
        assert.equal((await call('POST','/admin/cases/'+randomUUID()+'/retention',{action:'hold',reason:'Forbidden root access'},undefined,true)).statusCode,403);
        assert.equal((await call('POST','/admin/actions',{action:'dismiss',id:randomUUID(),reportId:randomUUID(),reason:'Forbidden root access'},undefined,true)).statusCode,403);

        assert.equal((await call('GET', '/session', undefined, undefined, true)).json().adminRole, 'root');
        assert.equal((await call('GET', '/session', undefined, undefined, true)).json().adminHandle, 'server_root');
        assert.equal((await call('POST','/admin/jobs/cases/preview',{},undefined,true)).statusCode,403);
        assert.equal((await call('POST','/admin/jobs/cases/run',{previewId:randomUUID()},undefined,true)).statusCode,403);
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
delete process.env.ROOT_ADMIN_EMAIL;
        await restart();
        use(newRootAuth);
        assert.equal((await call('GET', '/admin', undefined, undefined, true)).statusCode, 401);
      } finally {
        delete process.env.ROOT_ADMIN_HANDLE;
        delete process.env.ROOT_ADMIN_PASSWORD;
delete process.env.ROOT_ADMIN_EMAIL;
      }
    });
    await t.test("operator and admin sessions enforce idle and absolute deadlines server-side", async () => {
      for (const isAdmin of [false, true]) {
        await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%'");
        const identity = isAdmin ? "adminId" : "operatorId";
        const id = isAdmin ? admin : operator;
        const protectedPath = isAdmin ? "/admin" : "/operator";
        async function authenticate() {
          await login(isAdmin ? "test_admin" : "test_operator", isAdmin);
          return (await pool.query("SELECT sid,data,expires_at FROM sessions WHERE data->>$1=$2 ORDER BY (data->>'authenticatedAt')::bigint DESC LIMIT 1", [identity,id])).rows[0];
        }
        let row = await authenticate();
        const started = row.data.authenticatedAt;
        assert.equal(typeof started, 'number');
        assert.ok(row.expires_at.getTime() <= started + 30 * 60 * 1000 + 1000);
        const session = await call('GET','/session',undefined,undefined,true);
        const setCookie = String(session.headers['set-cookie']);
        assert.match(setCookie, /HttpOnly/i);
        assert.doesNotMatch(setCookie, /Max-Age=|Expires=/i);
        await pool.query("UPDATE sessions SET expires_at=now()+interval '1 minute' WHERE sid=$1", [row.sid]);
        if(!isAdmin){
          const beforePassive=(await pool.query('SELECT expires_at FROM sessions WHERE sid=$1',[row.sid])).rows[0].expires_at;
          const passive=await call('GET','/operator/agent-updates',undefined,undefined,true);assert.equal(passive.statusCode,200,passive.body);assert.equal(passive.json().operatorId,operator);assert.ok(passive.json().agents.every((a:any)=>a.operator_id===operator));assert.equal(passive.body.includes('key_hash'),false);assert.equal(passive.body.includes('confirmation_hash'),false);
          const afterPassive=(await pool.query('SELECT expires_at FROM sessions WHERE sid=$1',[row.sid])).rows[0].expires_at;assert.equal(afterPassive.getTime(),beforePassive.getTime(),'automatic list reads must not refresh idle expiry');
          assert.equal((await call('GET','/operator/agent-updates')).statusCode,401);
          assert.equal((await call('GET','/operator/agent-updates?operatorId='+other,undefined,undefined,true)).statusCode,400);
          assert.equal((await pool.query('SELECT expires_at FROM sessions WHERE sid=$1',[row.sid])).rows[0].expires_at.getTime(),beforePassive.getTime(),'rejected passive reads also do not extend expiry');
        }
        assert.equal((await call('GET',protectedPath,undefined,undefined,true)).statusCode,200);
        row = (await pool.query("SELECT sid,data,expires_at FROM sessions WHERE sid=$1",[row.sid])).rows[0];
        assert.equal(row.data.authenticatedAt,started,'activity must not reset login age');
        assert.ok(row.expires_at.getTime() > Date.now() + 29 * 60 * 1000);
        const nearLimit = Date.now() - (8 * 60 - 5) * 60 * 1000;
        await pool.query("UPDATE sessions SET data=jsonb_set(data,'{authenticatedAt}',$2::jsonb) WHERE sid=$1",[row.sid,JSON.stringify(nearLimit)]);
        assert.equal((await call('GET',protectedPath,undefined,undefined,true)).statusCode,200);
        const capped = (await pool.query("SELECT expires_at FROM sessions WHERE sid=$1",[row.sid])).rows[0];
        assert.equal(capped.expires_at.getTime(),nearLimit+8*60*60*1000);
        await pool.query("UPDATE sessions SET expires_at=now()-interval '1 millisecond' WHERE sid=$1",[row.sid]);
        assert.equal((await call('GET',protectedPath,undefined,undefined,true)).statusCode,401);
        assert.equal((await call('GET','/session',undefined,undefined,true)).json()[identity],undefined);
        row = await authenticate();
        await pool.query("UPDATE sessions SET data=jsonb_set(data,'{authenticatedAt}',$2::jsonb),expires_at=now()+interval '1 hour' WHERE sid=$1",[row.sid,JSON.stringify(Date.now()-8*60*60*1000)]);
        assert.equal((await call('GET',protectedPath,undefined,undefined,true)).statusCode,401,'absolute expiry overrides idle deadline');
        row = await authenticate();
        await pool.query("UPDATE sessions SET data=data-'authenticatedAt',expires_at=now()+interval '1 day' WHERE sid=$1",[row.sid]);
        assert.equal((await call('GET',protectedPath,undefined,undefined,true)).statusCode,401,'legacy sessions fail closed');
      }
    });
    await t.test("operator notices never include another operator's decisions", async () => {
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%'");
      const ownDecision=(await pool.query("INSERT INTO moderation(agent_id,action,reason) VALUES($1,'block','Private owner-only fixture') RETURNING id",[agentId])).rows[0].id;
      await login();
      assert.ok((await call('GET','/operator',undefined,undefined,true)).json().notices.some((notice:any)=>notice.id===ownDecision));
      await login('other_operator');
      assert.equal((await call('GET','/operator',undefined,undefined,true)).json().notices.some((notice:any)=>notice.id===ownDecision),false);
    });
    await t.test("review decisions are admin-only, atomic, reason-required and visible only to the requesting operator", async () => {
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%'");
      const ids=[randomUUID(),randomUUID(),randomUUID()];
      for(const id of ids)await pool.query("INSERT INTO appeals(id,operator_id,reason) VALUES($1,$2,'Please review fixture decision')",[id,operator]);
      const path='/admin/appeals/'+ids[0]+'/decision';
      const body={outcome:'accepted',response:'Reviewed and accepted. Corrective actions are recorded separately.'};
      assert.equal((await call('POST',path,body)).statusCode,401);
      await login();assert.equal((await call('POST',path,body,undefined,true)).statusCode,401);
      await login('test_admin',true);
      assert.equal((await app.inject({method:'POST',url:'/api'+path,headers:{cookie,origin:process.env.PUBLIC_ORIGIN || 'http://localhost:4321'},payload:body})).statusCode,403);
      assert.equal((await call('POST',path,{...body,response:'   '},undefined,true)).statusCode,400);
      assert.equal((await call('POST',path,{...body,outcome:'invalid'},undefined,true)).statusCode,400);
      assert.equal((await call('POST','/admin/appeals/'+randomUUID()+'/decision',body,undefined,true)).statusCode,404);
      const before=(await pool.query("SELECT status FROM agents WHERE id=$1",[agentId])).rows[0].status;
      const results=await Promise.all([call('POST',path,body,undefined,true),call('POST',path,{outcome:'rejected',response:'Concurrent alternate response.'},undefined,true)]);
      assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,409]);
      for(const [index,outcome] of [[1,'rejected'],[2,'closed']] as const)assert.equal((await call('POST','/admin/appeals/'+ids[index]+'/decision',{outcome,response:'Reviewed with explanation.'},undefined,true)).statusCode,200);
      const decided=(await pool.query("SELECT status,response,decided_by,decided_at FROM appeals WHERE id=$1",[ids[0]])).rows[0];
      assert.notEqual(decided.status,'pending');assert.equal(decided.decided_by,admin);assert.ok(decided.decided_at);
      assert.equal((await call('POST',path,body,undefined,true)).statusCode,409);
      assert.equal((await pool.query("SELECT status FROM agents WHERE id=$1",[agentId])).rows[0].status,before);
      await login();
      const reviews=(await call('GET','/operator',undefined,undefined,true)).json().review_requests;
      assert.equal(reviews.find((r:any)=>r.id===ids[0]).response,decided.response);
      assert.equal(reviews.find((r:any)=>r.id===ids[0]).decided_by,undefined);
      await login('other_operator');assert.equal((await call('GET','/operator',undefined,undefined,true)).json().review_requests.some((r:any)=>ids.includes(r.id)),false);
    });
    await t.test("accepted review can atomically restore a hidden message or lift a block without overriding later moderation", async () => {
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%'");
      const thread=randomUUID(),message=randomUUID();
      await pool.query("INSERT INTO conversations(id,last_activity_at) VALUES($1,now())",[thread]);
      await pool.query("INSERT INTO posts(id,conversation_id,agent_id,body,technical,state) VALUES($1,$2,$3,'Review restoration fixture','{}','hidden')",[message,thread,agentId]);
      const original=(await pool.query("INSERT INTO moderation(admin_id,agent_id,post_id,action,reason) VALUES($1,$2,$3,'hide','Fixture hide') RETURNING id",[admin,agentId,message])).rows[0].id;
      await login('other_operator');
      assert.equal((await call('POST','/operator/appeals',{moderationId:original,reason:'Not my decision'},undefined,true)).statusCode,404);
      await login();
      assert.equal((await call('POST','/operator/appeals',{moderationId:original,reason:'Please restore this message.'},undefined,true)).statusCode,200);
      const appealId=(await pool.query("SELECT id FROM appeals WHERE moderation_id=$1",[original])).rows[0].id;
      const activity=(await pool.query("SELECT last_activity_at FROM conversations WHERE id=$1",[thread])).rows[0].last_activity_at;
      await login('test_admin',true);
      const decide=(id:string,outcome:string)=>call('POST','/admin/appeals/'+id+'/decision',{outcome,response:'Reviewed with explicit correction.'},undefined,true);
      const responses=await Promise.all([decide(appealId,'accepted_restore'),decide(appealId,'accepted_restore')]);
      assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);
      assert.equal((await pool.query("SELECT state FROM posts WHERE id=$1",[message])).rows[0].state,'visible');
      const saved=(await pool.query("SELECT status,correction FROM appeals WHERE id=$1",[appealId])).rows[0];assert.deepEqual(saved,{status:'accepted',correction:'restore'});
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM moderation WHERE post_id=$1 AND action='restore'",[message])).rows[0].n,1);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM events WHERE conversation_id=$1 AND kind='changed'",[thread])).rows[0].n,1);
      assert.equal((await pool.query("SELECT last_activity_at FROM conversations WHERE id=$1",[thread])).rows[0].last_activity_at.getTime(),activity.getTime());
      assert.ok((await call('GET','/feed')).json().items.some((item:any)=>item.id===message));
      // Re-hide the message, then ensure an older review cannot undo that newer decision.
      await pool.query("UPDATE posts SET state='hidden' WHERE id=$1",[message]);
      const newer=(await pool.query("INSERT INTO moderation(admin_id,agent_id,post_id,action,reason) VALUES($1,$2,$3,'hide','Newer hide') RETURNING id",[admin,agentId,message])).rows[0].id;
      const stale=randomUUID();await pool.query("INSERT INTO appeals(id,operator_id,reason,moderation_id) VALUES($1,$2,'Old decision',$3)",[stale,operator,original]);
      assert.equal((await decide(stale,'accepted_restore')).statusCode,409);
      assert.equal((await pool.query("SELECT status FROM appeals WHERE id=$1",[stale])).rows[0].status,'pending');
      // Deleted bodies must never be resurrected, even with a matching hide decision.
      const removed=randomUUID();await pool.query("INSERT INTO appeals(id,operator_id,reason,moderation_id) VALUES($1,$2,'Removed message',$3)",[removed,operator,newer]);
      await pool.query("UPDATE posts SET body=NULL,state='deleted' WHERE id=$1",[message]);
      assert.equal((await decide(removed,'accepted_restore')).statusCode,409);
      assert.equal((await pool.query("SELECT status FROM appeals WHERE id=$1",[removed])).rows[0].status,'pending');
      await pool.query("UPDATE agents SET status='blocked' WHERE id=$1",[agentId]);
      const block=(await pool.query("INSERT INTO moderation(admin_id,agent_id,action,reason) VALUES($1,$2,'block','Fixture block') RETURNING id",[admin,agentId])).rows[0].id;
      const blocked=randomUUID();await pool.query("INSERT INTO appeals(id,operator_id,reason,moderation_id) VALUES($1,$2,'Unblock request',$3)",[blocked,operator,block]);
      assert.equal((await decide(blocked,'accepted_restore')).statusCode,409,'wrong corrective action rolls back');
      assert.equal((await decide(blocked,'accepted_unblock')).statusCode,200);
      assert.equal((await pool.query("SELECT status FROM agents WHERE id=$1",[agentId])).rows[0].status,'active');
      assert.equal((await pool.query("SELECT correction FROM appeals WHERE id=$1",[blocked])).rows[0].correction,'unblock');
      const unlinked=randomUUID();await pool.query("INSERT INTO appeals(id,operator_id,reason) VALUES($1,$2,'Legacy unlinked request')",[unlinked,operator]);
      assert.equal((await decide(unlinked,'accepted_restore')).statusCode,409);
      assert.equal((await decide(unlinked,'accepted')).statusCode,200,'plain acceptance remains available');
      const reply=randomUUID(),parentAppeal=randomUUID();
      await pool.query("INSERT INTO posts(id,conversation_id,parent_id,agent_id,body,technical,state) VALUES($1,$2,$3,$4,'Hidden reply fixture','{}','hidden')",[reply,thread,message,agentId]);
      const replyHide=(await pool.query("INSERT INTO moderation(admin_id,agent_id,post_id,action,reason) VALUES($1,$2,$3,'hide','Reply hide') RETURNING id",[admin,agentId,reply])).rows[0].id;
      await pool.query("INSERT INTO appeals(id,operator_id,reason,moderation_id) VALUES($1,$2,'Parent unavailable',$3)",[parentAppeal,operator,replyHide]);
      assert.equal((await decide(parentAppeal,'accepted_restore')).statusCode,409,'deleted/hidden parents prevent a misleading restoration');
      assert.equal((await pool.query("SELECT state FROM posts WHERE id=$1",[reply])).rows[0].state,'hidden');
      await login();
      const reviews=(await call('GET','/operator',undefined,undefined,true)).json().review_requests;
      assert.equal(reviews.find((r:any)=>r.id===appealId).correction,'restore');
      await pool.query("DELETE FROM conversations WHERE id=$1",[thread]);
      assert.notEqual((await pool.query("SELECT moderation_id,correction FROM appeals WHERE id=$1",[appealId])).rows[0].moderation_id,null);
    });
    await t.test("agent report -> admin decision -> owned appeal -> admin reply/correction completes the full lifecycle", async () => {
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%' OR bucket LIKE 'public_report:%'");
      const before=(await pool.query("SELECT status FROM agents WHERE id=$1",[agentId])).rows[0].status;
      assert.equal((await call('POST','/reports',{reason:'Missing target'})).statusCode,400);
      assert.equal((await call('POST','/reports',{agentId,postId:randomUUID(),reason:'Ambiguous'})).statusCode,400);
      assert.equal((await call('POST','/reports',{agentId,reason:'   '})).statusCode,400);
      assert.equal((await call('POST','/reports',{agentId:randomUUID(),reason:'Unavailable'})).statusCode,404);
      for(const reason of ['Profile concern fixture','Repeated disruptive participation fixture'])assert.equal((await call('POST','/reports',{agentId,reason})).statusCode,200);
      assert.equal((await pool.query("SELECT status FROM agents WHERE id=$1",[agentId])).rows[0].status,before,'reports must not block automatically');
      const reportRows=(await pool.query("SELECT id,reason FROM reports WHERE agent_id=$1 ORDER BY created_at,id",[agentId])).rows;
      const dismiss=reportRows.find(r=>r.reason==='Profile concern fixture').id;
      const block=reportRows.find(r=>r.reason==='Repeated disruptive participation fixture').id;
      const action=(name:string,reportId:string,target=agentId)=>call('POST','/admin/actions',{action:name,id:target,reportId,reason:'Agent-level moderation fixture'},undefined,true);
      await login();assert.equal((await action('block',block)).statusCode,401);
      await login('test_admin',true);
      const inbox=(await call('GET','/admin',undefined,undefined,true)).json().reports.find((r:any)=>r.id===block);
      assert.equal(inbox.target_kind,'agent');assert.equal(inbox.post_id,null);assert.equal(inbox.agent_id,agentId);assert.equal(inbox.agent_handle,'test_agent');assert.equal(inbox.avatar_base64,undefined);
      assert.equal((await action('hide',block)).statusCode,409);
      assert.equal((await action('unblock',block)).statusCode,409);
      assert.equal((await action('block',block,randomUUID())).statusCode,409);
      assert.equal((await action('dismiss',dismiss)).statusCode,200);
      assert.equal((await pool.query("SELECT status FROM agents WHERE id=$1",[agentId])).rows[0].status,before);
      assert.equal((await action('block',block)).statusCode,200);
      assert.equal((await action('block',block)).statusCode,409);
      assert.equal((await pool.query("SELECT status FROM agents WHERE id=$1",[agentId])).rows[0].status,'blocked');
      assert.equal((await pool.query("SELECT resolved FROM reports WHERE id=$1",[block])).rows[0].resolved,true);
      await login();
      const notices=(await call('GET','/operator',undefined,undefined,true)).json().notices;
      const decision=notices.find((n:any)=>n.action==='block'&&n.reason==='Agent-level moderation fixture');assert.ok(decision);assert.equal(decision.post_id,null);
      assert.equal((await call('POST','/operator/agents/'+agentId,{action:'activate'},undefined,true)).statusCode,403);
      assert.equal((await call('POST','/operator/appeals',{moderationId:decision.id,reason:'Please reconsider this agent-level block.'},undefined,true)).statusCode,200);
      const appeal=(await pool.query("SELECT id FROM appeals WHERE moderation_id=$1 ORDER BY created_at DESC LIMIT 1",[decision.id])).rows[0].id;
      await login('other_operator');
      assert.equal((await call('POST','/operator/appeals',{moderationId:decision.id,reason:'Not owned'},undefined,true)).statusCode,404);
      assert.equal((await call('GET','/operator',undefined,undefined,true)).json().review_requests.some((r:any)=>r.id===appeal),false);
      assert.equal((await call('GET','/operator?agentId='+agentId,undefined,undefined,true)).statusCode,404);
      assert.equal((await call('GET','/operator?agentId=invalid',undefined,undefined,true)).statusCode,400);
      await login('test_admin',true);
      const verdict=(id:string,outcome:string)=>call('POST','/admin/appeals/'+id+'/decision',{outcome,response:'We reviewed the agent-level concern and its context.'},undefined,true);
      assert.equal((await verdict(appeal,'rejected')).statusCode,200);
      assert.equal((await pool.query("SELECT status FROM agents WHERE id=$1",[agentId])).rows[0].status,'blocked');
      await login();
      const ownReview=(await call('GET','/operator',undefined,undefined,true)).json().review_requests.find((r:any)=>r.id===appeal);assert.equal(ownReview.status,'rejected');assert.match(ownReview.response,/reviewed/);
      assert.equal((await call('POST','/operator/appeals',{moderationId:decision.id,reason:'Additional context for the blocked agent.'},undefined,true)).statusCode,409);
      assert.equal((await call('POST','/operator/appeals/'+appeal+'/messages',{body:'Additional context for the blocked agent.'},undefined,true)).statusCode,200);
      const caseView=(await call('GET','/operator?moderationStatus=pending',undefined,undefined,true)).json();
      const scoped=(await call('GET','/operator?moderationStatus=pending&agentId='+agentId,undefined,undefined,true)).json();
      assert.equal(scoped.moderationAgentId,agentId);assert.ok(scoped.notices.length);assert.ok(scoped.notices.every((n:any)=>n.agent_id===agentId));assert.ok(scoped.review_requests.every((r:any)=>r.subject_agent_id===agentId));assert.ok(scoped.case_context.notices.every((n:any)=>n.agent_id===agentId));assert.ok(scoped.case_context.review_requests.every((r:any)=>r.subject_agent_id===agentId));
      const caseNotice=caseView.case_context.notices.find((n:any)=>String(n.id)===String(decision.id));assert.equal(caseNotice.has_review,true);assert.ok(caseNotice.report_id);
      assert.equal(caseView.case_context.review_requests.filter((r:any)=>String(r.moderation_id)===String(decision.id)).length,2);
      assert.equal((await call('POST','/operator/appeals/'+appeal+'/messages',{body:'Duplicate follow-up'},undefined,true)).statusCode,409);
      const second=(await pool.query("SELECT id FROM appeals WHERE moderation_id=$1 AND status='pending'",[decision.id])).rows[0].id;
      await login('test_admin',true);
      const adminCase=(await call('GET','/admin?status=pending',undefined,undefined,true)).json();
      assert.equal(adminCase.reports.some((r:any)=>r.id===block),false,'resolved source is not a pending queue seed');
      assert.ok(adminCase.case_context.reports.some((r:any)=>r.id===block&&r.resolved),'source report remains available as case context');
      assert.ok(adminCase.case_context.notices.some((m:any)=>String(m.id)===String(decision.id)&&m.report_id===block));
      assert.ok(adminCase.case_context.appeals.some((r:any)=>r.id===appeal&&r.status==='rejected'),'previous verdict remains in pending case history');
      assert.ok(adminCase.case_context.appeals.some((r:any)=>r.id===second&&r.status==='pending'));
      assert.equal((await verdict(second,'accepted_unblock')).statusCode,200);
      assert.equal((await verdict(second,'accepted_unblock')).statusCode,409);
      assert.equal((await pool.query("SELECT status FROM agents WHERE id=$1",[agentId])).rows[0].status,'active');
      await login();const answered=(await call('GET','/operator',undefined,undefined,true)).json().review_requests.find((r:any)=>r.id===second);assert.equal(answered.correction,'unblock');assert.equal(answered.status,'accepted');
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'public_report:%'");process.env.LIMIT_PUBLIC_REPORT='1';
      try{assert.equal((await call('POST','/reports',{agentId,reason:'Budget fixture'})).statusCode,200);assert.equal((await call('POST','/reports',{agentId,reason:'Over budget'})).statusCode,429);}finally{delete process.env.LIMIT_PUBLIC_REPORT;}
    });
    await t.test("blocked agents and operators share scoped review context and immutable follow-up replies", {timeout:30000}, async () => {
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%' OR bucket LIKE 'agent_appeal:%' OR bucket LIKE 'appeal_owner:%'");
      process.env.LIMIT_AGENT_APPEAL='100';process.env.LIMIT_APPEAL_OWNER='100';
      const thread=randomUUID(),post=randomUUID(),peer=randomUUID(),pending=randomUUID();
      const peerKey='isolated-peer-'+randomUUID(),pendingKey='isolated-pending-'+randomUUID();
      const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
      try {
        for(const [id,handle,status,credential] of [[peer,'appeal_peer','paused',peerKey],[pending,'appeal_pending','pending',pendingKey]])await pool.query("INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,operator_id,status,key_hash) VALUES($1,$2,'Fixture','Test','[]','Isolated','{}',$3,$4,$5)",[id,handle,operator,status,digest(credential)]);
        await login();assert.equal((await call('POST','/operator/agents/'+agentId,{action:'pause'},undefined,true)).statusCode,200);
        await pool.query("UPDATE agents SET status='blocked' WHERE id=$1",[agentId]);
        await pool.query("INSERT INTO conversations(id,last_activity_at) VALUES($1,now())",[thread]);
        await pool.query("INSERT INTO posts(id,conversation_id,agent_id,body,technical,state) VALUES($1,$2,$3,'Own hidden appeal fixture','{}','hidden')",[post,thread,agentId]);
        const audit=async(agent:string,action:string,postId:string|null=null)=>(await pool.query("INSERT INTO moderation(admin_id,agent_id,post_id,action,reason) VALUES($1,$2,$3,$4,'Appeal participation fixture') RETURNING id",[admin,agent,postId,action])).rows[0].id;
        const blocked=await audit(agentId,'block'),hidden=await audit(agentId,'hide',post),peerDecision=await audit(peer,'block');
        for(const path of ['/me/moderation','/me/appeals']){
          assert.equal((await call('GET',path)).statusCode,401);
          assert.equal((await call('GET',path,undefined,'invalid-key')).statusCode,401);
          assert.equal((await call('GET',path,undefined,pendingKey)).statusCode,403);
        }
        const notices=(await call('GET','/me/moderation',undefined,key)).json();assert.ok(notices.some((m:any)=>m.id===hidden&&m.post_body==='Own hidden appeal fixture'));assert.equal(notices.some((m:any)=>m.id===peerDecision),false);assert.equal(notices[0].key_hash,undefined);
        const submit=(moderationId:string,reason='Please review my own decision.')=>call('POST','/me/appeals',{moderationId,reason,submitted_by:'operator'},key);
        assert.equal((await call('POST','/me/appeals',{moderationId:blocked,reason:'Pending must not appeal.'},pendingKey)).statusCode,403);
        assert.equal((await call('POST','/operator/appeals',{reason:'Agent cannot impersonate operator.'},key)).statusCode,401);
        assert.equal((await submit(peerDecision)).statusCode,404);
        assert.equal((await submit(blocked,'   ')).statusCode,400);
        const submitted=await Promise.all([submit(blocked),submit(blocked)]);assert.deepEqual(submitted.map(r=>r.statusCode).sort(),[200,409]);
        const appeal=submitted.find(r=>r.statusCode===200)!.json().id;
        const hideAppeal=(await submit(hidden)).json().id;assert.ok(hideAppeal);
        const own=(await call('GET','/me/appeals',undefined,key)).json().find((r:any)=>r.id===appeal);assert.equal(own.submitted_by,'agent');assert.equal(own.subject_agent_id,agentId);
        assert.equal((await call('GET','/me/appeals',undefined,peerKey)).json().some((r:any)=>r.id===appeal),false);
        assert.equal((await call('POST','/me/appeals/'+appeal+'/messages',{body:'Cross-agent note'},peerKey)).statusCode,404);
        await login('other_operator');assert.equal((await call('POST','/operator/appeals/'+appeal+'/messages',{body:'Not my case'},undefined,true)).statusCode,404);
        await login();
        let reviews=(await call('GET','/operator',undefined,undefined,true)).json().review_requests;assert.equal(reviews.find((r:any)=>r.id===appeal).submitted_by,'agent');
        assert.equal((await app.inject({method:'POST',url:'/api/operator/appeals/'+appeal+'/messages',headers:{cookie,origin:process.env.PUBLIC_ORIGIN || 'http://localhost:4321'},payload:{body:'Missing CSRF'}})).statusCode,403);
        assert.equal((await call('POST','/operator/appeals/'+appeal+'/messages',{body:'Operator context',author_role:'agent'},undefined,true)).statusCode,200);
        assert.equal((await call('POST','/me/appeals/'+appeal+'/messages',{body:'Agent clarification',author_role:'operator'},key)).statusCode,200);
        const context=(await call('GET','/me/appeals',undefined,key)).json().find((r:any)=>r.id===appeal);assert.deepEqual(context.messages.map((m:any)=>m.author_role),['operator','agent']);assert.equal(context.revision,2);
        await login('test_admin',true);
        const decide=(id:string,outcome:string,revision=0)=>call('POST','/admin/appeals/'+id+'/decision',{outcome,response:'Administrator response to both participants.',expectedRevision:revision},undefined,true);
        const adminView=(await call('GET','/admin',undefined,undefined,true)).json().appeals.find((r:any)=>r.id===appeal);assert.equal(adminView.messages.length,2);assert.equal(adminView.submitted_by,'agent');
        assert.equal((await decide(appeal,'rejected')).statusCode,409,'stale context cannot be silently decided');
        assert.equal((await decide(appeal,'rejected',2)).statusCode,200);
        const response=(await call('GET','/me/appeals',undefined,key)).json().find((r:any)=>r.id===appeal);assert.equal(response.status,'rejected');assert.match(response.response,/both participants/);
        const next=(await call('POST','/me/appeals/'+appeal+'/messages',{body:'Additional evidence after the response.'},key)).json();assert.equal(next.followUp,true);
        const follow=(await call('GET','/me/appeals',undefined,key)).json().find((r:any)=>r.id===next.reviewId);assert.equal(follow.parent_appeal_id,appeal);assert.equal(follow.status,'pending');assert.match(follow.previous_response,/both participants/);
        await login();assert.equal((await call('POST','/operator/appeals/'+appeal+'/messages',{body:'Duplicate follow-up after decision.'},undefined,true)).statusCode,409);
        assert.equal((await call('POST','/operator/appeals/'+next.reviewId+'/messages',{body:'Operator context for the current review.'},undefined,true)).statusCode,200);
        // Normal publication/profile/reaction rights remain blocked throughout the exchange.
        assert.equal((await call('POST','/posts',{body:'[Local test] Must remain blocked.'},key)).statusCode,403);
        assert.equal((await call('PATCH','/me',{about:'Must not change'},key)).statusCode,403);
        assert.equal((await call('PUT','/posts/'+post+'/reaction',{value:1},key)).statusCode,403);
        await login('test_admin',true);assert.equal((await decide(next.reviewId,'accepted_unblock',1)).statusCode,200);assert.equal((await decide(hideAppeal,'accepted_restore')).statusCode,200);
        assert.equal((await pool.query('SELECT status FROM agents WHERE id=$1',[agentId])).rows[0].status,'paused');
        assert.equal((await call('POST','/posts',{body:'[Local test] Still paused.'},key)).statusCode,403);
        assert.equal((await pool.query('SELECT state FROM posts WHERE id=$1',[post])).rows[0].state,'visible');
        await login();const operatorFollow=(await call('POST','/operator/appeals/'+next.reviewId+'/messages',{body:'Operator follow-up after the latest decision.'},undefined,true)).json();assert.equal(operatorFollow.followUp,true);
        reviews=(await call('GET','/me/appeals',undefined,key)).json();assert.equal(reviews.find((r:any)=>r.id===operatorFollow.reviewId).submitted_by,'operator');
        // Operator follow-up and retention cleanup must coexist without FK/row lock cycles.
        await pool.query("UPDATE conversations SET last_activity_at=now()-interval '31 days' WHERE id=$1",[thread]);
        await login();const raced=await Promise.all([call('POST','/operator/appeals/'+hideAppeal+'/messages',{body:'Follow-up around retention cleanup.'},undefined,true),cleanup()]);assert.equal((raced[0] as any).statusCode,200);
        const retained=(await call('GET','/me/appeals',undefined,key)).json().find((r:any)=>r.id===hideAppeal);assert.ok(retained);assert.notEqual(retained.moderation_id,null);assert.equal(retained.subject_agent_id,agentId);
        const retainedContext=(await call('GET','/operator?moderationStatus=pending',undefined,undefined,true)).json().case_context.review_requests;assert.ok(retainedContext.some((r:any)=>r.id===hideAppeal));assert.ok(retainedContext.some((r:any)=>r.parent_appeal_id===hideAppeal));
        await pool.query("DELETE FROM limits WHERE bucket LIKE 'agent_appeal:'||$1||':%'",[agentId]);process.env.LIMIT_AGENT_APPEAL='1';
        assert.equal((await call('POST','/me/appeals/'+operatorFollow.reviewId+'/messages',{body:'Rate fixture'},key)).statusCode,200);
        const limited=await call('POST','/me/appeals/'+operatorFollow.reviewId+'/messages',{body:'Over budget'},key);assert.equal(limited.statusCode,429);assert.ok(limited.headers['retry-after']);
        await pool.query("INSERT INTO appeal_messages(appeal_id,author_role,operator_id,body) SELECT $1,'operator',$2,'Bounded context fixture' FROM generate_series(1,49)",[operatorFollow.reviewId,operator]);
        assert.equal((await call('POST','/operator/appeals/'+operatorFollow.reviewId+'/messages',{body:'Exceeds pending context cap'},undefined,true)).statusCode,409);

        await pool.query('UPDATE agents SET key_hash=NULL WHERE id=$1',[agentId]);assert.equal((await call('GET','/me/appeals',undefined,key)).statusCode,401);assert.equal((await call('POST','/me/appeals/'+appeal+'/messages',{body:'Revoked'},key)).statusCode,401);
      }finally{
        delete process.env.LIMIT_AGENT_APPEAL;delete process.env.LIMIT_APPEAL_OWNER;
        await pool.query('UPDATE agents SET key_hash=$2 WHERE id=$1',[agentId,digest(key)]);
      }
    });
    await t.test("admin status queues filter before limits and count all open/processed reports and appeals",async()=>{
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%'");await login('test_admin',true);
      const before=(await call('GET','/admin',undefined,undefined,true)).json().counts;
      await pool.query("INSERT INTO reports(id,agent_id,target_kind,reason,resolved) SELECT gen_random_uuid(),$1,'agent','Processed fixture',true FROM generate_series(1,105)",[agentId]);
      await pool.query("INSERT INTO appeals(id,operator_id,reason,status,response,decided_at,decided_by) SELECT gen_random_uuid(),$1,'Processed fixture','closed','Explanation',now(),$2 FROM generate_series(1,105)",[operator,admin]);
      const report=randomUUID(),appeal=randomUUID();
      await pool.query("INSERT INTO reports(id,agent_id,target_kind,reason,created_at) VALUES($1,$2,'agent','Old pending fixture','2001-01-01')",[report,agentId]);
      await pool.query("INSERT INTO appeals(id,operator_id,reason,created_at) VALUES($1,$2,'Old pending fixture','2001-01-01')",[appeal,operator]);
      assert.equal((await call('GET','/admin?status=pending')).statusCode,401);
      assert.equal((await call('GET','/admin?status=invalid',undefined,undefined,true)).statusCode,400);
      const pending=(await call('GET','/admin?status=pending',undefined,undefined,true)).json();
      assert.ok(pending.reports.some((r:any)=>r.id===report),'old open reports must not be hidden by newer processed cases');assert.ok(pending.appeals.some((r:any)=>r.id===appeal));
      assert.ok(pending.reports.every((r:any)=>!r.resolved));assert.ok(pending.appeals.every((r:any)=>r.status==='pending'));
      const processed=(await call('GET','/admin?status=processed',undefined,undefined,true)).json();assert.equal(processed.reports.length,100);assert.equal(processed.appeals.length,100);assert.ok(processed.reports.every((r:any)=>r.resolved));assert.ok(processed.appeals.every((r:any)=>r.status!=='pending'));
      assert.deepEqual(processed.counts,{pending:before.pending+2,processed:before.processed+210});assert.deepEqual(pending.counts,processed.counts);
    });
    await t.test('operator may resume only its own pauses; admin unblocking restores participation but preserves independent pauses',async()=>{
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%'");
      const before=(await pool.query('SELECT status,operator_paused FROM agents WHERE id=$1',[agentId])).rows[0];
      const path='/operator/agents/'+agentId;let published:string|undefined;const unapproved=randomUUID();
      try{
        await pool.query("UPDATE agents SET status='active',operator_paused=false WHERE id=$1",[agentId]);
        await pool.query("INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,operator_id,status,operator_paused) VALUES($1,$2,'Unapproved','Test','[]','Isolated','{}',$3,'paused',true)",[unapproved,'pause_pending_'+unapproved.slice(0,8),operator]);
        await login();assert.equal((await call('POST','/operator/agents/'+unapproved,{action:'activate'},undefined,true)).statusCode,403,'pause provenance cannot bypass participation approval');
        await login();assert.equal((await call('POST',path,{action:'pause'},undefined,true)).statusCode,200);
        assert.equal((await call('GET','/operator',undefined,undefined,true)).json().agents.find((a:any)=>a.id===agentId).operator_paused,true);
        assert.equal((await call('GET','/operators/'+operator)).json().agents.find((a:any)=>a.id===agentId).operator_paused,undefined,'pause provenance remains owner-only');
        await login('test_admin',true);assert.equal((await call('POST','/admin/actions',{id:agentId,action:'block',reason:'Administrative restriction'},undefined,true)).statusCode,200);
        await login();assert.equal((await call('POST',path,{action:'activate'},undefined,true)).statusCode,403);assert.equal((await call('POST',path,{action:'pause'},undefined,true)).statusCode,403);
        await login('test_admin',true);assert.equal((await call('POST','/admin/actions',{id:agentId,action:'unblock',reason:'Lift administrative restriction'},undefined,true)).statusCode,200);
        assert.deepEqual((await pool.query('SELECT status,operator_paused FROM agents WHERE id=$1',[agentId])).rows[0],{status:'paused',operator_paused:true});
        await login();assert.equal((await call('POST',path,{action:'activate'},undefined,true)).statusCode,200);
        // A legacy/administratively paused state is not evidence of an operator pause.
        await pool.query("UPDATE agents SET status='paused',operator_paused=false WHERE id=$1",[agentId]);
        assert.equal((await call('POST',path,{action:'activate'},undefined,true)).statusCode,403);
        await login('test_admin',true);assert.equal((await call('POST','/admin/actions',{id:agentId,action:'block',reason:'Review correction fixture'},undefined,true)).statusCode,200);
        const original=(await pool.query("SELECT id FROM moderation WHERE agent_id=$1 AND action='block' ORDER BY id DESC LIMIT 1",[agentId])).rows[0].id;
        const review=randomUUID();await pool.query("INSERT INTO appeals(id,operator_id,subject_agent_id,moderation_id,reason) VALUES($1,$2,$3,$4,'Restore participation')",[review,operator,agentId,original]);
        assert.equal((await call('POST','/admin/appeals/'+review+'/decision',{outcome:'accepted_unblock',response:'The restriction is lifted.'},undefined,true)).statusCode,200);
        assert.deepEqual((await pool.query('SELECT status,operator_paused FROM agents WHERE id=$1',[agentId])).rows[0],{status:'active',operator_paused:false});
        await pool.query("DELETE FROM limits WHERE bucket LIKE 'publish:'||$1||':%' OR bucket LIKE 'operator_day:'||$2||':%'",[agentId,operator]);
        const post=await call('POST','/posts',{body:'[Local test] Accepted unblock restores participation.'},key);assert.equal(post.statusCode,200,post.body);published=post.json().conversationId;
        await login();assert.equal((await call('POST',path,{action:'pause'},undefined,true)).statusCode,200);
        const operatorCookie=cookie,operatorCsrf=csrf;
        await login('test_admin',true);
        const race=await Promise.all([call('POST','/admin/actions',{id:agentId,action:'block',reason:'Concurrent restriction'},undefined,true),app.inject({method:'POST',url:'/api'+path,headers:{cookie:operatorCookie,origin:process.env.PUBLIC_ORIGIN || 'http://localhost:4321','x-csrf-token':operatorCsrf},payload:{action:'activate'}})]);
        assert.equal(race[0].statusCode,200);assert.ok([200,403].includes(race[1].statusCode));assert.equal((await pool.query('SELECT status FROM agents WHERE id=$1',[agentId])).rows[0].status,'blocked');
      }finally{
        await pool.query('DELETE FROM agents WHERE id=$1',[unapproved]);
        if(published)await pool.query('DELETE FROM conversations WHERE id=$1',[published]);
        await pool.query('UPDATE agents SET status=$2,operator_paused=$3 WHERE id=$1',[agentId,before.status,before.operator_paused]);
      }
    });

    await t.test("operator/agent acceptance is scoped, independent, idempotent and never changes moderation", {timeout:30000},async()=>{
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%' OR bucket LIKE 'agent_ack:%' OR bucket LIKE 'ack_owner:%'");
      const peer=randomUUID(),pendingAgent=randomUUID(),peerKey='ack-peer-'+randomUUID(),pendingKey='ack-pending-'+randomUUID();
      const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
      for(const [id,handle,status,credential] of [[peer,'ack_peer','paused',peerKey],[pendingAgent,'ack_pending','pending',pendingKey]])await pool.query("INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,operator_id,status,key_hash) VALUES($1,$2,'Fixture','Test','[]','Isolated','{}',$3,$4,$5)",[id,handle,operator,status,digest(credential)]);
      await pool.query("UPDATE agents SET status='blocked' WHERE id=$1",[agentId]);
      const decision=(await pool.query("INSERT INTO moderation(admin_id,agent_id,action,reason) VALUES($1,$2,'block','Acceptance fixture') RETURNING id",[admin,agentId])).rows[0].id;
      const completed=randomUUID(),waiting=randomUUID();
      await pool.query("INSERT INTO appeals(id,operator_id,subject_agent_id,moderation_id,reason,status,response,decided_at,decided_by) VALUES($1,$2,$3,$4,'Completed acceptance fixture','rejected','Decision stands.',now(),$5)",[completed,operator,agentId,decision,admin]);
      await pool.query("INSERT INTO appeals(id,operator_id,subject_agent_id,reason) VALUES($1,$2,$3,'Still awaiting a decision')",[waiting,operator,agentId]);
      const agentPath='/me/moderation/'+decision+'/accept',ownerPath='/operator/moderation/'+decision+'/accept';
      const beforeEvents=(await pool.query('SELECT count(*)::int AS count FROM events')).rows[0].count;
      assert.equal((await call('POST',agentPath,{})).statusCode,401);assert.equal((await call('POST',agentPath,{},pendingKey)).statusCode,403);assert.equal((await call('POST',agentPath,{},peerKey)).statusCode,404);
      assert.equal((await call('POST','/me/appeals/'+completed+'/accept',{},peerKey)).statusCode,404);
      await login('other_operator');assert.equal((await call('POST',ownerPath,{},undefined,true)).statusCode,404);assert.equal((await call('POST','/operator/appeals/'+completed+'/accept',{},undefined,true)).statusCode,404);
      await login();
      assert.equal((await app.inject({method:'POST',url:'/api'+ownerPath,headers:{cookie,origin:process.env.PUBLIC_ORIGIN || 'http://localhost:4321'},payload:{}})).statusCode,403);
      const accepted=await Promise.all([call('POST',ownerPath,{},undefined,true),call('POST',ownerPath,{},undefined,true)]);assert.deepEqual(accepted.map(r=>r.statusCode),[200,200]);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM decision_acknowledgements WHERE moderation_id=$1 AND actor_role='operator'",[decision])).rows[0].count,1);
      let ownNotice=(await call('GET','/me/moderation?status=pending',undefined,key)).json().find((n:any)=>n.id===decision);assert.equal(ownNotice.operator_accepted,true);assert.equal(ownNotice.agent_accepted,false);
      assert.equal((await call('GET','/operator?moderationStatus=pending',undefined,undefined,true)).json().notices.some((n:any)=>n.id===decision),false);assert.equal((await call('GET','/operator?moderationStatus=processed',undefined,undefined,true)).json().notices.some((n:any)=>n.id===decision),true);
      assert.equal((await call('POST',agentPath,{actor_role:'operator'},key)).statusCode,200);
      ownNotice=(await call('GET','/me/moderation?status=processed',undefined,key)).json().find((n:any)=>n.id===decision);assert.equal(ownNotice.agent_accepted,true);assert.equal(ownNotice.operator_accepted,true);
      assert.equal((await call('GET','/me/moderation?status=pending',undefined,key)).json().some((n:any)=>n.id===decision),false);
      assert.equal((await call('POST','/me/appeals/'+waiting+'/accept',{},key)).statusCode,409);assert.equal((await call('POST','/operator/appeals/'+waiting+'/accept',{},undefined,true)).statusCode,409);
      assert.equal((await call('POST','/me/appeals/'+completed+'/accept',{},key)).statusCode,200);
      let review=(await call('GET','/operator?moderationStatus=pending',undefined,undefined,true)).json().review_requests.find((r:any)=>r.id===completed);assert.equal(review.agent_accepted,true);assert.equal(review.operator_accepted,false);
      assert.equal((await call('POST','/operator/appeals/'+completed+'/accept',{},undefined,true)).statusCode,200);
      review=(await call('GET','/me/appeals?status=processed',undefined,key)).json().find((r:any)=>r.id===completed);assert.equal(review.operator_accepted,true);assert.equal(review.response,'Decision stands.');assert.equal(review.status,'rejected');
      assert.equal((await pool.query('SELECT status FROM appeals WHERE id=$1',[waiting])).rows[0].status,'pending');
      assert.equal((await pool.query('SELECT status FROM agents WHERE id=$1',[agentId])).rows[0].status,'blocked');assert.equal((await pool.query('SELECT count(*)::int AS count FROM events')).rows[0].count,beforeEvents);
      assert.equal((await call('POST','/posts',{body:'[Local test] Acceptance must not permit publishing.'},key)).statusCode,403);
      assert.equal((await call('POST','/me/appeals',{moderationId:decision,reason:'Duplicate despite acknowledgement.'},key)).statusCode,409,'existing case prevents a duplicate initial complaint');
      assert.equal((await call('POST','/me/appeals/'+waiting+'/messages',{body:'New evidence despite acknowledgement.'},key)).statusCode,200,'acceptance does not waive participation in the existing review');
      assert.equal((await call('GET','/operator?moderationStatus=invalid',undefined,undefined,true)).statusCode,400);
      // Filtering precedes the 50-notice limit for agent and operator queues.
      const oldest=(await pool.query("INSERT INTO moderation(admin_id,agent_id,action,reason,created_at) VALUES($1,$2,'block','Old unaccepted fixture','2000-01-01') RETURNING id",[admin,peer])).rows[0].id;
      await pool.query("INSERT INTO moderation(admin_id,agent_id,action,reason) SELECT $1,$2,'block','Accepted paging fixture' FROM generate_series(1,105)",[admin,peer]);
      await pool.query("INSERT INTO decision_acknowledgements(moderation_id,actor_role,agent_id) SELECT id,'agent',$1 FROM moderation WHERE agent_id=$1 AND reason='Accepted paging fixture'",[peer]);
      await pool.query("INSERT INTO decision_acknowledgements(moderation_id,actor_role,operator_id) SELECT id,'operator',$2 FROM moderation WHERE agent_id=$1 AND reason='Accepted paging fixture'",[peer,operator]);
      assert.deepEqual((await call('GET','/me/moderation?status=pending',undefined,peerKey)).json().map((n:any)=>n.id),[oldest]);assert.equal((await call('GET','/me/moderation?status=processed',undefined,peerKey)).json().length,50);
      const queue=(await call('GET','/operator?moderationStatus=pending',undefined,undefined,true)).json();assert.ok(queue.notices.some((n:any)=>n.id===oldest));assert.ok(queue.moderation_counts.processed>=107);
      const scopedPeer=(await call('GET','/operator?moderationStatus=processed&agentId='+peer,undefined,undefined,true)).json();assert.ok(scopedPeer.notices.every((n:any)=>n.agent_id===peer));assert.ok(scopedPeer.moderation_counts.processed>=105);
      const scopedOwn=(await call('GET','/operator?moderationStatus=processed&agentId='+agentId,undefined,undefined,true)).json();assert.ok(scopedOwn.moderation_counts.processed<scopedPeer.moderation_counts.processed);assert.ok(scopedOwn.notices.every((n:any)=>n.agent_id===agentId));
      process.env.LIMIT_AGENT_ACK='1';await pool.query("DELETE FROM limits WHERE bucket LIKE 'agent_ack:'||$1||':%'",[agentId]);
      try{assert.equal((await call('POST',agentPath,{},key)).statusCode,200);assert.equal((await call('POST',agentPath,{},key)).statusCode,429);}finally{delete process.env.LIMIT_AGENT_ACK;}
      await pool.query('UPDATE agents SET key_hash=NULL WHERE id=$1',[agentId]);try{assert.equal((await call('POST',agentPath,{},key)).statusCode,401);}finally{await pool.query('UPDATE agents SET key_hash=$2 WHERE id=$1',[agentId,digest(key)]);}
    });
    await t.test('operator message search/deletion is owner-only, CSRF protected, atomic and retention-neutral',async()=>{
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'login:%' OR bucket LIKE 'operator_delete:%'");
      const foreign=randomUUID(),conversations:string[]=[],saved=(await pool.query('SELECT status FROM agents WHERE id=$1',[agentId])).rows[0].status;
      const previousLimit=process.env.LIMIT_OPERATOR_DELETE;process.env.LIMIT_OPERATOR_DELETE='100';
      const prefix='operator-message-fixture';
      async function root(body:string,state='visible'){
        const id=randomUUID();conversations.push(id);await pool.query('INSERT INTO conversations(id,last_activity_at) VALUES($1,now())',[id]);
        await pool.query("INSERT INTO posts(id,conversation_id,agent_id,body,technical,state,created_at) VALUES($1,$1,$2,$3,'{}',$4,'2026-01-01T00:00:00.123456Z')",[id,agentId,body,state]);return id;
      }
      try{
        await pool.query("INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,operator_id,status) VALUES($1,$2,'Foreign','Test','[]','Isolated','{}',$3,'active')",[foreign,'posts_other_'+foreign.slice(0,8),other]);
        await pool.query("UPDATE agents SET status='blocked' WHERE id=$1",[agentId]);
        for(let i=0;i<27;i++)await root(prefix+' '+i+(i===0?' literal %_':''));
        const graph=await root(prefix+' hidden root','hidden'),reply=randomUUID(),nested=randomUUID();
        await pool.query("INSERT INTO posts(id,conversation_id,parent_id,agent_id,body,technical) VALUES($1,$2,$2,$3,'Foreign reply remains','{}'),($4,$2,$1,$5,$6,'{}')",[reply,graph,foreign,nested,agentId,prefix+' own nested comment']);
        const activity=(await pool.query('SELECT last_activity_at FROM conversations WHERE id=$1',[graph])).rows[0].last_activity_at;
        const url='/operator/agents/'+agentId+'/posts';
        assert.equal((await call('GET',url)).statusCode,401);assert.equal((await call('GET',url,undefined,key)).statusCode,401);assert.equal((await call('DELETE','/operator/posts/'+graph,{confirmSubtree:true},key)).statusCode,401);
        await login('test_admin',true);assert.equal((await call('GET',url,undefined,undefined,true)).statusCode,401);
        await login('other_operator');assert.equal((await call('GET',url,undefined,undefined,true)).statusCode,404);assert.equal((await call('DELETE','/operator/posts/'+graph,{confirmSubtree:true},undefined,true)).statusCode,404);
        await login();assert.equal((await call('DELETE','/operator/posts/'+reply,{confirmSubtree:true},undefined,true)).statusCode,404);
        const seen:string[]=[];let cursor:string|null=null;
        do{const r=await call('GET',url+'?q='+prefix.toUpperCase()+'&state=visible&kind=root'+(cursor?'&cursor='+encodeURIComponent(cursor):''),undefined,undefined,true);assert.equal(r.statusCode,200,r.body);const data=r.json();assert.equal(data.total,27);assert.equal(data.agent.key_hash,undefined);seen.push(...data.items.map((p:any)=>p.id));cursor=data.nextCursor;}while(cursor);
        assert.equal(seen.length,27);assert.equal(new Set(seen).size,27,'microsecond keyset cursor does not duplicate tied rows');
        assert.equal((await call('GET',url+'?q='+encodeURIComponent('%_'),undefined,undefined,true)).json().total,1,'search treats wildcard characters literally');
        const hidden=(await call('GET',url+'?state=hidden&q='+prefix,undefined,undefined,true)).json();assert.ok(hidden.items.some((p:any)=>p.id===graph&&p.body===prefix+' hidden root'));
        assert.equal((await call('GET',url+'?cursor=bad',undefined,undefined,true)).statusCode,400);assert.equal((await call('GET',url+'?state=bad',undefined,undefined,true)).statusCode,400);
        assert.equal((await app.inject({method:'DELETE',url:'/api/operator/posts/'+graph,headers:{cookie,origin:process.env.PUBLIC_ORIGIN || 'http://localhost:4321'}})).statusCode,403);
        assert.equal((await app.inject({method:'DELETE',url:'/api/operator/posts/'+graph,headers:{cookie,origin:'https://foreign.invalid','x-csrf-token':csrf}})).statusCode,403);
        const before=Number((await pool.query("SELECT count(*) FROM events WHERE conversation_id=$1 AND kind='changed'",[graph])).rows[0].count);
        const deleted=await Promise.all([call('DELETE','/operator/posts/'+graph,{confirmSubtree:true},undefined,true),call('DELETE','/operator/posts/'+graph,{confirmSubtree:true},undefined,true)]);assert.deepEqual(deleted.map(r=>r.statusCode),[200,200]);assert.equal(deleted.filter(r=>r.json().changed).length,1);
        assert.equal((await pool.query('SELECT id FROM posts WHERE conversation_id=$1',[graph])).rowCount,0);
        assert.equal((await pool.query('SELECT id FROM conversations WHERE id=$1',[graph])).rowCount,0);
        assert.equal((await pool.query('SELECT post_id FROM post_deletion_journal WHERE conversation_id=$1',[graph])).rowCount,3);
        assert.equal((await pool.query("SELECT count(*)::int AS n FROM events WHERE conversation_id=$1 AND kind='removed'",[graph])).rows[0].n,1);
        assert.equal((await call('GET','/posts/'+graph)).statusCode,404);assert.equal((await pool.query('SELECT status FROM agents WHERE id=$1',[agentId])).rows[0].status,'blocked');
        assert.equal((await call('GET',url+'?state=deleted',undefined,undefined,true)).json().items.some((p:any)=>p.id===graph),false);
        await pool.query("DELETE FROM limits WHERE bucket LIKE 'operator_delete:'||$1||':%'",[operator]);process.env.LIMIT_OPERATOR_DELETE='1';
        assert.equal((await call('DELETE','/operator/posts/'+reply,{confirmSubtree:true},undefined,true)).statusCode,404);
        const limited=await call('DELETE','/operator/posts/'+nested,{confirmSubtree:true},undefined,true);assert.equal(limited.statusCode,429);assert.ok(limited.headers['retry-after']);
        process.env.LIMIT_OPERATOR_DELETE='100';
        await pool.query("UPDATE conversations SET last_activity_at=now()-interval '31 days' WHERE id=$1",[graph]);
        const race=await Promise.all([call('DELETE','/operator/posts/'+nested,{confirmSubtree:true},undefined,true),cleanup()]);assert.ok([200,404].includes((race[0] as any).statusCode));
        assert.equal((await pool.query('SELECT count(*)::int AS count FROM conversations WHERE id=$1',[graph])).rows[0].count,0);assert.equal((await pool.query('SELECT count(*)::int AS count FROM operator_post_deletions WHERE post_id=$1',[graph])).rows[0].count,0);
      }finally{
        if(previousLimit===undefined)delete process.env.LIMIT_OPERATOR_DELETE;else process.env.LIMIT_OPERATOR_DELETE=previousLimit;
        await pool.query('DELETE FROM conversations WHERE id=ANY($1::uuid[])',[conversations]);await pool.query('DELETE FROM agents WHERE id=$1',[foreign]);await pool.query('UPDATE agents SET status=$2 WHERE id=$1',[agentId,saved]);
      }
    });
    await t.test('public stream search filters visible conversations before pagination, preserves precision and never matches hidden branches',async()=>{
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'anonymous_read:%'");
      const ids:string[]=[],writer=randomUUID(),suffix=writer.slice(0,8),needle='stream-search-'+suffix,handle='searchwriter_'+suffix;
      await pool.query("INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,operator_id,status) VALUES($1,$2,$3,'Fixture','[]','Isolated','{}',$4,'active')",[writer,handle,'Café SearchWriter '+suffix,operator]);
      async function root(body:string,state='visible',fraction='123456',author=agentId){const id=randomUUID();ids.push(id);await pool.query('INSERT INTO conversations(id,last_activity_at) VALUES($1,now())',[id]);await pool.query("INSERT INTO posts(id,conversation_id,agent_id,body,technical,state,created_at) VALUES($1,$1,$2,$3,'{}',$4,$5)",[id,author,state==='deleted'?null:body,state,'2026-01-01T00:00:00.'+fraction+'Z']);return id;}
      async function reply(rootId:string,parent:string,body:string,state='visible',author=agentId){const id=randomUUID();await pool.query("INSERT INTO posts(id,conversation_id,parent_id,agent_id,body,technical,state) VALUES($1,$2,$3,$4,$5,'{}',$6)",[id,rootId,parent,author,body,state]);return id;}
      const read=async(query:string,tag?:string,cursor?:string)=>call('GET','/feed?'+new URLSearchParams({q:query,...(tag?{tag}:{}),...(cursor?{cursor}:{})}));
      try{
        const visible:string[]=[];for(let i=0;i<25;i++)visible.push(await root(needle+' '+i+' #searchpaging'+(i===0?' #streamsearch':''),'visible','123'+String(i).padStart(3,'0')));
        const commentRoot=await root('An unrelated public opening');visible.push(commentRoot);
        const comment=await reply(commentRoot,commentRoot,needle+' %_ public comment','visible',writer);await reply(commentRoot,commentRoot,'A separate #streamsearch comment');
        const unicode=await root(needle+' café');visible.push(unicode);
        const privateRoot=await root('A neutral opening');const hidden=await reply(privateRoot,privateRoot,needle+' hidden','hidden');await reply(privateRoot,hidden,needle+' deepsecret #streamsearch','visible',writer);
        const hiddenRoot=await root(needle+' #streamsearch','hidden','123456',writer);await reply(hiddenRoot,hiddenRoot,needle+' deepsecret','visible',writer);await root(needle,'deleted');
        const authorRoot=await root('A visible author fixture','visible','123456',writer);
        const activity=(await pool.query('SELECT id,last_activity_at FROM conversations WHERE id=ANY($1::uuid[]) ORDER BY id',[ids])).rows;
        const events=(await pool.query('SELECT count(*)::int AS count FROM events')).rows[0].count;
        const found:string[]=[];let cursor:string|undefined;
        do{const r=await read(needle.toUpperCase(),undefined,cursor);assert.equal(r.statusCode,200,r.body);const data=r.json();found.push(...data.items.map((post:any)=>post.id));assert.ok(data.items.every((post:any)=>post.cursor_time===undefined));cursor=data.nextCursor || undefined;}while(cursor);
        assert.equal(found.length,visible.length);assert.equal(new Set(found).size,visible.length);assert.deepEqual([...found].sort(),[...visible].sort(),'microsecond cursor does not skip matching roots');
        const taggedPages:string[]=[];cursor=undefined;
        do{const r=await read(needle,'searchpaging',cursor);assert.equal(r.statusCode,200,r.body);const data=r.json();taggedPages.push(...data.items.map((post:any)=>post.id));cursor=data.nextCursor || undefined;}while(cursor);
        assert.deepEqual(taggedPages.sort(),visible.slice(0,25).sort(),'combined query/tag cursor parameters stay aligned');
        const combined=await read(needle,'streamsearch');assert.equal(combined.statusCode,200,combined.body);assert.deepEqual(combined.json().items.map((p:any)=>p.id).sort(),[visible[0],commentRoot].sort(),'tag and query combine at conversation level');
        assert.deepEqual((await read(needle+' %_')).json().items.map((p:any)=>p.id),[commentRoot],'wildcards are literal');
        assert.deepEqual((await read(needle+' CAFE\u0301')).json().items.map((p:any)=>p.id),[unicode]);
        for(const query of ['CAFÉ SEARCHWRITER '+suffix,'@'+handle,handle])assert.deepEqual((await read(query)).json().items.map((p:any)=>p.id).sort(),[authorRoot,commentRoot].sort());
        assert.equal((await read(needle+' deepsecret')).json().items.length,0);
        assert.equal((await read("' OR 1=1 --")).json().items.length,0);
        assert.equal((await read('x'.repeat(201))).statusCode,400);assert.equal((await read('bad\0search')).statusCode,400);
        await pool.query("UPDATE posts SET state='hidden' WHERE id=$1",[comment]);assert.equal((await read(needle+' %_')).json().items.length,0,'a newly hidden match disappears');
        assert.deepEqual((await pool.query('SELECT id,last_activity_at FROM conversations WHERE id=ANY($1::uuid[]) ORDER BY id',[ids])).rows,activity);
        assert.equal((await pool.query('SELECT count(*)::int AS count FROM events')).rows[0].count,events,'searching emits no events');
      }finally{await pool.query('DELETE FROM conversations WHERE id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM agents WHERE id=$1',[writer]);}
    });
    await t.test('operator declarations and scope-bound publication authorization are explicit, private and race-safe',async()=>{
      await pool.query("DELETE FROM limits WHERE bucket LIKE 'anonymous_read:%' OR bucket LIKE 'login:%'");
      const decl=(await call('GET','/declarations')).json();
      const personal={handle:'consent_personal',password,email:'consent_personal@example.invalid',accountType:'personal',ageConfirmed:true,ageVersion:decl.age.version};
      for(const body of [{...personal,ageConfirmed:undefined},{...personal,ageConfirmed:false},{...personal,ageConfirmed:'true'},
        {...personal,accountType:'organization'},{...personal,accountType:'organization',organizationAuthorized:false,organizationVersion:decl.organization.version},{...personal,age_confirmed_at:'2000-01-01T00:00:00Z'}, {...personal,ageVersion:'forged'}]){
        assert.equal((await call('POST','/operator-registrations',body)).statusCode,400);
      }
      const before=Date.now();const created=await call('POST','/operator-registrations',personal);assert.equal(created.statusCode,200,created.body);await verifyOperator(personal.email);const person=(await pool.query('SELECT id FROM operators WHERE handle=$1',[personal.handle])).rows[0].id;
      const org=await call('POST','/operator-registrations',{...personal,handle:'consent_org',email:'consent_org@example.invalid',accountType:'organization',organizationAuthorized:true,organizationVersion:decl.organization.version});assert.equal(org.statusCode,200,org.body);await verifyOperator('consent_org@example.invalid');const orgId=(await pool.query("SELECT id FROM operators WHERE handle='consent_org'")).rows[0].id;
      const evidence=(await pool.query('SELECT * FROM operators WHERE id=$1',[person])).rows[0];
      assert.ok(evidence.age_confirmed_at.getTime()>=before);assert.equal(evidence.age_declaration_version,decl.age.version);assert.equal(evidence.organization_authorized_at,null);
      const orgEvidence=(await pool.query('SELECT * FROM operators WHERE id=$1',[orgId])).rows[0];assert.ok(orgEvidence.organization_authorized_at);assert.equal(orgEvidence.organization_declaration_version,decl.organization.version);
      await login('consent_personal');
      const registration=await call('POST','/registrations',{...prepared('consent_agent'),operatorHandle:'consent_personal'});assert.equal(registration.statusCode,200,registration.body);
      const credential=registration.json().key,id=registration.json().id,firstToken=new URL(registration.json().confirmationUrl).searchParams.get('confirmation');
      const pendingSnapshot=await call('GET','/operator/agent-updates',undefined,undefined,true);assert.equal(pendingSnapshot.statusCode,200,pendingSnapshot.body);assert.equal(pendingSnapshot.json().agents.find((a:any)=>a.id===id).status,'pending');assert.equal(pendingSnapshot.json().agents.find((a:any)=>a.id===id).authorization_required,true);
      const publish=()=>call('POST','/posts',{body:'[Local test] authorization fixture'},credential);
      assert.equal((await publish()).json().error.code,'AGENT_AUTHORIZATION_REQUIRED');
      assert.equal((await call('PUT','/posts/'+randomUUID()+'/reaction',{value:1},credential)).json().error.code,'AGENT_AUTHORIZATION_REQUIRED');
      assert.equal((await call('GET','/registration-status',undefined,credential)).json().status,'pending');
      assert.equal((await call('GET','/registration-status',undefined,credential)).json().blockReason,'AGENT_AUTHORIZATION_REQUIRED');
      assert.equal((await call('GET','/operators/'+person)).json().agents.length,0,'pending profiles are not exposed through public operator profiles');
      const preview=await call('GET','/confirmation?token='+firstToken,undefined,undefined,true);assert.equal(preview.statusCode,200);
      const approved={token:firstToken,revision:1,scope:'First scope',ruleVersion:rules.version,authorizePublication:true,authorizationVersion:decl.publication.version,publicParticipation:true};
      assert.equal((await call('POST','/confirmation',{...approved,authorizePublication:false},undefined,true)).statusCode,400);
      assert.equal((await call('POST','/confirmation',{...approved,operatorId:orgId},undefined,true)).statusCode,400);
      assert.equal((await call('POST','/confirmation',approved,credential)).statusCode,401);
      await login('consent_org');assert.equal((await call('GET','/confirmation?token='+firstToken,undefined,undefined,true)).statusCode,404);
      assert.equal((await call('POST','/confirmation',approved,undefined,true)).statusCode,409);
      assert.equal((await call('POST','/operator/agents/'+id+'/authorization',{},undefined,true)).statusCode,404);
      await login('consent_personal');
      assert.equal((await call('PATCH','/operator',{guidelines:'',accountType:'organization',age_confirmed_at:'forged'},undefined,true)).statusCode,400);
      assert.equal((await call('PATCH','/operator/agents/'+id+'/scope',{revision:1,scope:'First scope',operatingContext:'Reviewed context'},undefined,true)).json().revision,2);
      assert.equal((await call('POST','/confirmation',approved,undefined,true)).statusCode,409,'an intervening scope change invalidates the initial link');
      const issue=async()=>{const r=await call('POST','/operator/agents/'+id+'/authorization',{},undefined,true);assert.equal(r.statusCode,200,r.body);return new URL(r.json().confirmationUrl).searchParams.get('confirmation');};
      const token2=await issue();const p2=(await call('GET','/confirmation?token='+token2,undefined,undefined,true)).json();
      assert.equal(p2.scope_revision,2);assert.equal(p2.operating_context,'Reviewed context');
      assert.equal((await call('POST','/confirmation',{...approved,token:token2},undefined,true)).json().error.code,'SCOPE_CHANGED');
      const a2={...approved,token:token2,revision:2};const authorizeRace=await Promise.all([call('POST','/confirmation',a2,undefined,true),publish()]);
      assert.equal(authorizeRace[0].statusCode,200);assert.ok([200,403].includes(authorizeRace[1].statusCode));
      assert.equal((await call('POST','/confirmation',a2,undefined,true)).statusCode,409);
      assert.equal((await pool.query('SELECT * FROM agent_authorizations WHERE agent_id=$1',[id])).rows.length,1);
      assert.equal((await call('GET','/registration-status',undefined,credential)).json().authorizationRequired,false);
      assert.equal((await call('GET','/registration-status',undefined,credential)).json().publicationAllowed,true);
      const posted=await publish();assert.equal(posted.statusCode,200,posted.body);
      assert.equal((await call('POST','/posts',{body:'[Local test] authorized reply',parentId:posted.json().id},credential)).statusCode,200);
      assert.equal((await call('PATCH','/me',{about:'Ordinary profile change'},credential)).statusCode,200);
      assert.equal((await publish()).statusCode,200,'ordinary profile edits keep the authorization');
      assert.equal((await call('PATCH','/me',{operating_context:'Escalate'},credential)).statusCode,400);
      const publicData=JSON.stringify((await call('GET','/agents/'+id)).json())+JSON.stringify((await call('GET','/operators/'+person)).json())+JSON.stringify((await call('GET','/me',undefined,credential)).json());
      for(const secretField of ['age_confirmed_at','age_declaration_version','organization_authorized_at','declaration_version','confirmation_hash','key_hash'])assert.equal(publicData.includes(secretField),false,secretField);
      await call('POST','/operator/agents/'+id,{action:'pause'},undefined,true);
      const pausedToken=await issue();assert.equal((await call('POST','/confirmation',{...a2,token:pausedToken},undefined,true)).statusCode,200);assert.equal((await publish()).json().error.code,'AGENT_PAUSED');
      await pool.query("UPDATE agents SET status='blocked',key_hash=NULL WHERE id=$1",[id]);
      const blockedToken=await issue();await call('POST','/confirmation',{...a2,token:blockedToken},undefined,true);
      const preserved=(await pool.query('SELECT status,operator_paused,key_hash FROM agents WHERE id=$1',[id])).rows[0];assert.equal(preserved.status,'blocked');assert.equal(preserved.operator_paused,true);assert.equal(preserved.key_hash,null);
      await pool.query("UPDATE agents SET key_hash=$2 WHERE id=$1",[id,createHash('sha256').update(credential).digest('hex')]);assert.equal((await publish()).json().error.code,'AGENT_SUSPENDED');
      await pool.query("UPDATE agents SET status='active',operator_paused=false WHERE id=$1",[id]);
      const changed=await call('PATCH','/operator/agents/'+id+'/scope',{revision:2,scope:'Second scope'},undefined,true);assert.equal(changed.json().revision,3);
      assert.equal((await publish()).json().error.code,'AGENT_AUTHORIZATION_REQUIRED');
      const third=await issue();const responses=await Promise.all([1,2].map(()=>call('POST','/confirmation',{...a2,token:third,revision:3,scope:'Second scope'},undefined,true)));
      assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);
      const pauseRace=await Promise.all([publish(),call('POST','/operator/agents/'+id,{action:'pause'},undefined,true)]);
      assert.ok([200,403].includes(pauseRace[0].statusCode));assert.equal(pauseRace[1].statusCode,200);assert.equal((await publish()).json().error.code,'AGENT_PAUSED');
      assert.equal((await call('POST','/operator/agents/'+id,{action:'activate'},undefined,true)).statusCode,200);
      const unchanged=await call('PATCH','/operator/agents/'+id+'/scope',{revision:3,scope:'Second scope'},undefined,true);assert.equal(unchanged.json().changed,false);assert.equal(unchanged.json().revision,3);
      const racers=await Promise.all(['Third scope','Other scope'].map(scope=>call('PATCH','/operator/agents/'+id+'/scope',{revision:3,scope},undefined,true)));
      assert.deepEqual(racers.map(r=>r.statusCode).sort(),[200,409]);assert.equal((await publish()).json().error.code,'AGENT_AUTHORIZATION_REQUIRED');
      await pool.query("UPDATE operators SET age_declaration_version='obsolete' WHERE id=$1",[person]);assert.equal((await publish()).json().error.code,'OPERATOR_CONFIRMATION_REQUIRED');
      await pool.query('UPDATE operators SET age_declaration_version=$2,suspended=true WHERE id=$1',[person,decl.age.version]);assert.equal((await publish()).json().error.code,'OPERATOR_SUSPENDED');
      await pool.query('UPDATE operators SET suspended=false WHERE id=$1',[person]);
      // UTC timestamptz/snapshots are server-owned; repeated approvals never duplicate evidence.
      const audit=(await pool.query('SELECT * FROM agent_authorizations WHERE agent_id=$1 ORDER BY scope_revision',[id])).rows;
      assert.equal(audit.length,2);assert.equal(audit[0].operating_context,'Reviewed context');assert.equal(audit[0].approved_scope,'First scope');assert.equal(audit[1].approved_scope,'Second scope');
      await login('consent_org');
      const orgRegistration=await call('POST','/registrations',{...prepared('consent_org_agent'),operatorHandle:'consent_org'});assert.equal(orgRegistration.statusCode,200,orgRegistration.body);
      const orgAgent=orgRegistration.json(),orgToken=new URL(orgAgent.confirmationUrl).searchParams.get('confirmation');
      const orgApproval={...approved,token:orgToken,revision:1,scope:'Organization scope'};
      await pool.query("UPDATE agents SET confirmation_expires=now()-interval '1 second' WHERE id=$1",[orgAgent.id]);
      assert.equal((await call('GET','/confirmation?token='+orgToken,undefined,undefined,true)).statusCode,404);
      assert.equal((await call('POST','/confirmation',orgApproval,undefined,true)).statusCode,409);
      const renewedOrg=await call('POST','/operator/agents/'+orgAgent.id+'/authorization',{},undefined,true);assert.equal(renewedOrg.statusCode,200);
      const validOrgToken=new URL(renewedOrg.json().confirmationUrl).searchParams.get('confirmation');
      assert.equal((await call('POST','/confirmation',{...orgApproval,token:validOrgToken},undefined,true)).statusCode,200);
      await pool.query("UPDATE operators SET organization_declaration_version='obsolete' WHERE id=$1",[orgId]);
      assert.equal((await call('POST','/posts',{body:'[Local test] organization declaration check'},orgAgent.key)).json().error.code,'OPERATOR_CONFIRMATION_REQUIRED');
      await pool.query('UPDATE operators SET organization_declaration_version=$2 WHERE id=$1',[orgId,decl.organization.version]);
      assert.equal((await call('POST','/posts',{body:'[Local test] authorized organization fixture'},orgAgent.key)).statusCode,200);

    });
    await t.test('operator email verification and recovery are private, single-use and revoke stale sessions',async()=>{
      await pool.query('DELETE FROM limits');
      const email='recovery_fixture@example.invalid',handle='recovery_fixture';
      const register={handle,password,email:' RECOVERY_FIXTURE@example.invalid ',accountType:'personal',ageConfirmed:true,ageVersion:'age-18-v1'};
      assert.equal((await call('POST','/operator-registrations',{...register,email:undefined})).statusCode,400);
      assert.equal((await call('POST','/operator-registrations',{...register,email:'bad'})).statusCode,400);
      assert.equal((await call('POST','/operator-registrations',{...register,email_verified_at:'2020-01-01'})).statusCode,400);
      const registration=await call('POST','/operator-registrations',register);assert.equal(registration.statusCode,200,registration.body);assert.deepEqual(registration.json(),{ok:true});
      assert.equal((await call('POST','/login',{handle,password})).json().error.code,'EMAIL_VERIFICATION_REQUIRED');
      const id=(await pool.query('SELECT id FROM operators WHERE handle=$1',[handle])).rows[0].id;
      assert.equal((await call('POST','/registrations',{...prepared('email_pending_agent'),operatorHandle:handle})).json().error.code,'OPERATOR_EMAIL_REQUIRED');
      let verifyToken=await emailTokenFor(email);
      assert.equal((await pool.query('SELECT token_hash FROM operator_email_tokens WHERE operator_id=$1',[id])).rows[0].token_hash,createHash('sha256').update(verifyToken).digest('hex'));
      assert.equal((await call('GET','/operator-email/verify?token='+verifyToken)).statusCode,404);
      assert.equal((await call('POST','/operator-email/reset',{token:verifyToken,password:'new-fixture-password'})).statusCode,400);
      await pool.query("UPDATE operator_email_tokens SET expires_at=now()-interval '1 second' WHERE operator_id=$1",[id]);
      assert.equal((await call('POST','/operator-email/verify',{token:verifyToken})).statusCode,400);
      const expiredVerifyToken=verifyToken,oldMailCount=mailbox.length;await call('POST','/operator-email/verification',{email});for(let n=0;mailbox.length===oldMailCount&&n<50;n++)await new Promise(r=>setTimeout(r,5));verifyToken=await emailTokenFor(email);assert.notEqual(verifyToken,expiredVerifyToken);assert.equal((await call('POST','/operator-email/verify',{token:expiredVerifyToken})).statusCode,400);
      const verified=await Promise.all([call('POST','/operator-email/verify',{token:verifyToken}),call('POST','/operator-email/verify',{token:verifyToken})]);assert.deepEqual(verified.map(r=>r.statusCode).sort(),[200,400]);
      await login(handle);const oldCookie=cookie,oldCsrf=csrf;const oldSession=(await pool.query("SELECT * FROM sessions WHERE data->>'operatorId'=$1 ORDER BY expires_at DESC LIMIT 1",[id])).rows[0];
      const privateData=await call('GET','/operator',undefined,undefined,true);assert.equal(privateData.json().operator.email,email);
      const publicData=await call('GET','/operators/'+id);assert.equal(publicData.body.includes(email),false);assert.equal(publicData.body.includes('email_verified_at'),false);
      const duplicate=await call('POST','/operator-registrations',{...register,handle:'different_fixture'});assert.deepEqual(duplicate.json(),registration.json());assert.equal((await pool.query('SELECT id FROM operators WHERE handle=$1',['different_fixture'])).rowCount,0);
      const unknown=await call('POST','/operator-email/password-reset',{email:'unknown_fixture@example.invalid'}),known=await call('POST','/operator-email/password-reset',{email});assert.equal(known.statusCode,200);assert.deepEqual(unknown.json(),known.json());
      const resetToken=await emailTokenFor(email,'reset');assert.equal((await call('POST','/operator-email/verify',{token:resetToken})).statusCode,400);
      await pool.query("UPDATE operator_email_tokens SET expires_at=now()-interval '1 second' WHERE operator_id=$1",[id]);
      assert.equal((await call('POST','/operator-email/reset',{token:resetToken,password:'new-fixture-password'})).statusCode,400);
      const previousMailCount=mailbox.length;await call('POST','/operator-email/password-reset',{email});for(let n=0;mailbox.length===previousMailCount&&n<50;n++)await new Promise(r=>setTimeout(r,5));const validToken=await emailTokenFor(email,'reset');assert.notEqual(validToken,resetToken);
      assert.equal((await call('POST','/operator-email/reset',{token:validToken,password:'short'})).statusCode,400);
      const reset=await Promise.all([call('POST','/operator-email/reset',{token:validToken,password:'new-fixture-password'},undefined,true),call('POST','/operator-email/reset',{token:validToken,password:'other-fixture-password'})]);assert.deepEqual(reset.map(r=>r.statusCode).sort(),[200,400]);
      assert.equal((await pool.query('SELECT token_hash FROM operator_email_tokens WHERE operator_id=$1',[id])).rowCount,0);
      cookie=oldCookie;csrf=oldCsrf;
      assert.equal((await call('GET','/session',undefined,undefined,true)).json().operatorId,undefined);
      assert.equal((await call('GET','/operator',undefined,undefined,true)).statusCode,401);
      assert.equal((await call('POST','/login',{handle,password})).statusCode,401);
      const stored=(await pool.query('SELECT password,auth_version FROM operators WHERE id=$1',[id])).rows[0];assert.ok(stored.password.startsWith('$argon2'));
      const winningPassword=await argon2.verify(stored.password,'new-fixture-password')?'new-fixture-password':'other-fixture-password';
      const signed=await call('POST','/login',{handle,password:winningPassword});assert.equal(signed.statusCode,200,signed.body);
      await pool.query('INSERT INTO sessions(sid,data,expires_at) VALUES($1,$2,$3) ON CONFLICT(sid) DO UPDATE SET data=$2,expires_at=$3',[oldSession.sid,oldSession.data,oldSession.expires_at]);cookie=oldCookie;csrf=oldCsrf;assert.equal((await call('GET','/session',undefined,undefined,true)).json().operatorId,undefined,'a late stale session save cannot restore access');
      const invalid=await call('POST','/operator-email/verification',{email:'unknown_fixture@example.invalid'});assert.deepEqual(invalid.json(),{ok:true});
      await app.close();app=await testApp();
      assert.equal((await call('POST','/operator-email/reset',{token:validToken,password:winningPassword})).statusCode,400,'consumed links stay invalid after restart');
      await pool.query('DELETE FROM limits');
      const beforeRequests=mailbox.filter(m=>m.to===email&&m.text.includes('#reset=')).length;
      for(let n=0;n<4;n++)assert.deepEqual((await call('POST','/operator-email/password-reset',{email})).json(),{ok:true});
      await app.close();app=await testApp();
      assert.equal(mailbox.filter(m=>m.to===email&&m.text.includes('#reset=')).length,beforeRequests+3,'address throttling suppresses extra delivery without exposing address state');
      const rateRows=(await pool.query("SELECT bucket,count FROM limits WHERE bucket LIKE 'email_reset:%'")).rows;assert.equal(rateRows.length,1);assert.equal(rateRows[0].count,3);assert.equal(rateRows[0].bucket.includes(email),false);
      assert.deepEqual((await call('POST','/operator-email/password-reset',{email})).json(),{ok:true},'address limits persist across restart');
      await app.close();app=await testApp();assert.equal(mailbox.filter(m=>m.to===email&&m.text.includes('#reset=')).length,beforeRequests+3);
      await pool.query('DELETE FROM limits');
      for(let n=0;n<10;n++)assert.equal((await call('POST','/operator-email/password-reset',{email:'unknown_'+n+'@example.invalid'})).statusCode,200);
      assert.equal((await call('POST','/operator-email/password-reset',{email:'unknown_extra@example.invalid'})).statusCode,429);
      await pool.query('DELETE FROM limits');
      for(let n=0;n<20;n++)assert.equal((await call('POST','/operator-email/verify',{token:'a'.repeat(43)})).statusCode,400);
      assert.equal((await call('POST','/operator-email/verify',{token:'a'.repeat(43)})).statusCode,429);
      await pool.query('DELETE FROM limits');
      const unavailable=await createApp({mailer:{available:false,send:async()=>{throw Error('Must not send');}}});
      try{const result=await unavailable.inject({method:'POST',url:'/api/operator-registrations',payload:{...register,handle:'no_mail_fixture',email:'no_mail_fixture@example.invalid'}});assert.equal(result.statusCode,503);assert.equal((await pool.query("SELECT id FROM operators WHERE handle='no_mail_fixture'")).rowCount,0);}finally{await unavailable.close();}
      await pool.query('DELETE FROM limits');
    });
    await t.test('independent private case evidence survives content and identity removal without resurrection',async()=>{
      await pool.query('DELETE FROM limits');
      const ownerId=randomUUID(),subject=randomUUID(),thread=randomUUID(),post=randomUUID(),handle='case_owner_'+ownerId.slice(0,8);
      await pool.query("INSERT INTO operators(id,handle,password,account_type,age_confirmed_at,age_declaration_version,email,email_verified_at) SELECT $1,$2,$3,'personal',now(),age_declaration_version,$4,now() FROM operators LIMIT 1",[ownerId,handle,await argon2.hash(password),handle+'@example.invalid']);
      await pool.query("INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,operator_id,status) VALUES($1,$2,'Original case agent','Snapshot about','[]','Fixture','{}',$3,'active')",[subject,'case_agent_'+subject.slice(0,8),ownerId]);
      await pool.query('INSERT INTO conversations(id,last_activity_at) VALUES($1,now())',[thread]);
      await pool.query("INSERT INTO posts(id,conversation_id,agent_id,body,technical) VALUES($1,$2,$3,'Original reported content','{\"model\":\"snapshot-model\"}')",[post,thread,subject]);
      for(const reason of ['Evidence fixture','Unresolved archived fixture'])assert.equal((await call('POST','/reports',{postId:post,reason})).statusCode,200);
      const reports=(await pool.query('SELECT * FROM reports WHERE post_id=$1 ORDER BY reason',[post])).rows;const report=reports[0],openReport=reports[1];
      const saved=(await pool.query('SELECT evidence FROM moderation_cases WHERE id=$1',[report.case_id])).rows[0].evidence;
      assert.equal(saved.post.body,'Original reported content');assert.equal(saved.post.technical.model,'snapshot-model');assert.equal(saved.agent.name,'Original case agent');assert.equal(saved.operator.handle,handle);assert.equal(saved.operator.email,undefined);assert.equal(saved.agent.key_hash,undefined);
      await assert.rejects(pool.query("UPDATE moderation_cases SET evidence='{}' WHERE id=$1",[report.case_id]),/immutable/);
      await pool.query("UPDATE posts SET body='Changed later' WHERE id=$1",[post]);await pool.query("UPDATE agents SET name='Changed agent' WHERE id=$1",[subject]);
      await login('test_admin',true);let queue=(await call('GET','/admin',undefined,undefined,true)).json();assert.equal(queue.reports.find((r:any)=>r.id===report.id).post_body,'Original reported content');
      assert.equal((await call('POST','/admin/actions',{action:'hide',id:post,reportId:report.id,reason:'Case decision'},undefined,true)).statusCode,200);
      const decision=(await pool.query('SELECT id,case_id FROM moderation WHERE report_id=$1',[report.id])).rows[0];assert.equal(decision.case_id,report.case_id);
      await login(handle);assert.equal((await call('POST','/operator/appeals',{moderationId:decision.id,reason:'Case review'},undefined,true)).statusCode,200);
      const appeal=(await pool.query('SELECT id,case_id FROM appeals WHERE moderation_id=$1',[decision.id])).rows[0];assert.equal(appeal.case_id,report.case_id);
      assert.equal((await call('GET','/operator/cases/'+report.case_id,undefined,undefined,true)).statusCode,200);assert.equal((await call('GET','/operator/cases/'+report.case_id)).statusCode,401);
      await login('other_operator');assert.equal((await call('GET','/operator/cases/'+report.case_id,undefined,undefined,true)).statusCode,404);
      await pool.query('DELETE FROM conversations WHERE id=$1',[thread]);await pool.query('DELETE FROM agents WHERE id=$1',[subject]);
      await login(handle);queue=(await call('GET','/operator?agentId='+subject,undefined,undefined,true)).json();assert.equal(queue.notices.find((n:any)=>n.id===decision.id).post_body,'Original reported content');assert.equal(queue.notices.find((n:any)=>n.id===decision.id).target_available,false);
      assert.equal((await call('POST','/operator/appeals/'+appeal.id+'/messages',{body:'Still reviewable after public removal'},undefined,true)).statusCode,200);
      await pool.query('DELETE FROM operators WHERE id=$1',[ownerId]);
      assert.equal((await call('GET','/operator',undefined,undefined,true)).statusCode,401);
      await login('test_admin',true);const evidence=(await call('GET','/admin/cases/'+report.case_id,undefined,undefined,true)).json();assert.equal(evidence.evidence.post.body,'Original reported content');
      queue=(await call('GET','/admin',undefined,undefined,true)).json();const archived=queue.case_context.reports.find((r:any)=>r.id===report.id);assert.equal(archived.agent_name,'Original case agent');assert.equal(archived.post_body,'Original reported content');
      assert.equal((await call('POST','/admin/appeals/'+appeal.id+'/decision',{outcome:'accepted_restore',response:'Must not resurrect'},undefined,true)).statusCode,409);
      assert.equal((await call('POST','/admin/appeals/'+appeal.id+'/decision',{outcome:'accepted',expectedRevision:1,response:'Reviewed retained evidence without restoring deleted content.'},undefined,true)).statusCode,200);
      assert.equal((await call('POST','/admin/actions',{action:'dismiss',id:post,reportId:openReport.id,reason:'Reviewed archived case'},undefined,true)).statusCode,200);
      assert.equal((await pool.query('SELECT id FROM posts WHERE id=$1',[post])).rowCount,0);assert.equal((await call('GET','/agents/'+subject)).statusCode,404);
      assert.equal(JSON.stringify((await call('GET','/feed')).json()).includes('Original reported content'),false);
      const replacement=randomUUID();await pool.query("INSERT INTO operators(id,handle,password,account_type,age_confirmed_at,age_declaration_version,email,email_verified_at) SELECT $1,$2,$3,'personal',now(),age_declaration_version,$4,now() FROM operators LIMIT 1",[replacement,handle,await argon2.hash(password),'replacement_'+handle+'@example.invalid']);
      await login(handle);assert.equal((await call('GET','/operator/cases/'+report.case_id,undefined,undefined,true)).statusCode,404);assert.equal((await call('GET','/operator?agentId='+subject,undefined,undefined,true)).statusCode,404);

    });
    await t.test('subtree removal preserves siblings, foreign case evidence and restore tombstones, including paused and blocked actors',async()=>{
      await pool.query('DELETE FROM limits');
      const approve=async(handle:string,ownerHandle:string)=>{
        const registration=await call('POST','/registrations',{...prepared(handle),operatorHandle:ownerHandle});assert.equal(registration.statusCode,200);
        const data=registration.json(),tok=new URL(data.confirmationUrl).searchParams.get('confirmation');await login(ownerHandle);
        const preview=(await call('GET','/confirmation?token='+tok,undefined,undefined,true)).json();
        assert.equal((await call('POST','/confirmation',{token:tok,revision:preview.scope_revision,scope:'Isolated subtree deletion fixtures',ruleVersion:preview.ruleVersion,authorizationVersion:preview.authorizationVersion,publicParticipation:true,authorizePublication:true},undefined,true)).statusCode,200);
        return {id:data.id,key:data.key};
      };
      const author=await approve('subtree_author','test_operator'),peer=await approve('subtree_peer','other_operator');
      const graph=randomUUID();await pool.query('INSERT INTO conversations(id,last_activity_at) VALUES($1,now())',[graph]);
      async function add(parent:string|null,who=author.id,body='Subtree fixture',state='visible',id=randomUUID()){
        await pool.query('INSERT INTO posts(id,conversation_id,parent_id,agent_id,body,technical,state) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,graph,parent,who,state==='deleted'?null:body,{model:'synthetic-fixture'},state]);return id;
      }
      await add(null,author.id,'Surviving parent','visible',graph);const branch=await add(graph),foreign=await add(branch,peer.id,'Original foreign reported evidence'),sibling=await add(graph,peer.id,'Untouched sibling');
      let parent=foreign;for(let i=0;i<80;i++)parent=await add(parent,i%2?author.id:peer.id,'Deep fixture '+i,i===20?'deleted':'visible');
      await pool.query('INSERT INTO post_reactions(post_id,agent_id,value) VALUES($1,$2,1)',[foreign,author.id]);
      const report=randomUUID();await pool.query("INSERT INTO reports(id,post_id,reason) VALUES($1,$2,'Subtree report fixture')",[report,foreign]);
      await login('test_admin',true);assert.equal((await call('POST','/admin/actions',{action:'hide',id:foreign,reportId:report,reason:'Subtree evidence fixture'},undefined,true)).statusCode,200);
      const decision=(await pool.query('SELECT id,case_id FROM moderation WHERE report_id=$1',[report])).rows[0];
      await login('other_operator');assert.equal((await call('POST','/operator/appeals',{moderationId:decision.id,reason:'Preserve this complaint'},undefined,true)).statusCode,200);
      const appeal=(await pool.query('SELECT id FROM appeals WHERE moderation_id=$1',[decision.id])).rows[0].id;
      const activity=(await pool.query('SELECT last_activity_at FROM conversations WHERE id=$1',[graph])).rows[0].last_activity_at;
      assert.equal((await call('DELETE','/posts/'+branch,{},author.key)).statusCode,400);assert.equal((await call('DELETE','/posts/'+branch,{confirmSubtree:false},author.key)).statusCode,400);
      assert.equal((await call('DELETE','/posts/'+branch,{confirmSubtree:true},peer.key)).statusCode,404);
      await login('other_operator');assert.equal((await call('DELETE','/operator/posts/'+branch,{confirmSubtree:true},undefined,true)).statusCode,404);
      await pool.query("UPDATE agents SET status='paused',operator_paused=true WHERE id=$1",[author.id]);
      const removed=await call('DELETE','/posts/'+branch,{confirmSubtree:true},author.key);assert.equal(removed.statusCode,200,removed.body);assert.equal(removed.json().deletedCount,82);
      const remaining=(await pool.query('SELECT id FROM posts WHERE conversation_id=$1 ORDER BY id',[graph])).rows.map(r=>r.id).sort();assert.deepEqual(remaining,[graph,sibling].sort());
      assert.equal((await pool.query('SELECT * FROM post_reactions WHERE post_id=$1',[foreign])).rowCount,0);
      assert.equal((await pool.query('SELECT last_activity_at FROM conversations WHERE id=$1',[graph])).rows[0].last_activity_at.getTime(),activity.getTime());
      assert.equal((await call('GET','/posts/'+graph)).json().comment_count,1);
      assert.equal((await call('DELETE','/posts/'+branch,{confirmSubtree:true},author.key)).json().changed,false);
      assert.equal((await call('DELETE','/posts/'+sibling,{confirmSubtree:true},author.key)).statusCode,404);
      await login('other_operator');const saved=(await call('GET','/operator/cases/'+decision.case_id,undefined,undefined,true)).json();assert.equal(saved.evidence.post.body,'Original foreign reported evidence');assert.equal(saved.evidence.post.technical.model,'synthetic-fixture');
      assert.equal((await pool.query('SELECT post_id FROM reports WHERE id=$1',[report])).rows[0].post_id,null);assert.equal((await pool.query('SELECT id FROM appeals WHERE id=$1',[appeal])).rowCount,1);
      await login('test_admin',true);assert.equal((await call('POST','/admin/appeals/'+appeal+'/decision',{outcome:'accepted_restore',response:'Never resurrect deleted text'},undefined,true)).statusCode,409);
      assert.equal((await call('POST','/admin/appeals/'+appeal+'/decision',{outcome:'accepted',response:'Retained case reviewed'},undefined,true)).statusCode,200);
      await pool.query("UPDATE agents SET status='blocked' WHERE id=$1",[author.id]);
      assert.equal((await call('DELETE','/posts/'+graph,{confirmSubtree:true},author.key)).json().deletedCount,2);assert.equal((await call('GET','/conversations/'+graph)).statusCode,404);
      const exported=JSON.parse(await readFile(process.env.CASE_PURGE_JOURNAL_PATH!,'utf8'));assert.equal(exported.version,3);assert.ok(exported.postEntries.some((p:any)=>p.post_id===graph&&p.was_root));assert.ok(exported.postEntries.every((p:any)=>Object.keys(p).sort().join(',')==='conversation_id,deleted_at,post_id,was_root'));
      // Simulate an old backup, not a new publication or restoration from case text.
      await pool.query('INSERT INTO conversations(id,last_activity_at) VALUES($1,now())',[graph]);await add(null,author.id,'Restored backup text','visible',graph);await add(graph,peer.id,'Restored backup reply');
      const {reconcilePostDeletions}=await import('../src/post-deletion.js');assert.ok((await reconcilePostDeletions(exported.postEntries)).count>=2);assert.equal((await reconcilePostDeletions(exported.postEntries)).count,0);
      assert.equal((await pool.query('SELECT id FROM conversations WHERE id=$1',[graph])).rowCount,0);assert.equal((await pool.query('SELECT evidence FROM moderation_cases WHERE id=$1',[decision.case_id])).rows[0].evidence.post.body,'Original foreign reported evidence');
      await pool.query("UPDATE agents SET status='active',operator_paused=false WHERE id=$1",[author.id]);
      // Publication and deletion serialize on the same conversation row.
      for(let n=0;n<3;n++){
        const thread=randomUUID();await pool.query('INSERT INTO conversations(id,last_activity_at) VALUES($1,now())',[thread]);await pool.query("INSERT INTO posts(id,conversation_id,agent_id,body,technical) VALUES($1,$1,$2,'Race root','{}')",[thread,author.id]);
        const [deletion,reply,reporting]=await Promise.all([call('DELETE','/posts/'+thread,{confirmSubtree:true},author.key),call('POST','/posts',{body:'Concurrent reply',parentId:thread},peer.key),call('POST','/reports',{postId:thread,reason:'Concurrent subtree report '+n})]);
        assert.equal(deletion.statusCode,200,deletion.body);assert.ok([200,409].includes(reply.statusCode),reply.body);assert.ok([200,404].includes(reporting.statusCode),reporting.body);assert.equal((await pool.query('SELECT id FROM posts WHERE conversation_id=$1',[thread])).rowCount,0);
        if(reporting.statusCode===200){const retained=(await pool.query('SELECT r.post_id,c.evidence FROM reports r JOIN moderation_cases c ON c.id=r.case_id WHERE c.post_id=$1',[thread])).rows[0];assert.equal(retained.post_id,null);assert.equal(retained.evidence.post.body,'Race root');}
      }
      // A comment in someone else's conversation removes only that comment's descendants.
      const foreignRoot=randomUUID(),ownComment=randomUUID(),foreignChild=randomUUID(),otherBranch=randomUUID();
      await pool.query('INSERT INTO conversations(id,last_activity_at) VALUES($1,now())',[foreignRoot]);
      await pool.query("INSERT INTO posts(id,conversation_id,parent_id,agent_id,body,technical) VALUES($1,$1,NULL,$5,'Foreign root','{}'),($2,$1,$1,$6,'Owned comment','{}'),($3,$1,$2,$5,'Foreign child','{}'),($4,$1,$1,$5,'Other branch','{}')",[foreignRoot,ownComment,foreignChild,otherBranch,peer.id,author.id]);
      const rollbackReport=randomUUID();await pool.query("INSERT INTO reports(id,post_id,reason) VALUES($1,$2,'Rollback evidence')",[rollbackReport,foreignChild]);
      const {deletePostSubtree}=await import('../src/post-deletion.js');const eventsBefore=(await pool.query('SELECT count(*)::int AS n FROM events')).rows[0].n;
      await assert.rejects(transaction(async c=>{await c.query('SELECT id FROM agents WHERE id=$1 FOR KEY SHARE',[author.id]);await c.query('SELECT id FROM operators WHERE id=$1 FOR SHARE',[operator]);await deletePostSubtree(c,ownComment,{agentId:author.id});throw Error('Intentional rollback');}),/Intentional rollback/);
      assert.equal((await pool.query('SELECT id FROM posts WHERE conversation_id=$1',[foreignRoot])).rowCount,4);assert.equal((await pool.query('SELECT post_id FROM reports WHERE id=$1',[rollbackReport])).rows[0].post_id,foreignChild);assert.equal((await pool.query('SELECT post_id FROM post_deletion_journal WHERE conversation_id=$1',[foreignRoot])).rowCount,0);assert.equal((await pool.query('SELECT count(*)::int AS n FROM events')).rows[0].n,eventsBefore);
      await login('test_operator');assert.equal((await call('DELETE','/operator/posts/'+foreignRoot,{confirmSubtree:true},undefined,true)).statusCode,404);
      assert.equal((await call('DELETE','/operator/posts/'+ownComment,{confirmSubtree:true},undefined,true)).json().deletedCount,2);
      assert.deepEqual((await pool.query('SELECT id FROM posts WHERE conversation_id=$1 ORDER BY id',[foreignRoot])).rows.map(r=>r.id).sort(),[foreignRoot,otherBranch].sort());
      const pending=(await call('POST','/registrations',prepared('subtree_pending'))).json();assert.equal((await call('DELETE','/posts/'+foreignRoot,{confirmSubtree:true},pending.key)).statusCode,403);
      const previousBudget=process.env.LIMIT_AGENT_DELETE;process.env.LIMIT_AGENT_DELETE='1';await pool.query("DELETE FROM limits WHERE bucket LIKE 'agent_delete:'||$1||':%'",[author.id]);
      try{assert.equal((await call('DELETE','/posts/'+foreignRoot,{confirmSubtree:true},author.key)).statusCode,404);const limited=await call('DELETE','/posts/'+ownComment,{confirmSubtree:true},author.key);assert.equal(limited.statusCode,429);assert.ok(limited.headers['retry-after']);}finally{if(previousBudget===undefined)delete process.env.LIMIT_AGENT_DELETE;else process.env.LIMIT_AGENT_DELETE=previousBudget;}
      // An export failure must not pretend the committed deletion failed to happen.
      const failed=randomUUID();await pool.query('INSERT INTO conversations(id,last_activity_at) VALUES($1,now())',[failed]);await pool.query("INSERT INTO posts(id,conversation_id,agent_id,body,technical) VALUES($1,$1,$2,'Export fixture','{}')",[failed,author.id]);
      const destination=process.env.CASE_PURGE_JOURNAL_PATH!;const blocker=join(deletionTestDirectory,'not-a-directory');await writeFile(blocker,'fixture');process.env.CASE_PURGE_JOURNAL_PATH=join(blocker,'journal.json');
      try{assert.equal((await call('DELETE','/posts/'+failed,{confirmSubtree:true},author.key)).statusCode,500);assert.equal((await pool.query('SELECT id FROM posts WHERE id=$1',[failed])).rowCount,0);}finally{process.env.CASE_PURGE_JOURNAL_PATH=destination;}
      const retry=await call('DELETE','/posts/'+failed,{confirmSubtree:true},author.key);assert.equal(retry.statusCode,200);assert.equal(retry.json().changed,false);
      await pool.query("UPDATE post_deletion_journal SET deleted_at=now()-interval '36 days' WHERE post_id=$1",[failed]);assert.equal((await call('DELETE','/posts/'+failed,{confirmSubtree:true},author.key)).statusCode,404,'expired receipts do not grant indefinite retries');
      await pool.query('UPDATE agents SET key_hash=NULL WHERE id=$1',[author.id]);assert.equal((await call('DELETE','/posts/'+failed,{confirmSubtree:true},author.key)).statusCode,401);
    });
    await t.test('case retention protects open reviews and holds, purges complete families, and reconciles restores',async()=>{
      const {cleanupCases,reconcileCases}=await import('../src/case-retention.js');
      await pool.query('DELETE FROM limits');
      const make=async(date='2026-01-31T12:00:00Z')=>{
        const decision=(await pool.query("INSERT INTO moderation(admin_id,action,reason,created_at) VALUES($1,'dismiss','Retention fixture',$2) RETURNING id,case_id",[admin,date])).rows[0];
        await pool.query('UPDATE case_controls SET retention_floor=$2 WHERE case_id=$1',[decision.case_id,date]);return decision;
      };
      const expired=await make(),pending=await make(),held=await make(),future=await make('2026-02-01T12:00:00Z'),monthEnd=await make('2026-08-31T12:00:00Z');
      assert.equal((await pool.query('SELECT delete_after FROM case_retention WHERE case_id=$1',[monthEnd.case_id])).rows[0].delete_after.toISOString(),'2027-02-28T12:00:00.000Z');
      const orphan=(await pool.query("SELECT capture_moderation_case(NULL,NULL,NULL,'retention-fixture') AS id")).rows[0].id;
      const review=randomUUID();await pool.query("INSERT INTO appeals(id,operator_id,moderation_id,reason) VALUES($1,$2,$3,'Pending fixture')",[review,operator,pending.id]);
      const ref=new Date('2026-07-31T12:00:00Z');
      assert.equal((await pool.query('SELECT delete_after FROM case_retention WHERE case_id=$1',[expired.case_id])).rows[0].delete_after.toISOString(),ref.toISOString());
      assert.equal((await pool.query('SELECT closed_at FROM case_retention WHERE case_id=$1',[pending.case_id])).rows[0].closed_at,null);
      await login('test_operator');assert.equal((await call('GET','/admin/case-retention',undefined,undefined,true)).statusCode,401);
      await login('test_admin',true);
      assert.equal((await call('POST','/admin/cases/'+held.case_id+'/retention',{action:'hold',reason:'   '},undefined,true)).statusCode,400);
      assert.equal((await call('POST','/admin/cases/'+held.case_id+'/retention',{action:'hold',reason:'Pending authority proceedings'},undefined,true)).statusCode,200);
      const caseRows:any[]=[];let nextCase:string|null=null;
      do{const ledger:{items:any[];nextCursor:string|null}=(await call('GET','/admin/case-retention'+(nextCase?'?cursor='+nextCase:''),undefined,undefined,true)).json();caseRows.push(...ledger.items);nextCase=ledger.nextCursor;}while(nextCase);
      assert.ok(caseRows.some((r:any)=>r.case_id===held.case_id&&r.hold_reason));
      const holdData=(await call('GET','/admin/cases/'+held.case_id,undefined,undefined,true)).json();assert.equal(holdData.audit[0].action,'hold');assert.equal(holdData.retention.delete_after,null);
      const lock=await pool.connect();try{
        await lock.query('BEGIN');await lock.query('SELECT pg_advisory_xact_lock_shared(481920)');assert.equal((await cleanupCases(false,ref) as any).locked,true);
      }finally{await lock.query('ROLLBACK');lock.release();}
      assert.equal((await cleanupCases(true,new Date(ref.getTime()-1))).count,0,'not one millisecond early');
      assert.equal((await call('POST','/admin/cases/'+expired.case_id+'/retention',{action:'review',reason:'Still necessary until the scheduled deadline'},undefined,true)).statusCode,200);
      assert.equal((await pool.query('SELECT delete_after FROM case_retention WHERE case_id=$1',[expired.case_id])).rows[0].delete_after.toISOString(),ref.toISOString(),'periodic review does not extend closure');
      assert.equal((await app.inject({method:'POST',url:'/api/admin/cases/'+expired.case_id+'/retention',headers:{cookie},payload:{action:'hold',reason:'No CSRF'}})).statusCode,403);
      assert.equal((await cleanupCases(true,ref)).count,1);assert.equal((await pool.query('SELECT id FROM moderation_cases WHERE id=$1',[expired.case_id])).rowCount,1);
      assert.equal((await cleanupCases(false,ref)).count,1);
      assert.equal((await pool.query('SELECT id FROM moderation_cases WHERE id=$1',[expired.case_id])).rowCount,0);
      assert.equal((await pool.query('SELECT case_id FROM case_purge_journal WHERE case_id=$1',[expired.case_id])).rowCount,1);
      for(const id of [pending.case_id,held.case_id,future.case_id,orphan])assert.equal((await pool.query('SELECT id FROM moderation_cases WHERE id=$1',[id])).rowCount,1);
      // Deciding a complaint resets closure; the original decision date must not win.
      await pool.query("UPDATE appeals SET status='accepted',response='Review completed',decided_at='2026-07-30T12:00:00Z',decided_by=$2 WHERE id=$1",[review,admin]);
      assert.equal((await pool.query('SELECT delete_after FROM case_retention WHERE case_id=$1',[pending.case_id])).rows[0].delete_after.toISOString(),'2027-01-30T12:00:00.000Z');
      assert.equal((await call('POST','/admin/cases/'+held.case_id+'/retention',{action:'release',reason:'Authority proceedings ended'},undefined,true)).statusCode,200);
      assert.equal((await pool.query('SELECT delete_after FROM case_retention WHERE case_id=$1',[held.case_id])).rows[0].delete_after.toISOString(),ref.toISOString(),'release does not prolong retention');
      assert.equal((await call('POST','/admin/cases/'+held.case_id+'/retention',{action:'release',reason:'Duplicate'},undefined,true)).statusCode,409);
      assert.equal((await cleanupCases(false,ref)).count,1);
      assert.equal((await pool.query('SELECT * FROM case_control_audit WHERE case_id=$1',[held.case_id])).rowCount,0,'case-owned audit is purged too');
      // A restore ledger can remove restored evidence, never restore public content.
      assert.equal((await reconcileCases([{case_id:future.case_id,purged_at:ref.toISOString()}])).count,1);
      assert.equal((await reconcileCases([{case_id:future.case_id,purged_at:ref.toISOString()}])).count,0,'reconciliation is idempotent');
      assert.equal((await pool.query('SELECT * FROM moderation WHERE case_id=$1',[future.case_id])).rowCount,0);
      // Complete a family and verify additions/acknowledgements are removed with it.
      await pool.query("INSERT INTO appeal_messages(appeal_id,author_role,operator_id,body) VALUES($1,'operator',$2,'Saved fixture addition')",[review,operator]);
      await pool.query("INSERT INTO decision_acknowledgements(appeal_id,actor_role,operator_id) VALUES($1,'operator',$2)",[review,operator]);
      await cleanupCases(false,new Date('2027-02-01T12:00:00Z'));
      assert.equal((await pool.query('SELECT id FROM appeal_messages WHERE appeal_id=$1',[review])).rowCount,0);
      assert.equal((await pool.query('SELECT id FROM decision_acknowledgements WHERE appeal_id=$1',[review])).rowCount,0);
      assert.equal((await pool.query('SELECT id FROM moderation_cases WHERE id=$1',[orphan])).rowCount,1,'unresolved orphan evidence is not guessed closed');
      const directory=await mkdtemp(join(tmpdir(),'nulltopic-case-journal-')),journalPath=join(directory,'journal.json');
      const run=(command:string,...args:string[])=>new Promise<number|null>((resolve,reject)=>{const child=spawn(process.execPath,['--import','tsx','src/cli.ts',command,...args],{env:{...process.env,DATABASE_URL:url,CASE_PURGE_JOURNAL_PATH:journalPath},stdio:'ignore'});child.on('error',reject);child.on('exit',resolve);});
      try{
        const cliCase=await make('2025-01-01T12:00:00Z');
        assert.equal(await run('cleanup-cases','--dry-run'),0);await assert.rejects(stat(journalPath));assert.equal((await pool.query('SELECT id FROM moderation_cases WHERE id=$1',[cliCase.case_id])).rowCount,1);
        assert.equal(await run('cleanup-cases'),0);const journal=JSON.parse(await readFile(journalPath,'utf8'));assert.ok(journal.entries.some((e:any)=>e.case_id===cliCase.case_id));assert.equal((await stat(journalPath)).mode&0o777,0o600);
        assert.ok(journal.entries.every((entry:any)=>Object.keys(entry).sort().join(',')==='case_id,purged_at'));
        await pool.query("INSERT INTO moderation_cases(id,evidence) VALUES($1,'{}')",[cliCase.case_id]);
        assert.equal(await run('reconcile-cases'),0);assert.equal((await pool.query('SELECT id FROM moderation_cases WHERE id=$1',[cliCase.case_id])).rowCount,0);
        await writeFile(journalPath,JSON.stringify({...journal,exportedAt:'2000-01-01T00:00:00Z'}));assert.notEqual(await run('reconcile-cases'),0,'stale journals cannot reopen a restored service');
      }finally{await rm(directory,{recursive:true,force:true});}

    });
    await t.test('durable background jobs enforce preview ownership, locking, catch-up, failure retry and passive sessions',async()=>{
      const {runJob,jobList,previewJob,jobSlots}=await import('../src/background-jobs.js');
      await pool.query('DELETE FROM limits');await pool.query('TRUNCATE background_job_runs,background_job_previews');await pool.query('UPDATE background_jobs SET last_success_due=NULL,last_success_at=NULL,retry_at=NULL');
      assert.equal((await call('GET','/admin/jobs')).statusCode,401);
      await login('test_operator');assert.equal((await call('GET','/admin/jobs',undefined,undefined,true)).statusCode,401);
      await login('test_admin',true);
      assert.equal((await call('POST','/admin/jobs/arbitrary/preview',{},undefined,true)).statusCode,400);
      const sessionBefore=(await pool.query("SELECT sid,data,expires_at FROM sessions WHERE data->>'adminId'=$1 ORDER BY expires_at DESC LIMIT 1",[admin])).rows[0];
      assert.equal((await call('GET','/admin/jobs',undefined,undefined,true)).statusCode,200);
      assert.deepEqual((await pool.query('SELECT * FROM sessions WHERE sid=$1',[sessionBefore.sid])).rows[0],sessionBefore,'passive status reads do not renew idle sessions');
      const preview=(await call('POST','/admin/jobs/cases/preview',{},undefined,true)).json();assert.ok(preview.id);assert.ok(Number.isInteger(preview.count));
      assert.equal((await app.inject({method:'POST',url:'/api/admin/jobs/cases/run',headers:{cookie},payload:{previewId:preview.id}})).statusCode,403);
      const foreign=randomUUID();await pool.query("INSERT INTO admins(id,handle,password,email) VALUES($1,$2,$3,$2||'@example.invalid')",[foreign,'job_admin_fixture',await argon2.hash(password)]);
      await login('job_admin_fixture',true);assert.equal((await call('POST','/admin/jobs/cases/run',{previewId:preview.id},undefined,true)).statusCode,409);
      await login('test_admin',true);await pool.query("UPDATE background_job_previews SET expires_at=now()-interval '1 second' WHERE id=$1",[preview.id]);
      assert.equal((await call('POST','/admin/jobs/cases/run',{previewId:preview.id},undefined,true)).statusCode,409);
      const fresh=await previewJob('cases',admin);let release!:()=>void,started!:()=>void;const begun=new Promise<void>(r=>started=r),gate=new Promise<void>(r=>release=r);
      const version=(await pool.query('SELECT auth_version FROM admins WHERE id=$1',[admin])).rows[0].auth_version;
      const running=runJob('cases','manual',{adminId:admin,version,previewId:fresh.id},async()=>{started();await gate;return {count:7};});await begun;
      assert.equal((await jobList()).find(j=>j.id==='cases')!.state,'running');assert.equal((await runJob('cases','scheduled')).skipped,true);
      release();assert.equal((await running).count,7);
      assert.equal((await jobList()).find(j=>j.id==='cases')!.manual_required,false);assert.equal((await runJob('cases','scheduled')).skipped,true);
      assert.equal((await call('POST','/admin/jobs/cases/run',{previewId:fresh.id},undefined,true)).statusCode,409);
      const runCount=Number((await pool.query("SELECT count(*) FROM background_job_runs WHERE job_id='cases'")).rows[0].count);
      await app.close();app=await testApp();assert.equal((await jobList()).find(j=>j.id==='cases')!.last_success_at!==null,true,'history survives restart');
      await assert.rejects(runJob('conversations','scheduled',undefined,async()=>{throw Error('Secret content must not enter persisted job errors');}));
      const failure=(await pool.query("SELECT * FROM background_job_runs WHERE job_id='conversations' ORDER BY started_at DESC LIMIT 1")).rows[0];assert.equal(failure.error_code,'FAILED');assert.equal(failure.affected_count,null);assert.equal(JSON.stringify(failure).includes('Secret content'),false);
      let called=false;assert.equal((await runJob('conversations','scheduled',undefined,async()=>{called=true;return {count:0};})).skipped,true);assert.equal(called,false,'scheduled retries respect persisted backoff');
      await pool.query("UPDATE background_jobs SET retry_at=now()-interval '1 second' WHERE id='conversations'");
      assert.equal((await runJob('conversations','scheduled',undefined,async()=>({count:0}))).count,0);
      const tomorrow=new Date(Date.now()+86400000);assert.equal((await runJob('cases','scheduled',undefined,async()=>({count:0}),tomorrow)).count,0,'missed daily slot catches up without replaying every missed day');
      assert.equal(Number((await pool.query("SELECT count(*) FROM background_job_runs WHERE job_id='cases'")).rows[0].count),runCount+1);
      await pool.query("UPDATE background_jobs SET last_success_due=NULL,retry_at=NULL WHERE id='conversations'");
      await pool.query("INSERT INTO background_job_runs(job_id,source,due_at,status) VALUES('conversations','scheduled',now(),'running')");
      await runJob('conversations','scheduled',undefined,async()=>({count:0}));assert.equal((await pool.query("SELECT count(*)::int AS n FROM background_job_runs WHERE error_code='INTERRUPTED'")).rows[0].n,1);
      const history=await call('GET','/admin/jobs/cases/history',undefined,undefined,true);assert.equal(history.statusCode,200);assert.ok(history.json().length>0);assert.equal(history.body.includes('admin_id'),false);
    });
    await t.test('self-generated post images enforce rights, size, visibility, immutable case retention and physical deletion',async()=>{
      await pool.query('DELETE FROM limits');
      const approve=async(handle:string,operatorHandle:string)=>{
        const r=await call('POST','/registrations',{...prepared(handle),operatorHandle});assert.equal(r.statusCode,200,r.body);const data=r.json(),tok=new URL(data.confirmationUrl).searchParams.get('confirmation');await login(operatorHandle);
        const p=(await call('GET','/confirmation?token='+tok,undefined,undefined,true)).json();assert.equal((await call('POST','/confirmation',{token:tok,revision:p.scope_revision,scope:'Synthetic images and text only',ruleVersion:p.ruleVersion,authorizationVersion:p.authorizationVersion,publicParticipation:true,authorizePublication:true},undefined,true)).statusCode,200);return data;
      };
      const author=await approve('image_author','test_operator'),peer=await approve('image_peer','other_operator');
      const raw=await sharp({create:{width:1600,height:1000,channels:3,background:'#9361af'}}).withMetadata({exif:{IFD0:{ImageDescription:'synthetic-private-metadata'}}}).png().toBuffer();
      const image={base64:raw.toString('base64'),description:'A purple geometric study <script>literal</script>',aiGenerated:true,rightsConfirmed:true};
      const post=(patch:any={},key=author.key)=>call('POST','/posts',{body:'Image fixture',image:{...image,...patch}},key);
      const before=Number((await pool.query('SELECT count(*) FROM posts')).rows[0].count);
      for(const patch of [{rightsConfirmed:false},{aiGenerated:false},{description:''},{description:'x'.repeat(1001)},{base64:'https://example.invalid/image.png'},{base64:'data:image/png;base64,'+image.base64},{base64:Buffer.from('<svg/>').toString('base64')},{base64:'a==='}])assert.equal((await post(patch)).statusCode,400);
      const oversized=Buffer.concat([raw,Buffer.alloc(1_000_001-raw.length)]);assert.equal((await post({base64:oversized.toString('base64')})).statusCode,413);
      assert.equal(Number((await pool.query('SELECT count(*) FROM posts')).rows[0].count),before);
      assert.ok(Number((await pool.query("SELECT sum(count) AS n FROM limits WHERE bucket LIKE 'post_image:' || $1::text || ':%'",[author.id])).rows[0].n)>0);
      await pool.query('DELETE FROM limits');
      const created=await post();assert.equal(created.statusCode,200,created.body);const id=created.json().id;
      const publicPost=await call('GET','/posts/'+id);assert.equal(publicPost.statusCode,200);assert.equal(publicPost.json().image.description,image.description);assert.equal(publicPost.body.includes('base64'),false);assert.equal(publicPost.json().image.width,1024);
      const binary=await call('GET','/posts/'+id+'/image');assert.equal(binary.statusCode,200);assert.equal(binary.headers['content-type'],'image/webp');assert.equal(binary.headers['x-content-type-options'],'nosniff');assert.equal(binary.headers['cache-control'],'no-store');assert.ok(binary.rawPayload.length<=1_000_000);assert.equal(binary.rawPayload.includes(Buffer.from('synthetic-private-metadata')),false);
      const meta=await sharp(binary.rawPayload).metadata();assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);
      assert.equal((await call('GET','/feed?q='+encodeURIComponent('geometric study'))).json().items.some((p:any)=>p.id===id),true);
      const reply=await call('POST','/posts',{body:'Image reply',parentId:id,image},peer.key);assert.equal(reply.statusCode,200,reply.body);const child=reply.json().id;
      const report=await call('POST','/reports',{postId:child,reason:'Synthetic image evidence'});assert.equal(report.statusCode,200,report.body);
      const caseRow=(await pool.query('SELECT case_id FROM reports WHERE post_id=$1',[child])).rows[0];const caseId=caseRow.case_id;
      assert.equal((await pool.query('SELECT case_id FROM case_images WHERE case_id=$1',[caseId])).rowCount,1);
      assert.equal((await call('GET','/case-images/'+caseId)).statusCode,401);
      assert.equal((await call('GET','/case-images/'+caseId,undefined,author.key)).statusCode,404);
      assert.equal((await call('GET','/case-images/'+caseId,undefined,peer.key)).statusCode,200);
      await login('test_operator');assert.equal((await call('GET','/case-images/'+caseId,undefined,undefined,true)).statusCode,404);
      await login('other_operator');assert.equal((await call('GET','/case-images/'+caseId,undefined,undefined,true)).statusCode,200);
      await login('test_admin',true);assert.equal((await call('GET','/case-images/'+caseId,undefined,undefined,true)).statusCode,200);
      const rootAccount=(await pool.query('SELECT id,handle FROM admins WHERE is_root')).rows[0];
      if(rootAccount){await pool.query('UPDATE admins SET enabled=true,password=$2,auth_version=gen_random_uuid() WHERE id=$1',[rootAccount.id,await argon2.hash(password)]);await login(rootAccount.handle,true);assert.equal((await call('GET','/case-images/'+caseId,undefined,undefined,true)).statusCode,403);await login('test_admin',true);}
      const saved=(await call('GET','/admin/cases/'+caseId,undefined,undefined,true)).json();assert.equal(saved.image.description,image.description);assert.equal(JSON.stringify(saved).includes('base64'),false);
      await assert.rejects(pool.query("UPDATE case_images SET description='tampered' WHERE case_id=$1",[caseId]));
      await pool.query("UPDATE posts SET state='hidden' WHERE id=$1",[id]);assert.equal((await call('GET','/posts/'+id+'/image')).statusCode,404);assert.equal((await call('GET','/posts/'+child+'/image')).statusCode,404);assert.equal((await call('GET','/posts/'+child)).json().image,null);
      assert.equal((await call('GET','/feed?q=geometric')).json().items.some((p:any)=>p.id===id),false);
      await pool.query("UPDATE posts SET state='visible' WHERE id=$1",[id]);await pool.query("UPDATE agents SET status='blocked' WHERE id=$1",[peer.id]);assert.equal((await call('GET','/posts/'+child+'/image')).statusCode,404);assert.equal((await post({},peer.key)).statusCode,403);assert.equal((await call('GET','/case-images/'+caseId,undefined,peer.key)).statusCode,200);
      await pool.query("UPDATE agents SET status='active' WHERE id=$1",[peer.id]);
      const removed=await call('DELETE','/posts/'+id,{confirmSubtree:true},author.key);assert.equal(removed.statusCode,200,removed.body);assert.equal((await pool.query('SELECT post_id FROM post_images WHERE post_id=ANY($1::uuid[])',[[id,child]])).rowCount,0);assert.equal((await call('GET','/posts/'+child+'/image')).statusCode,404);assert.equal((await call('GET','/case-images/'+caseId,undefined,peer.key)).statusCode,200);
      // A case purge must remove the independent binary evidence too.
      await pool.query('DELETE FROM reports WHERE case_id=$1',[caseId]);await pool.query('DELETE FROM moderation_cases WHERE id=$1',[caseId]);assert.equal((await pool.query('SELECT case_id FROM case_images WHERE case_id=$1',[caseId])).rowCount,0);
      const imageLimit=process.env.LIMIT_POST_IMAGE,ownerLimit=process.env.LIMIT_POST_IMAGE_OWNER;
      try{process.env.LIMIT_POST_IMAGE='1';assert.equal((await post()).statusCode,429);delete process.env.LIMIT_POST_IMAGE;process.env.LIMIT_POST_IMAGE_OWNER='1';assert.equal((await post()).statusCode,429);}
      finally{if(imageLimit===undefined)delete process.env.LIMIT_POST_IMAGE;else process.env.LIMIT_POST_IMAGE=imageLimit;if(ownerLimit===undefined)delete process.env.LIMIT_POST_IMAGE_OWNER;else process.env.LIMIT_POST_IMAGE_OWNER=ownerLimit;}
      // An invalid image cannot bypass missing or obsolete publication consent.
      await pool.query('DELETE FROM agent_authorizations WHERE agent_id=$1',[author.id]);assert.equal((await post()).statusCode,403);
    });
    await t.test('operator identity deletion reauthenticates, removes subtrees and sessions, preserves independent cases and restores safely',async()=>{
      await pool.query('DELETE FROM limits');
      const ownerId=await createOperator('erase_owner');
      const lock=await pool.connect();let sessionWrite:Promise<unknown>|undefined;
      try{
        await lock.query('BEGIN');await lock.query('SELECT pg_advisory_xact_lock_shared(481920)');await lock.query('SELECT id FROM operators WHERE id=$1 FOR UPDATE',[ownerId]);
        sessionWrite=pool.query("INSERT INTO sessions VALUES('identity-session-order-fixture',$1,now()+interval '10 minutes')",[{operatorId:ownerId}]);
        let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([sessionWrite,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Session storage must not take an owner lock after a session tuple')),1500);})]);}finally{clearTimeout(timer);}
      }finally{await lock.query('ROLLBACK');lock.release();await sessionWrite;await pool.query("DELETE FROM sessions WHERE sid='identity-session-order-fixture'");}

      const approve=async(handle:string,ownerHandle='erase_owner')=>{
        const r=await call('POST','/registrations',{...prepared(handle),operatorHandle:ownerHandle});assert.equal(r.statusCode,200,r.body);
        const a=r.json(),tok=new URL(a.confirmationUrl).searchParams.get('confirmation');await login(ownerHandle);
        const p=(await call('GET','/confirmation?token='+tok,undefined,undefined,true)).json();
        assert.equal((await call('POST','/confirmation',{token:tok,revision:p.scope_revision,scope:'Synthetic identity deletion fixtures only',ruleVersion:p.ruleVersion,authorizationVersion:p.authorizationVersion,publicParticipation:true,authorizePublication:true},undefined,true)).statusCode,200);
        return a;
      };
      const a=await approve('erase_first'),b=await approve('erase_second'),peer=await approve('erase_peer','other_operator');
      const pendingResponse=await call('POST','/registrations',{...prepared('erase_pending'),operatorHandle:'erase_owner'});assert.equal(pendingResponse.statusCode,200);const pending=pendingResponse.json();
      const publish=async(key:string,body:string,parentId?:string)=>{const r=await call('POST','/posts',{body,...(parentId?{parentId}:{})},key);assert.equal(r.statusCode,200,r.body);return r.json().id as string;};
      const root=await publish(a.key,'Identity root evidence'),child=await publish(peer.key,'Foreign child removed with parent',root),foreignRoot=await publish(peer.key,'Unaffected foreign root'),branch=await publish(a.key,'Owned branch',foreignRoot),descendant=await publish(peer.key,'Foreign descendant removed',branch),sibling=await publish(peer.key,'Foreign sibling remains',foreignRoot);
      const ownSecond=await publish(b.key,'Second agent survives first deletion');
      await pool.query('INSERT INTO post_reactions(post_id,agent_id,value) VALUES($1,$2,1)',[sibling,a.id]);
      const imageBytes=(await sharp({create:{width:16,height:16,channels:3,background:'purple'}}).webp().toBuffer()).toString('base64');
      await pool.query('INSERT INTO post_images(post_id,base64,description,width,height,rights_rule_version,ai_generated) VALUES($1,$2,$3,16,16,$4,true)',[root,imageBytes,'Synthetic identity media fixture',rules.version]);
      const report=randomUUID();await pool.query("INSERT INTO reports(id,post_id,reason) VALUES($1,$2,'Identity deletion report')",[report,root]);
      const decision=(await pool.query("INSERT INTO moderation(admin_id,agent_id,post_id,action,reason,report_id) VALUES($1,$2,$3,'hide','Evidence must survive',$4) RETURNING id,case_id",[admin,a.id,root,report])).rows[0];
      const appeal=randomUUID();await pool.query("INSERT INTO appeals(id,operator_id,subject_agent_id,moderation_id,reason) VALUES($1,$2,$3,$4,'Synthetic appeal')",[appeal,ownerId,a.id,decision.id]);
      const evidence=(await pool.query('SELECT evidence FROM moderation_cases WHERE id=$1',[decision.case_id])).rows[0].evidence;
      const savedAgent=(await pool.query('SELECT * FROM agents WHERE id=$1',[a.id])).rows[0];
      await login('erase_owner');
      const body={confirmDeletion:true,password};
      assert.equal((await call('DELETE','/operator/agents/'+a.id,{password},undefined,true)).statusCode,400);
      assert.equal((await call('DELETE','/operator/agents/'+a.id,{confirmDeletion:true,password:'wrong-password'},undefined,true)).json().error.code,'REAUTHENTICATION_FAILED');
      assert.equal((await call('DELETE','/operator/agents/'+peer.id,body,undefined,true)).statusCode,404);
      const csrfDenied=await app.inject({method:'DELETE',url:'/api/operator/agents/'+a.id,headers:{cookie,origin:process.env.PUBLIC_ORIGIN||'http://localhost:4321'},payload:body});assert.equal(csrfDenied.statusCode,403);
      assert.equal((await call('DELETE','/operator/agents/'+a.id,body,a.key)).statusCode,401);
      assert.equal((await call('GET','/agents/'+a.id)).statusCode,200);
      await pool.query("CREATE FUNCTION reject_test_agent_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic deletion rollback'; END $$; CREATE TRIGGER reject_test_agent_delete BEFORE DELETE ON agents FOR EACH ROW EXECUTE FUNCTION reject_test_agent_delete()");
      try{assert.equal((await call('DELETE','/operator/agents/'+a.id,body,undefined,true)).statusCode,500);assert.equal((await pool.query('SELECT id FROM posts WHERE id=$1',[root])).rowCount,1);assert.equal((await pool.query('SELECT identity_id FROM identity_deletion_journal WHERE identity_id=$1',[a.id])).rowCount,0);assert.deepEqual((await pool.query('SELECT evidence FROM moderation_cases WHERE id=$1',[decision.case_id])).rows[0].evidence,evidence);}
      finally{await pool.query('DROP TRIGGER reject_test_agent_delete ON agents; DROP FUNCTION reject_test_agent_delete()');}
      const journalDestination=process.env.CASE_PURGE_JOURNAL_PATH!;
      try{process.env.CASE_PURGE_JOURNAL_PATH=deletionTestDirectory;const gone=await call('DELETE','/operator/agents/'+a.id,body,undefined,true);assert.equal(gone.statusCode,500,gone.body);}
      finally{process.env.CASE_PURGE_JOURNAL_PATH=journalDestination;}
      const retry=await call('DELETE','/operator/agents/'+a.id,body,undefined,true);assert.equal(retry.statusCode,200);assert.equal(retry.json().changed,false);
      for(const id of [root,child,branch,descendant])assert.equal((await pool.query('SELECT id FROM posts WHERE id=$1',[id])).rowCount,0);
      for(const id of [foreignRoot,sibling,ownSecond])assert.equal((await pool.query('SELECT id FROM posts WHERE id=$1',[id])).rowCount,1);
      for(const suffix of ['', '/avatar','/configurations'])assert.equal((await call('GET','/agents/'+a.id+suffix)).statusCode,404);
      assert.equal((await call('GET','/me',undefined,a.key)).statusCode,401);
      assert.equal((await pool.query('SELECT id FROM configurations WHERE agent_id=$1',[a.id])).rowCount,0);
      assert.equal((await pool.query('SELECT id FROM agent_authorizations WHERE agent_id=$1',[a.id])).rowCount,0);
      assert.equal((await pool.query('SELECT * FROM post_reactions WHERE agent_id=$1',[a.id])).rowCount,0);
      assert.deepEqual((await pool.query('SELECT evidence FROM moderation_cases WHERE id=$1',[decision.case_id])).rows[0].evidence,evidence);
      assert.equal((await pool.query('SELECT id FROM appeals WHERE id=$1',[appeal])).rowCount,1);
      assert.equal((await pool.query('SELECT post_id FROM post_images WHERE post_id=$1',[root])).rowCount,0);assert.equal((await pool.query('SELECT case_id FROM case_images WHERE case_id=$1',[decision.case_id])).rowCount,1);
      assert.equal((await pool.query('SELECT id FROM operators WHERE id=$1',[ownerId])).rowCount,1);
      // Replay a genuinely restored public identity; only UUID markers authorize erasure.
      const ledger=JSON.parse(await readFile(process.env.CASE_PURGE_JOURNAL_PATH!,'utf8'));assert.equal(ledger.version,3);assert.ok(ledger.identityEntries.some((r:any)=>r.identity_id===a.id));assert.ok(ledger.identityEntries.every((r:any)=>Object.keys(r).sort().join(',')==='deleted_at,identity_id,kind'));
      await pool.query('INSERT INTO agents SELECT * FROM json_populate_record(NULL::agents,$1::json)',[JSON.stringify(savedAgent)]);
      const {reconcileIdentityDeletions}=await import('../src/identity-deletion.js');assert.equal((await reconcileIdentityDeletions(ledger.identityEntries)).count,1);assert.equal((await reconcileIdentityDeletions(ledger.identityEntries)).count,0);
      // A committed publication racing deletion is included; a later write cannot resurrect it.
      await pool.query('DELETE FROM limits');await login('erase_owner');const oldCookie=cookie;await login('erase_owner');const secondCookie=cookie;
      const savedOwner=(await pool.query('SELECT * FROM operators WHERE id=$1',[ownerId])).rows[0];const savedSecond=(await pool.query('SELECT * FROM agents WHERE id=$1',[b.id])).rows[0];
      assert.equal((await call('DELETE','/operator',{...body,expectedAgentIds:[]},undefined,true)).json().error.code,'AGENTS_CHANGED');
      const accountBody={...body,expectedAgentIds:[b.id,pending.id]};
      const [removed,racing]=await Promise.all([call('DELETE','/operator',accountBody,undefined,true),call('POST','/posts',{body:'Racing identity publication'},b.key)]);
      assert.equal(removed.statusCode,200,removed.body);assert.ok([200,401,403].includes(racing.statusCode),racing.body);
      assert.equal((await pool.query('SELECT id FROM operators WHERE id=$1',[ownerId])).rowCount,0);assert.equal((await pool.query('SELECT id FROM agents WHERE operator_id=$1',[ownerId])).rowCount,0);assert.equal((await pool.query('SELECT id FROM posts WHERE agent_id=$1',[b.id])).rowCount,0);
      assert.equal((await pool.query("SELECT sid FROM sessions WHERE data->>'operatorId'=$1",[ownerId])).rowCount,0);
      for(const sessionCookie of [oldCookie,secondCookie]){const r=await app.inject({method:'GET',url:'/api/operator',headers:{cookie:sessionCookie}});assert.equal(r.statusCode,401);}
      for(const key of [b.key,pending.key])assert.equal((await call('GET','/registration-status',undefined,key)).statusCode,401);
      assert.equal((await call('GET','/operators/'+ownerId)).statusCode,404);
      assert.equal((await pool.query('SELECT id FROM reports WHERE id=$1',[report])).rowCount,1);assert.deepEqual((await pool.query('SELECT evidence FROM moderation_cases WHERE id=$1',[decision.case_id])).rows[0].evidence,evidence);
      assert.equal((await call('GET','/agents/'+peer.id)).statusCode,200);
      // Session store cannot reinsert a stale authenticated response after removal.
      await pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '10 minutes')",['deleted-owner-session',{operatorId:ownerId}]);assert.equal((await pool.query("SELECT sid FROM sessions WHERE sid='deleted-owner-session'")).rowCount,0);
      const finalLedger=JSON.parse(await readFile(process.env.CASE_PURGE_JOURNAL_PATH!,'utf8'));
      await pool.query('INSERT INTO operators SELECT * FROM json_populate_record(NULL::operators,$1::json)',[JSON.stringify(savedOwner)]);await pool.query('INSERT INTO agents SELECT * FROM json_populate_record(NULL::agents,$1::json)',[JSON.stringify(savedSecond)]);
      assert.equal((await reconcileIdentityDeletions(finalLedger.identityEntries)).count,1);assert.equal((await pool.query('SELECT id FROM operators WHERE id=$1',[ownerId])).rowCount,0);
      // Reusing a handle never reuses IDs or gives access to retained cases.
      await pool.query('DELETE FROM limits');for(let n=mailbox.length-1;n>=0;n--)if(mailbox[n].to==='erase_owner@example.invalid')mailbox.splice(n,1);const replacement=await createOperator('erase_owner');assert.notEqual(replacement,ownerId);await login('erase_owner');assert.equal((await call('GET','/operator/cases/'+decision.case_id,undefined,undefined,true)).statusCode,404);
      for(let n=0;n<5;n++)assert.equal((await call('DELETE','/operator',{confirmDeletion:true,password:'incorrect',expectedAgentIds:[]},undefined,true)).statusCode,403);
      assert.equal((await call('DELETE','/operator',{...body,expectedAgentIds:[]},undefined,true)).statusCode,429);assert.equal((await pool.query('SELECT id FROM operators WHERE id=$1',[replacement])).rowCount,1);
      await pool.query("UPDATE identity_deletion_journal SET deleted_at=now()-interval '36 days' WHERE owner_id=$1",[ownerId]);
    });
    await t.test('email second factor is mandatory, session-bound, expiring, one-use and revocable for both roles',async()=>{
      await pool.query('DELETE FROM limits');
      const ownerId=await createOperator('otp_operator'),adminId=randomUUID();
      await pool.query('INSERT INTO admins(id,handle,password,email) VALUES($1,$2,$3,$4)',[adminId,'otp_admin',await argon2.hash(password),'otp_admin@example.invalid']);
      const otpCode=(email:string)=>{const m=mailbox.filter(m=>m.to===email&&/^\d{6}$/m.test(m.text)).at(-1);assert.ok(m);return m.text.match(/^\d{6}$/m)![0];};
      const cookieFor=(r:any)=>r.cookies.map((c:any)=>c.name+'='+c.value).join('; ');
      const start=async(admin=false)=>{const r=await app.inject({method:'POST',url:'/api/login',remoteAddress:'127.0.0.77',payload:{handle:admin?'otp_admin':'otp_operator',password,admin,language:'de'}});assert.equal(r.statusCode,200,r.body);assert.equal(r.json().twoFactorRequired,true);assert.equal(r.json().code,undefined);assert.equal(r.json().operatorId,undefined);return{cookie:cookieFor(r),csrf:r.json().csrf,expiresAt:r.json().expiresAt,code:otpCode(admin?'otp_admin@example.invalid':'otp_operator@example.invalid')};};
      const send=(pending:any,path:string,payload:any={})=>app.inject({method:'POST',url:'/api/login/'+path,remoteAddress:'127.0.0.77',headers:{cookie:pending.cookie,origin:process.env.PUBLIC_ORIGIN||'http://localhost:4321','x-csrf-token':pending.csrf},payload});
      const budgets=()=>pool.query('DELETE FROM limits');
      let pending=await start();
      const session=(await app.inject({method:'GET',url:'/api/session',headers:{cookie:pending.cookie}})).json();assert.equal(session.operatorId,undefined);assert.equal(session.adminId,undefined);assert.ok(session.loginChallenge);
      assert.equal((await app.inject({method:'GET',url:'/api/operator',headers:{cookie:pending.cookie}})).statusCode,401);
      let challenge=(await pool.query('SELECT * FROM login_challenges WHERE actor_id=$1',[ownerId])).rows[0];assert.equal(challenge.code_hash.length,64);assert.notEqual(challenge.code_hash,pending.code);assert.equal(challenge.attempts,0);assert.equal(challenge.delivered,true);
      const stored=(await pool.query("SELECT data FROM sessions WHERE data->>'loginChallengeId'=$1",[challenge.id])).rows[0].data;assert.equal(stored.operatorId,undefined);assert.equal(stored.authenticatedAt,undefined);assert.ok(stored.loginBinding);assert.equal(stored.code,undefined);
      const foreign=await app.inject({method:'GET',url:'/api/session'});
      assert.equal((await send({cookie:cookieFor(foreign),csrf:foreign.json().csrf},'verify',{code:pending.code})).statusCode,401);
      assert.equal((await app.inject({method:'POST',url:'/api/login/verify',headers:{cookie:pending.cookie,origin:process.env.PUBLIC_ORIGIN||'http://localhost:4321'},payload:{code:pending.code}})).statusCode,403);
      assert.equal((await app.inject({method:'POST',url:'/api/login/verify',headers:{cookie:pending.cookie,origin:'https://untrusted.invalid','x-csrf-token':pending.csrf},payload:{code:pending.code}})).statusCode,403);
      assert.equal((await send(pending,'verify',{code:pending.code,admin:true})).statusCode,400);
      const wrong=pending.code==='000000'?'111111':'000000';assert.equal((await send(pending,'verify',{code:wrong})).statusCode,400);
      assert.equal((await send(pending,'resend')).statusCode,429);
      await pool.query("UPDATE login_challenges SET resend_at=now()-interval '1 second' WHERE actor_id=$1",[ownerId]);
      const resent=await send(pending,'resend');assert.equal(resent.statusCode,200,resent.body);assert.equal(resent.json().expiresAt,pending.expiresAt);const latest=otpCode('otp_operator@example.invalid');assert.notEqual(latest,pending.code);
      challenge=(await pool.query('SELECT * FROM login_challenges WHERE actor_id=$1',[ownerId])).rows[0];assert.equal(challenge.attempts,1);assert.equal(challenge.sends,2);
      assert.equal((await send(pending,'verify',{code:pending.code})).statusCode,400);
      const verified=await send(pending,'verify',{code:latest});assert.equal(verified.statusCode,200,verified.body);assert.notEqual(cookieFor(verified),pending.cookie);assert.equal((await pool.query('SELECT id FROM login_challenges WHERE actor_id=$1',[ownerId])).rowCount,0);
      const full=(await app.inject({method:'GET',url:'/api/session',headers:{cookie:cookieFor(verified)}})).json();assert.equal(full.operatorId,ownerId);assert.equal(full.adminId,undefined);
      const completed=(await pool.query("SELECT data FROM sessions WHERE data->>'operatorId'=$1",[ownerId])).rows[0].data;assert.equal(completed.authenticationMethod,'email-otp-v1');assert.equal(completed.loginBinding,undefined);assert.ok(Math.abs(Date.now()-completed.authenticatedAt)<10000);
      assert.notEqual((await send(pending,'verify',{code:latest})).statusCode,200);
      await budgets();pending=await start(true);await app.close();app=await testApp();assert.ok((await app.inject({method:'GET',url:'/api/session',headers:{cookie:pending.cookie}})).json().loginChallenge);
      const adminAuth=await send(pending,'verify',{code:pending.code});assert.equal(adminAuth.statusCode,200,adminAuth.body);assert.equal((await app.inject({method:'GET',url:'/api/admin',headers:{cookie:cookieFor(adminAuth)}})).statusCode,200);assert.equal((await app.inject({method:'GET',url:'/api/admin/users',headers:{cookie:cookieFor(adminAuth)}})).statusCode,403);
      await budgets();pending=await start();assert.equal((await send(pending,'cancel')).statusCode,200);assert.notEqual((await send(pending,'verify',{code:pending.code})).statusCode,200);
      await budgets();pending=await start();await pool.query("UPDATE login_challenges SET expires_at=now()-interval '1 second' WHERE actor_id=$1",[ownerId]);assert.equal((await send(pending,'verify',{code:pending.code})).statusCode,401);
      await budgets();pending=await start();for(let i=0;i<5;i++){const r=await send(pending,'verify',{code:pending.code==='000000'?'111111':'000000'});assert.equal(r.statusCode,i===4?401:400);}assert.equal((await send(pending,'verify',{code:pending.code})).statusCode,401);
      await budgets();pending=await start();const race=await Promise.all([send(pending,'verify',{code:pending.code}),send(pending,'verify',{code:pending.code})]);assert.equal(race.filter(r=>r.statusCode===200).length,1);
      await budgets();pending=await start();await pool.query('UPDATE operators SET auth_version=gen_random_uuid() WHERE id=$1',[ownerId]);assert.equal((await send(pending,'verify',{code:pending.code})).statusCode,401);
      await budgets();pending=await start(true);await pool.query('UPDATE admins SET enabled=false WHERE id=$1',[adminId]);assert.equal((await send(pending,'verify',{code:pending.code})).statusCode,401);await pool.query('UPDATE admins SET enabled=true WHERE id=$1',[adminId]);
      await budgets();pending=await start(true);await pool.query('UPDATE admins SET email=$2,auth_version=gen_random_uuid(),email_verified_at=NULL WHERE id=$1',[adminId,'changed_admin@example.invalid']);assert.equal((await send(pending,'verify',{code:pending.code})).statusCode,401);
      await pool.query('UPDATE admins SET email=NULL WHERE id=$1',[adminId]);assert.equal((await app.inject({method:'POST',url:'/api/login',payload:{handle:'otp_admin',password,admin:true}})).json().error.code,'TWO_FACTOR_SETUP_REQUIRED');
      await budgets();const failing=await createApp({mailer:{available:true,send:async()=>{throw Error('Synthetic mail failure');}}});try{const r=await failing.inject({method:'POST',url:'/api/login',payload:{handle:'otp_operator',password}});assert.equal(r.statusCode,503);assert.equal((await pool.query('SELECT id FROM login_challenges WHERE actor_id=$1',[ownerId])).rowCount,0);}finally{await failing.close();}
      // Mail budgets apply across fresh password requests, not just one challenge.
      await budgets();for(let i=0;i<5;i++)await start();const limited=await app.inject({method:'POST',url:'/api/login',remoteAddress:'127.0.0.77',payload:{handle:'otp_operator',password}});assert.equal(limited.statusCode,429);
      await budgets();pending=await start();await pool.query('DELETE FROM operators WHERE id=$1',[ownerId]);assert.equal((await send(pending,'verify',{code:pending.code})).statusCode,401);
    });
    await t.test('agent-assisted recovery requires prior enrollment, password, scoped approval and bound new-mailbox confirmation',async()=>{
      await pool.query('DELETE FROM limits');
      const ownerId=await createOperator('recover_owner');
      const register=async(agentHandle:string)=>{
        const registration=await call('POST','/registrations',{...prepared(agentHandle),operatorHandle:'recover_owner'});assert.equal(registration.statusCode,200,registration.body);
        await login('recover_owner');
        const token=new URL(registration.json().confirmationUrl).searchParams.get('confirmation');
        const approved=await call('POST','/confirmation',{token,ruleVersion:rules.version,publicParticipation:true,authorizePublication:true,authorizationVersion:'agent-publication-v1',revision:1,scope:'Synthetic recovery tests only'},undefined,true);assert.equal(approved.statusCode,200,approved.body);
        return {id:registration.json().id as string,key:registration.json().key as string,handle:agentHandle};
      };
      const helper=await register('recovery_helper'),second=await register('recovery_second');
      const origin=process.env.PUBLIC_ORIGIN||'http://localhost:4321';
      const jar=(r:any)=>r.cookies.map((c:any)=>c.name+'='+c.value).join('; ');
      const anon=async()=>{const r=await app.inject({method:'GET',url:'/api/session',remoteAddress:'127.0.0.88'});return{cookie:jar(r),csrf:r.json().csrf};};
      const post=(session:any,path:string,body:any={})=>app.inject({method:'POST',url:'/api/operator-recovery/'+path,remoteAddress:'127.0.0.88',headers:{cookie:session.cookie,origin,'x-csrf-token':session.csrf},payload:body});
      const enroll=async(agent=helper,enabled=true)=>{await login('recover_owner');return call('PUT','/operator/recovery/agents/'+agent.id,{password,enabled},undefined,true);};
      const resetLimits=()=>pool.query('DELETE FROM limits');
      let browser=await anon();
      const input={handle:'recover_owner',password,newEmail:'recovered@example.invalid',agentHandle:helper.handle,language:'de'};
      assert.equal((await post(browser,'start',input)).statusCode,409,'no implicit agent enrollment');
      assert.equal((await app.inject({method:'PUT',url:'/api/operator/recovery/agents/'+helper.id,headers:{cookie:browser.cookie,origin,'x-csrf-token':browser.csrf},payload:{password,enabled:true}})).statusCode,401,'password-only sessions cannot enroll agents');
      assert.equal((await enroll()).statusCode,200);
      assert.equal((await call('PUT','/operator/recovery/agents/'+helper.id,{password:'wrong',enabled:false},undefined,true)).statusCode,401);
      const config=await call('GET','/operator/recovery',undefined,undefined,true);assert.equal(config.json().agents.find((a:any)=>a.id===helper.id).enabled,true);
      await login('other_operator');assert.equal((await call('PUT','/operator/recovery/agents/'+helper.id,{password,enabled:true},undefined,true)).statusCode,409);
      await resetLimits();
      const start=async()=>{browser=await anon();const r=await post(browser,'start',input);assert.equal(r.statusCode,200,r.body);browser={cookie:jar(r),csrf:r.json().csrf};assert.equal(r.json().state,'awaiting_agent');assert.equal(r.json().code,undefined);return r.json();};
      let request=await start();
      const oldSession={cookie,csrf};
      assert.equal((await app.inject({method:'GET',url:'/api/operator',headers:{cookie:browser.cookie}})).statusCode,401);
      assert.equal((await post(browser,'verify',{code:'123456'})).statusCode,401,'no code accepted before approval');
      assert.equal((await call('GET','/me/operator-recovery',undefined,second.key)).json().length,0,'other agent cannot see recovery');
      const listed=await call('GET','/me/operator-recovery',undefined,helper.key);assert.equal(listed.statusCode,200,listed.body);assert.equal(listed.json()[0].newEmail,input.newEmail);assert.equal(listed.json()[0].operatorHandle,'recover_owner');
      const approve=(id=request.requestId,newEmail=input.newEmail,key=helper.key)=>call('POST','/me/operator-recovery/'+id+'/approve',{confirmEmailChange:true,newEmail},key);
      assert.equal((await approve(request.requestId,input.newEmail,second.key)).statusCode,403);
      assert.equal((await approve(request.requestId,'different@example.invalid')).statusCode,403);
      assert.equal((await approve()).statusCode,200);
      const codeFor=()=>{const message=mailbox.filter(m=>m.to===input.newEmail&&/^\d{6}$/m.test(m.text)).at(-1);assert.ok(message);return message.text.match(/^\d{6}$/m)![0];};
      const code=codeFor(),count=mailbox.length;
      assert.equal((await approve()).statusCode,200);assert.equal(mailbox.length,count,'approval replay does not send another email');
      const row=(await pool.query('SELECT * FROM operator_recovery_requests WHERE operator_id=$1',[ownerId])).rows[0];assert.notEqual(row.code_hash,code);assert.equal(row.code_hash.length,64);
      const stranger=await anon();assert.equal((await post(stranger,'verify',{code})).statusCode,401);
      assert.equal((await app.inject({method:'POST',url:'/api/operator-recovery/verify',headers:{cookie:browser.cookie,origin:'https://invalid.example','x-csrf-token':browser.csrf},payload:{code}})).statusCode,403);
      assert.equal((await post(browser,'verify',{code,operatorId:ownerId})).statusCode,400);
      assert.equal((await post(browser,'verify',{code:code==='000000'?'111111':'000000'})).statusCode,400);
      assert.equal((await post(browser,'resend')).statusCode,429);
      // Pending sessions survive an application restart, but still grant no account access.
      await app.close();app=await testApp();
      assert.equal((await app.inject({method:'GET',url:'/api/operator-recovery/status',headers:{cookie:browser.cookie}})).json().state,'awaiting_email');
      const fullLogin=await rawLogin({handle:'recover_owner',password});const prior=jar(fullLogin);
      const race=await Promise.all([post(browser,'verify',{code}),post(browser,'verify',{code})]);assert.equal(race.filter(r=>r.statusCode===200).length,1,JSON.stringify(race.map(r=>({status:r.statusCode,...r.json()}))));
      const changed=(await pool.query('SELECT email,email_verified_at FROM operators WHERE id=$1',[ownerId])).rows[0];assert.equal(changed.email,input.newEmail);assert.ok(changed.email_verified_at);
      assert.equal((await app.inject({method:'GET',url:'/api/operator',headers:{cookie:prior}})).statusCode,401);
      const result=race.find(r=>r.statusCode===200)!;assert.equal((await app.inject({method:'GET',url:'/api/session',headers:{cookie:jar(result)}})).json().operatorId,undefined,'completion never signs in');
      assert.notEqual((await post(browser,'verify',{code})).statusCode,200);
      assert.equal((await pool.query('SELECT token_hash FROM operator_email_tokens WHERE operator_id=$1',[ownerId])).rowCount,0);
      assert.ok(mailbox.some(m=>m.to==='recover_owner@example.invalid'&&m.subject.includes('geändert')));
      assert.equal((await pool.query('SELECT status,key_hash FROM agents WHERE id=$1',[helper.id])).rows[0].status,'active');
      // Isolated fixture restores its own address to exercise independent revocations.
      await pool.query('UPDATE operators SET email=$2 WHERE id=$1',[ownerId,'recover_owner@example.invalid']);await resetLimits();
      request=await start();await enroll(helper,false);assert.equal((await approve()).statusCode,403);assert.equal((await post(browser,'verify',{code})).statusCode,401);
      await resetLimits();await enroll();request=await start();await pool.query('UPDATE agents SET key_hash=$2 WHERE id=$1',[helper.id,'synthetic-rotated-key']);assert.equal((await approve()).statusCode,403);assert.equal((await post(browser,'verify',{code})).statusCode,401);await pool.query('UPDATE agents SET key_hash=$2 WHERE id=$1',[helper.id,createHash('sha256').update(helper.key).digest('hex')]);
      await resetLimits();request=await start();await pool.query("UPDATE agents SET status='blocked' WHERE id=$1",[helper.id]);assert.equal((await approve()).statusCode,403);await pool.query("UPDATE agents SET status='active' WHERE id=$1",[helper.id]);
      await resetLimits();request=await start();await approve();const wrong=codeFor()==='000000'?'111111':'000000';for(let i=0;i<5;i++)assert.equal((await post(browser,'verify',{code:wrong})).statusCode,i===4?401:400);assert.equal((await post(browser,'verify',{code:codeFor()})).statusCode,401);
      await resetLimits();request=await start();await pool.query("UPDATE operator_recovery_requests SET expires_at=now()-interval '1 second' WHERE id=$1",[request.requestId]);assert.equal((await approve()).statusCode,403);
      await resetLimits();request=await start();assert.equal((await post(browser,'cancel')).statusCode,200);assert.equal((await approve()).statusCode,403);
      await resetLimits();request=await start();await pool.query('UPDATE operators SET auth_version=gen_random_uuid() WHERE id=$1',[ownerId]);assert.equal((await approve()).statusCode,403);
      await resetLimits();request=await start();await approve();await pool.query("UPDATE operator_recovery_requests SET code_expires_at=now()-interval '1 second' WHERE id=$1",[request.requestId]);assert.equal((await post(browser,'verify',{code:codeFor()})).statusCode,400);
      const previousCode=codeFor();await pool.query("UPDATE operator_recovery_requests SET sent_at=now()-interval '61 seconds' WHERE id=$1",[request.requestId]);assert.equal((await post(browser,'resend')).statusCode,200);assert.notEqual(codeFor(),previousCode);const resentRow=(await pool.query('SELECT * FROM operator_recovery_requests WHERE id=$1',[request.requestId])).rows[0];assert.equal(resentRow.sends,2);assert.equal(new Date(resentRow.expires_at).toISOString(),request.expiresAt);await pool.query("UPDATE operator_recovery_requests SET sent_at=now()-interval '61 seconds' WHERE id=$1",[request.requestId]);assert.equal((await post(browser,'resend')).statusCode,200);await pool.query("UPDATE operator_recovery_requests SET sent_at=now()-interval '61 seconds' WHERE id=$1",[request.requestId]);assert.equal((await post(browser,'resend')).statusCode,429);
      await resetLimits();request=await start();const unavailable=await createApp({mailer:{available:true,send:async()=>{throw Error('Synthetic failure');}}});try{const r=await unavailable.inject({method:'POST',url:'/api/me/operator-recovery/'+request.requestId+'/approve',headers:{authorization:'Bearer '+helper.key},payload:{confirmEmailChange:true,newEmail:input.newEmail}});assert.equal(r.statusCode,503);assert.equal((await post(browser,'verify',{code:codeFor()})).statusCode,400);}finally{await unavailable.close();}
      await resetLimits();request=await start();await login('recover_owner');assert.equal((await call('DELETE','/operator/recovery/request',{},undefined,true)).statusCode,200);assert.equal((await approve()).statusCode,403);
      await resetLimits();for(let i=0;i<3;i++)await start();browser=await anon();assert.equal((await post(browser,'start',input)).statusCode,429);
      await resetLimits();request=await start();await login('recover_owner');assert.equal((await call('DELETE','/operator/agents/'+helper.id,{confirmDeletion:true,password},undefined,true)).statusCode,200);assert.equal((await approve()).statusCode,403);assert.equal((await pool.query('SELECT id FROM operator_recovery_requests WHERE agent_id=$1',[helper.id])).rowCount,0);

    });

    await t.test('ordinary notification capture, scoped preferences, batching, durable retries and private deletion',async()=>{
      const {deliverNotifications}=await import('../src/notifications.js');
      await pool.query('DELETE FROM limits');await pool.query('TRUNCATE notification_outbox');
      const ownerId=await createOperator('notification_owner','es'),adminId=randomUUID();
      assert.equal((await pool.query('SELECT notification_language FROM operators WHERE id=$1',[ownerId])).rows[0].notification_language,'es');
      await pool.query("INSERT INTO admins(id,handle,password,email,email_verified_at) VALUES($1,'notification_admin',$2,'notification_admin@example.invalid',now())",[adminId,await argon2.hash(password)]);
      // Isolate this synthetic recipient from earlier synthetic moderator fixtures.
      await pool.query('UPDATE admins SET notification_queue=(id=$1)',[adminId]);
      const sent:any[]=[],transport={available:true,send:async(message:any)=>{sent.push(message);}};
      const drain=()=>deliverNotifications(transport,process.env.PUBLIC_ORIGIN||'http://localhost:4321');
      const rowCount=async()=>Number((await pool.query('SELECT count(*) AS n FROM notification_outbox')).rows[0].n);
      const prefs={language:'de',registration:true,moderation:true,review:true};
      assert.equal((await call('GET','/operator/notifications')).statusCode,401);
      await login('notification_owner');
      assert.equal((await call('GET','/admin/notifications',undefined,undefined,true)).statusCode,401);
      assert.equal((await call('GET','/operator/notifications',undefined,undefined,true)).json().registration,true);
      assert.equal((await app.inject({method:'PUT',url:'/api/operator/notifications',headers:{cookie,origin:'https://foreign.invalid','x-csrf-token':csrf},payload:prefs})).statusCode,403);
      assert.equal((await call('PUT','/operator/notifications',{...prefs,operatorId:other},undefined,true)).statusCode,400);
      assert.equal((await call('PUT','/operator/notifications',prefs,undefined,true)).statusCode,200);
      assert.equal((await pool.query('SELECT notification_language FROM operators WHERE id=$1',[other])).rows[0].notification_language,'en');
      const registration=await call('POST','/registrations',{...prepared('notification_agent'),operatorHandle:'notification_owner'});assert.equal(registration.statusCode,200,registration.body);
      const aid=registration.json().id;assert.equal(await rowCount(),1);assert.equal(sent.length,0);
      const disabled=await deliverNotifications({available:false,send:transport.send},'http://localhost:4321');assert.equal(disabled.sent,0);assert.equal(await rowCount(),1);
      // Rollback also rolls back capture; no orphan email when a registration fails.
      await assert.rejects(transaction(async c=>{await c.query("INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,operator_id) VALUES(gen_random_uuid(),'notification_rollback','Fixture','Fixture','[]','Fixture','{}',$1)",[ownerId]);throw Error('Synthetic rollback');}));assert.equal(await rowCount(),1);
      const one=await Promise.all([drain(),drain()]);assert.equal(one.reduce((n,r)=>n+r.sent,0),1);assert.equal(sent.length,1);assert.ok(sent[0].subject.includes('Freigabe'));assert.ok(!sent[0].text.includes(registration.json().key));assert.ok(!sent[0].text.includes('confirmation='));assert.equal(await rowCount(),0);
      await login('notification_owner');assert.equal((await pool.query('SELECT notification_language FROM operators WHERE id=$1',[ownerId])).rows[0].notification_language,'de','explicit mail language survives an English login');
      const reportIds=[randomUUID(),randomUUID()];
      for(const id of reportIds)await pool.query("INSERT INTO reports(id,agent_id,target_kind,reason) VALUES($1,$2,'agent','Private report reason')",[id,aid]);
      assert.equal(await rowCount(),2);assert.equal((await drain()).sent,0,'admin digest waits two minutes');
      // First event becomes due; a later new event joins the same digest.
      await pool.query("UPDATE notification_outbox SET due_at=now()-interval '1 second' WHERE source_id=$1",['reports:'+reportIds[0]]);
      await drain();assert.equal(sent.filter(m=>m.to==='notification_admin@example.invalid').length,1);assert.ok(sent.at(-1).text.includes('Updates: 2'));assert.ok(!sent.at(-1).text.includes('Private report reason'));assert.equal(await rowCount(),0);
      const decision=(await pool.query("INSERT INTO moderation(admin_id,agent_id,action,reason,report_id) VALUES($1,$2,'block','Private decision reason',$3) RETURNING id,case_id",[adminId,aid,reportIds[0]])).rows[0];
      const appeal=randomUUID();await pool.query("INSERT INTO appeals(id,operator_id,subject_agent_id,moderation_id,reason) VALUES($1,$2,$3,$4,'Private appeal')",[appeal,ownerId,aid,decision.id]);
      await pool.query("INSERT INTO appeal_messages(appeal_id,author_role,operator_id,body) VALUES($1,'operator',$2,'Private additional context')",[appeal,ownerId]);
      assert.equal((await pool.query("SELECT id FROM notification_outbox WHERE source_id LIKE 'context:%' AND admin_id=$1",[adminId])).rowCount,1);
      assert.equal((await pool.query('SELECT n.id FROM notification_outbox n JOIN admins a ON a.id=n.admin_id WHERE a.is_root')).rowCount,0);
      await pool.query("UPDATE appeals SET status='rejected',response='Private response',decided_at=now(),decided_by=$2 WHERE id=$1",[appeal,adminId]);
      assert.equal((await pool.query("SELECT id FROM notification_outbox WHERE kind='review' AND operator_id=$1",[ownerId])).rowCount,1);
      // An arbitrary response-field edit cannot duplicate the decision notification.
      await pool.query('UPDATE appeals SET response=response WHERE id=$1',[appeal]);assert.equal((await pool.query("SELECT id FROM notification_outbox WHERE kind='review'")).rowCount,1);
      const before=sent.length;let stopDelivery=false;await deliverNotifications({available:true,send:async message=>{sent.push(message);stopDelivery=true;}},process.env.PUBLIC_ORIGIN||'http://localhost:4321',()=>stopDelivery);assert.equal(sent.length,before+1,'shutdown starts no further group after the in-flight mail');await drain();assert.equal(sent.length,before+2);assert.ok(sent.slice(before).every(m=>!m.text.includes('Private')));
      // A failed provider never rolls back the moderation decision. Queue survives app restart.
      await pool.query('TRUNCATE notification_outbox');
      const insertDecision=()=>pool.query("INSERT INTO moderation(admin_id,agent_id,action,reason) VALUES($1,$2,'unblock','Synthetic notification decision')",[adminId,aid]);
      await insertDecision();const bad=await deliverNotifications({available:true,send:async()=>{throw Error('Provider credentials must not leak');}},'http://localhost:4321');assert.equal(bad.failed,1);assert.equal(await rowCount(),1);assert.equal((await pool.query('SELECT attempts FROM notification_outbox')).rows[0].attempts,1);
      assert.equal((await drain()).sent,0,'backoff persists');await app.close();app=await testApp();await pool.query("UPDATE notification_outbox SET due_at=now()-interval '1 second'");await drain();assert.equal(await rowCount(),0);
      // Capture waits for a concurrent preference edit and cannot insert an opted-out envelope.
      const editor=await pool.connect();let pendingCapture:Promise<any>|undefined;
      try{await editor.query('BEGIN');await editor.query('SELECT pg_advisory_xact_lock_shared(481920)');await editor.query('UPDATE operators SET notification_moderation=false WHERE id=$1',[ownerId]);pendingCapture=insertDecision();await new Promise(r=>setTimeout(r,20));await editor.query('COMMIT');await pendingCapture;assert.equal(await rowCount(),0);}
      finally{await editor.query('ROLLBACK');editor.release();}
      await pool.query('UPDATE operators SET notification_moderation=true WHERE id=$1',[ownerId]);
      await insertDecision();await login('notification_owner');assert.equal((await call('PUT','/operator/notifications',{...prefs,moderation:false},undefined,true)).statusCode,200);assert.equal(await rowCount(),0,'opt out cancels pending mail');await insertDecision();assert.equal(await rowCount(),0,'opt out prevents capture');
      assert.equal((await call('PUT','/operator/notifications',prefs,undefined,true)).statusCode,200);await insertDecision();await pool.query('UPDATE operators SET auth_version=gen_random_uuid() WHERE id=$1',[ownerId]);const invalid=sent.length;await drain();assert.equal(sent.length,invalid,'changed account credentials invalidate old envelopes');assert.equal(await rowCount(),0);
      await insertDecision();await pool.query("UPDATE notification_outbox SET attempts=8,due_at=now()-interval '1 minute'");assert.equal((await drain()).sent,0,'bounded exhausted retry budget');await pool.query("UPDATE notification_outbox SET created_at=now()-interval '8 days'");await drain();assert.equal(await rowCount(),0,'private queue expires after seven days');
      await login('notification_admin',true);assert.deepEqual((await call('GET','/admin/notifications',undefined,undefined,true)).json(),{language:'en',queue:true});assert.equal((await call('PUT','/admin/notifications',{language:'fr',queue:false},undefined,true)).statusCode,200);
      await pool.query("INSERT INTO reports(id,agent_id,target_kind,reason) VALUES(gen_random_uuid(),$1,'agent','No notification')",[aid]);assert.equal(await rowCount(),0);
      await insertDecision();assert.equal(await rowCount(),1);await pool.query('DELETE FROM agents WHERE id=$1',[aid]);
      // Case-linked mail belongs to the independent case, not the live public agent.
      assert.equal(await rowCount(),1);await pool.query('DELETE FROM operators WHERE id=$1',[ownerId]);assert.equal(await rowCount(),0,'account deletion removes pending addresses/identity envelopes');
      const cols=(await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='notification_outbox'")).rows.map(r=>r.column_name);for(const forbidden of ['email','body','reason','text','html'])assert.ok(!cols.includes(forbidden));
      await pool.query('DELETE FROM limits');
    });

    await t.test('private reporter receipts, optional contacts, decision/review mail and independent deletion',async()=>{
      const {deliverReporterMail}=await import('../src/reporter-receipts.js');
      const {purgeCase}=await import('../src/case-retention.js');
      await pool.query('DELETE FROM limits');await pool.query('TRUNCATE reporter_mail_outbox');
      const oid=await createOperator('report_receipt_owner'),aid=randomUUID();
      await pool.query("INSERT INTO agents(id,operator_id,handle,name,about,interests,operating_context,technical,status) VALUES($1,$2,'report_receipt_agent','Receipt fixture','Synthetic fixture','[]','Test','{}','active')",[aid,oid]);
      const first=await call('POST','/reports',{agentId:aid,reason:'PRIVATE REASON NOT FOR THE STATUS PAGE'});assert.equal(first.statusCode,200,first.body);assert.equal(first.json().emailQueued,false);
      const contact=await call('POST','/reports',{agentId:aid,reason:'Another private concern',reporterName:'Private reporter name',reporterEmail:'REPORTER@example.invalid',language:'de',goodFaith:true});assert.equal(contact.statusCode,200,contact.body);assert.equal(contact.json().emailQueued,true);
      const access=new URL(contact.json().statusUrl),token=new URLSearchParams(access.hash.slice(1)).get('receipt')!;assert.equal(access.pathname,'/dsa');assert.equal(access.searchParams.get('lang'),'de');assert.equal(access.searchParams.has('token'),false);assert.match(token,/^[A-Za-z0-9_-]{43}$/);
      const otherToken=new URLSearchParams(new URL(first.json().statusUrl).hash.slice(1)).get('receipt')!;assert.notEqual(token,otherToken);
      const state=()=>app.inject({method:'POST',url:'/api/report-status',payload:{token}});
      let snapshot=await state();assert.equal(snapshot.statusCode,200,snapshot.body);assert.equal(snapshot.headers['cache-control'],'no-store');assert.equal(snapshot.json().status,'received');assert.equal(snapshot.json().emailNotifications,true);
      assert.doesNotMatch(snapshot.body,/Private reporter|REPORTER|reporter@example|private concern|nonce|token_hash|case_id/i);
      const receipt=(await pool.query('SELECT * FROM reporter_receipts WHERE token_hash=$1',[createHash('sha256').update(token).digest('hex')])).rows[0];assert.equal(receipt.reporter_email,'reporter@example.invalid');assert.equal(receipt.good_faith,true);assert.ok(!JSON.stringify(receipt).includes(token));assert.ok(!JSON.stringify((await pool.query('SELECT evidence FROM moderation_cases WHERE id=(SELECT case_id FROM reports WHERE id=$1)',[receipt.report_id])).rows).includes('reporter@example.invalid'));
      assert.equal((await app.inject({method:'POST',url:'/api/report-status?token=not-accepted',payload:{token}})).statusCode,400);
      assert.equal((await app.inject({method:'POST',url:'/api/report-status',payload:{token:'A'.repeat(43)}})).statusCode,404);
      assert.equal((await app.inject({method:'POST',url:'/api/report-status',headers:{origin:'https://other.invalid'},payload:{token}})).statusCode,403);
      assert.equal((await call('POST','/reports',{agentId:aid,reason:'Test',reporterEmail:'not an email'})).statusCode,400);
      const mail:any[]=[],transport={available:true,send:async(message:any)=>{mail.push(message);}};const drain=()=>deliverReporterMail(transport,process.env.PUBLIC_ORIGIN||'http://localhost:4321',process.env.SESSION_SECRET!);
      const parallel=await Promise.all([drain(),drain()]);assert.equal(parallel.reduce((n,r)=>n+r.sent,0),1);assert.equal(mail.length,1);assert.equal(mail[0].to,'reporter@example.invalid');assert.ok(mail[0].text.includes(contact.json().statusUrl));assert.match(mail[0].subject,/eingegangen/);assert.doesNotMatch(mail[0].text,/Private reporter|private concern/);
      await login('test_admin',true);
      const action=await call('POST','/admin/actions',{action:'dismiss',id:aid,reportId:receipt.report_id,reason:'INTERNAL PRIVATE MODERATION NOTE',reporterResponse:'Public explanation for the reporter.'},undefined,true);assert.equal(action.statusCode,200,action.body);
      snapshot=await state();assert.equal(snapshot.json().status,'decided');assert.ok(snapshot.body.includes('Public explanation'));assert.ok(!snapshot.body.includes('INTERNAL PRIVATE'));assert.equal((await drain()).sent,1);assert.ok(mail[1].text.includes(contact.json().statusUrl));
      const unrelated=(await app.inject({method:'POST',url:'/api/report-status',payload:{token:otherToken}})).json();assert.equal(unrelated.events.length,1);assert.equal(unrelated.status,'received');
      const decision=(await pool.query('SELECT id,case_id FROM moderation WHERE report_id=$1',[receipt.report_id])).rows[0];
      const ap=(await pool.query("INSERT INTO appeals(id,operator_id,subject_agent_id,moderation_id,reason) VALUES($1,$2,$3,$4,'PRIVATE APPEAL') RETURNING id",[randomUUID(),oid,aid,decision.id])).rows[0];
      assert.equal((await state()).json().status,'review_pending');await pool.query("UPDATE appeals SET status='rejected',response='PRIVATE OPERATOR RESPONSE',reporter_response='Reporter review outcome.',decided_at=now(),decided_by=$2 WHERE id=$1",[ap.id,admin]);
      snapshot=await state();assert.equal(snapshot.json().status,'decided');assert.ok(snapshot.body.includes('Reporter review outcome'));assert.ok(!snapshot.body.includes('PRIVATE'));assert.equal((await drain()).sent,1);
      await pool.query("INSERT INTO moderation(admin_id,agent_id,action,reason,report_id) VALUES($1,$2,'dismiss','PRIVATE',$3)",[admin,aid,receipt.report_id]);
      const failure=await deliverReporterMail({available:true,send:async()=>{throw Error('Private SMTP detail');}},process.env.PUBLIC_ORIGIN||'http://localhost:4321',process.env.SESSION_SECRET!);assert.equal(failure.failed,1);assert.equal((await drain()).sent,0,'durable retry deadline');
      assert.equal((await app.inject({method:'POST',url:'/api/report-status/stop-emails',payload:{token}})).statusCode,403);
      const stop=await app.inject({method:'POST',url:'/api/report-status/stop-emails',headers:{origin:process.env.PUBLIC_ORIGIN||'http://localhost:4321'},payload:{token}});assert.equal(stop.statusCode,200,stop.body);assert.equal((await state()).json().emailNotifications,false);assert.equal((await pool.query('SELECT * FROM reporter_mail_outbox WHERE event_id IN(SELECT id FROM reporter_events WHERE report_id=$1)',[receipt.report_id])).rowCount,0);
      assert.equal((await pool.query('DELETE FROM agents WHERE id=$1',[aid])).rowCount,1);assert.equal((await state()).statusCode,200,'case receipt survives public identity deletion');
      const c=await pool.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(481920)');await purgeCase(c,decision.case_id,new Date());await c.query('COMMIT');}finally{c.release();}
      assert.equal((await state()).statusCode,404);assert.equal((await pool.query('SELECT * FROM reporter_receipts WHERE report_id=$1',[receipt.report_id])).rowCount,0);
    });

    await t.test('private aggregate statistics use Berlin calendar days, current records and one consistent read',async()=>{
      const {readStatistics}=await import('../src/statistics.js');await pool.query('DELETE FROM limits');
      assert.equal((await call('GET','/admin/statistics')).statusCode,401);
      await login('test_operator');assert.equal((await call('GET','/admin/statistics',undefined,undefined,true)).statusCode,401);
      await login('test_admin',true);
      const response=await call('GET','/admin/statistics',undefined,undefined,true);assert.equal(response.statusCode,200,response.body);assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.json().timezone,'Europe/Berlin');
      assert.equal((await call('GET','/admin/statistics?reference=2026-01-01',undefined,undefined,true)).statusCode,400);
      for(const [season,reference,start,end] of [
        ['spring','2026-03-29T12:00:00Z','2026-03-28T23:00:00Z','2026-03-29T22:00:00Z'],
        ['fall','2026-10-25T12:00:00Z','2026-10-24T22:00:00Z','2026-10-25T23:00:00Z']
      ]){
        await pool.query('DELETE FROM limits');const before=await readStatistics(pool,new Date(reference));
        const times=[new Date(Date.parse(start)-1),new Date(start),new Date(Date.parse(end)-1),new Date(end)],agents:string[]=[],owners:string[]=[];
        for(let i=0;i<4;i++){
          const handle='stats_'+season+'_'+i,oid=await createOperator(handle),aid=randomUUID();owners.push(oid);agents.push(aid);
          await pool.query('UPDATE operators SET created_at=$2 WHERE id=$1',[oid,times[i]]);
          await pool.query("INSERT INTO agents(id,handle,name,about,interests,operating_context,technical,operator_id,status,created_at) VALUES($1,$2,'Statistics fixture','Isolated test','[]','Isolated','{}',$3,$4,$5)",[aid,handle,oid,['pending','active','blocked','paused'][i],times[i]]);
        }
        const conversation=randomUUID(),posts=[randomUUID(),randomUUID(),randomUUID(),randomUUID(),randomUUID(),randomUUID()];
        await pool.query('INSERT INTO conversations(id,last_activity_at) VALUES($1,now())',[conversation]);
        for(let i=0;i<6;i++)await pool.query("INSERT INTO posts(id,conversation_id,parent_id,agent_id,body,technical,state,created_at) VALUES($1,$2,$3,$4,'[Local test] Statistics fixture','{}',$5,$6)",[posts[i],conversation,i===2?posts[1]:null,agents[i%4],i===4?'hidden':i===5?'deleted':'visible',times[i>=4?1:i]]);
        const snapshot=await readStatistics(pool,new Date(reference));assert.equal(snapshot.date,season==='spring'?'2026-03-29':'2026-10-25');
        for(const key of ['operators','agents']){assert.equal(BigInt(snapshot[key].total)-BigInt(before[key].total),4n);assert.equal(BigInt(snapshot[key].today)-BigInt(before[key].today),2n);assert.equal(BigInt(snapshot[key].lastSevenDays)-BigInt(before[key].lastSevenDays),3n);}
        assert.equal(BigInt(snapshot.messages.total)-BigInt(before.messages.total),5n);assert.equal(BigInt(snapshot.messages.lastSevenDays)-BigInt(before.messages.lastSevenDays),4n);assert.equal(BigInt(snapshot.messages.today)-BigInt(before.messages.today),3n,'includes the comment and hidden message, excludes before/next-day and deleted placeholder');
        // The sixth prior date is still before the DST transition: construct its Berlin midnight explicitly.
        const weekStart=new Date(season==='spring'?'2026-03-22T23:00:00Z':'2026-10-18T22:00:00Z');
        await pool.query('UPDATE operators SET created_at=$2 WHERE id=$1',[owners[0],weekStart]);await pool.query('UPDATE agents SET created_at=$2 WHERE id=$1',[agents[0],weekStart]);await pool.query('UPDATE posts SET created_at=$2 WHERE id=$1',[posts[0],weekStart]);
        const atBoundary=await readStatistics(pool,new Date(reference));
        for(const [table,id] of [['operators',owners[0]],['agents',agents[0]],['posts',posts[0]]])await pool.query('UPDATE '+table+' SET created_at=$2 WHERE id=$1',[id,new Date(weekStart.getTime()-1)]);
        const outside=await readStatistics(pool,new Date(reference));for(const key of ['operators','agents','messages'])assert.equal(BigInt(atBoundary[key].lastSevenDays)-BigInt(outside[key].lastSevenDays),1n,'seven calendar days includes its exact midnight but not one millisecond before');
        const activity=(await pool.query('SELECT last_activity_at FROM conversations WHERE id=$1',[conversation])).rows[0].last_activity_at.toISOString();
        await readStatistics(pool,new Date(reference));assert.equal((await pool.query('SELECT last_activity_at FROM conversations WHERE id=$1',[conversation])).rows[0].last_activity_at.toISOString(),activity,'statistics never changes retention activity');
        await pool.query('DELETE FROM posts WHERE id=$1',[posts[4]]);const removed=await readStatistics(pool,new Date(reference));assert.equal(BigInt(snapshot.messages.total)-BigInt(removed.messages.total),1n);
      }
      await pool.query('DELETE FROM limits');
    });

    await t.test('real server starts both daily workers, exports privately and shuts down cleanly',async()=>{
      await pool.query('TRUNCATE background_job_runs,background_job_previews');await pool.query('UPDATE background_jobs SET last_success_due=NULL,last_success_at=NULL,retry_at=NULL');
      const directory=await mkdtemp(join(tmpdir(),'nulltopic-scheduler-')),journalPath=join(directory,'journal.json');
      const child=spawn(process.execPath,['--import','tsx','src/server.ts'],{env:{...process.env,DATABASE_URL:url,MAIL_MODE:'disabled',PORT:'0',BACKGROUND_JOBS_ENABLED:'true',CASE_PURGE_JOURNAL_PATH:journalPath},stdio:'ignore'});
      const exited=new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
      try{
        let completed=false;
        for(let n=0;n<200;n++){if(child.exitCode!==null)throw Error('Scheduler server exited unexpectedly');if((await pool.query('SELECT id FROM background_jobs WHERE last_success_at IS NOT NULL')).rowCount===2){completed=true;break;}await new Promise(r=>setTimeout(r,50));}
        assert.equal(completed,true,'startup catches up both due tasks');assert.equal((await stat(journalPath)).mode&0o777,0o600);
        child.kill('SIGTERM');assert.equal(await exited,0);assert.equal((await pool.query("SELECT id FROM background_job_runs WHERE status='running'")).rowCount,0);
      }finally{if(child.exitCode===null){child.kill('SIGTERM');await exited;}await rm(directory,{recursive:true,force:true});}
    });
  } finally {
    await app.close();
    await pool.end();
    await rm(deletionTestDirectory,{recursive:true,force:true});
  }
});
