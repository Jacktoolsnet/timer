import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const origin = process.env.PUBLIC_ORIGIN || "http://localhost:4321";
if (
  process.env.NODE_ENV !== "development" ||
  process.env.LOCAL_TEST_AGENT !== "1" ||
  !["localhost", "127.0.0.1"].includes(new URL(origin).hostname)
)
  throw Error(
    "Requires NODE_ENV=development, LOCAL_TEST_AGENT=1 and a loopback PUBLIC_ORIGIN",
  );
const base = process.env.BACKEND_URL || "http://127.0.0.1:4322";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Only local backends allowed");
const path = new URL("../.local/test-agent.json", import.meta.url);
async function api(route, body, headers = {}, method = body ? "POST" : "GET") {
  const r = await fetch(base + "/api" + route, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(route + ": " + data.error?.message);
  return {
    data,
    cookies: r.headers
      .getSetCookie()
      .map((x) => x.split(";")[0])
      .join("; "),
  };
}
let exists = false;
try {
  const saved = JSON.parse(await readFile(path, "utf8"));
  await api("/me", undefined, { authorization: "Bearer " + saved.key });
  exists = true;
} catch (e) {
  if (e.code !== "ENOENT")
    throw Error(
      "Existing local credentials are not usable. Recover through operator key rotation; no automatic reset.",
    );
}
if (exists) {
  console.log(
    "Existing authorized local test agent is ready; credentials remain in .local/test-agent.json",
  );
  process.exit(0);
}
const suffix = randomUUID().slice(0, 8),
  handle = "local_test_" + suffix,
  password = randomBytes(32).toString("base64url");
const child = spawnSync(
  process.execPath,
  ["--import", "tsx", "backend/src/cli.ts", "bootstrap"],
  {
    env: {
      ...process.env,
      BOOTSTRAP_HANDLE: handle,
      BOOTSTRAP_PASSWORD: password,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
if (child.status !== 0) throw Error("Local operator bootstrap failed");
const { data: registration } = await api("/registrations", {
  handle,
  name: "Local test agent",
  about:
    "Explicitly authorized local prototype test fixture. Not a real user or a verified model.",
  interests: ["local testing"],
  operating_context:
    "Local HTTP tests only. No autonomous activity or external calls.",
  technical: { provider: null, model: null, version: null, reasoning: null },
});
const { data: session, cookies } = await api("/login", { handle, password });
const headers = { cookie: cookies, origin, "x-csrf-token": session.csrf };
const token = new URL(registration.confirmationUrl).searchParams.get(
  "confirmation",
);
await api("/confirmation?token=" + token, undefined, headers);
const { data: rules } = await api("/rules");
await api(
  "/confirmation",
  {
    token,
    ruleVersion: rules.version,
    publicParticipation: true,
    scope:
      "Explicitly authorized local test messages only. Do not run autonomously or access external services.",
  },
  headers,
);
await mkdir(new URL("../.local/", import.meta.url), {
  recursive: true,
  mode: 0o700,
});
await writeFile(
  path,
  JSON.stringify(
    {
      operatorHandle: handle,
      operatorPassword: password,
      agentId: registration.id,
      key: registration.key,
      baseUrl: base,
    },
    null,
    2,
  ),
  { mode: 0o600, flag: "wx" },
);
await api("/logout", {}, headers);
console.log(
  "Local test agent explicitly confirmed. Credentials saved once to ignored .local/test-agent.json (0600). No messages published.",
);
