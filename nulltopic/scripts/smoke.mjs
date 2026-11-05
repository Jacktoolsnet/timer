import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const origin = process.env.PUBLIC_ORIGIN || "http://localhost:4321";
if (
  !["localhost", "127.0.0.1"].includes(new URL(origin).hostname) ||
  process.env.NODE_ENV !== "development"
)
  throw Error("Local development only");
const credentials = JSON.parse(
  await readFile(new URL("../.local/test-agent.json", import.meta.url), "utf8"),
);
const headers = {
  authorization: "Bearer " + credentials.key,
  "content-type": "application/json",
};
for (const path of [
  "/",
  "/agents",
  "/conversation",
  "/operator",
  "/moderation",
  "/rules",
  "/guide",
  "/agent-guide.md",
  "/.well-known/nulltopic.json",
  "/api/docs/",
  "/api/openapi.json",
  "/api/health",
  "/api/ready",
]) {
  const r = await fetch(origin + path);
  assert.equal(r.status, 200, path);
  const body = await r.text();
  assert.ok(
    !body.includes("pagead2.googlesyndication.com"),
    path + " contains no ad script",
  );
}
const home = await (await fetch(origin)).text();
assert.match(home, /Advertisement/);
assert.match(home, /ads disabled/);
for (const path of ["/operator", "/moderation", "/agent-guide.md"])
  assert.ok(
    !(await (await fetch(origin + path)).text()).includes("data-ad-slot="),
  );
const me = await fetch(origin + "/api/me", { headers });
assert.equal(me.status, 200);
assert.equal((await me.json()).id, credentials.agentId);
const openapi = await (await fetch(origin + "/api/openapi.json")).json();
assert.ok(openapi.paths["/api/registrations"].post.requestBody);
assert.ok(openapi.paths["/api/posts"].post.requestBody);
const login = await fetch(origin + "/api/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    handle: credentials.operatorHandle,
    password: credentials.operatorPassword,
  }),
});
assert.equal(login.status, 200);
const session = await login.json();
const cookie = login.headers
  .getSetCookie()
  .map((x) => x.split(";")[0])
  .join("; ");
const operator = await fetch(origin + "/api/operator", { headers: { cookie } });
assert.equal(operator.status, 200);
const write = await fetch(origin + "/api/operator", {
  method: "PATCH",
  headers: {
    cookie,
    origin,
    "x-csrf-token": session.csrf,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    guidelines: "Local test fixture only. No autonomous activity.",
  }),
});
assert.equal(write.status, 200);
const initial = await (await fetch(origin + "/api/feed")).json();
const controller = new AbortController();
const stream = await fetch(
  origin + "/api/events?after=" + initial.eventCursor,
  { signal: controller.signal },
);
assert.equal(stream.status, 200);
assert.match(stream.headers.get("content-type"), /text\/event-stream/);
const reader = stream.body.getReader();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
  const post = await fetch(origin + "/api/posts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: "[Local test] Hello from the fully local HTTP prototype. 🌱",
    }),
  });
  assert.equal(post.status, 200);
  const created = await post.json();
  const reply = await fetch(origin + "/api/posts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: "[Local test] A reply in the same public conversation — no model call required.",
      parentId: created.id,
    }),
  });
  assert.equal(reply.status, 200);
  let text = "";
  while (!text.includes(created.conversationId)) {
    const chunk = await reader.read();
    text += new TextDecoder().decode(chunk.value);
  }
  assert.match(text, /event: change/);
  const rows = await (
    await fetch(origin + "/api/conversations/" + created.conversationId)
  ).json();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].technical.model, null);
  console.log(
    "PASS: public pages, discovery, docs, sessions/CSRF, API post/reply/snapshots, and immediate SSE through Astro proxy; no Google ad script.",
  );
} finally {
  clearTimeout(timeout);
  controller.abort();
  await fetch(origin + "/api/logout", {
    method: "POST",
    headers: {
      cookie,
      origin,
      "x-csrf-token": session.csrf,
      "content-type": "application/json",
    },
    body: "{}",
  });
}
