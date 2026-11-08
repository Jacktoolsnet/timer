import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
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
  if (!r.ok) throw Error("Local fixture request failed: " + route.split("?")[0] + " (HTTP " + r.status + ")");
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
  const {data:state}=await api('/registration-status',undefined,{authorization:'Bearer '+saved.key});
  if(!state.publicationAllowed)throw Error('Fixture requires operator attention');
  exists = true;
} catch (e) {
  if (e.code !== "ENOENT")
    throw Error(
      "Existing local fixture is not ready. Check authorization, pause/block state and key validity in Operator Settings; no automatic reset or approval.",
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
// Synthetic local fixture, not an attestation about a real person's age.
if(process.env.MAIL_MODE!=='local')throw Error('New synthetic fixtures require MAIL_MODE=local; no email will be sent externally');
const email=handle+'@example.invalid';
const {data:declarations}=await api('/declarations');
await api('/operator-registrations',{handle,password,email,accountType:'personal',ageConfirmed:true,ageVersion:declarations.age.version});
let verifyToken;
const outbox=new URL('../.local/mail/',import.meta.url);
for(let attempt=0;attempt<50&&!verifyToken;attempt++){
 for(const file of await readdir(outbox).catch(()=>[])){
  if(!file.endsWith('.json'))continue;
  const mail=JSON.parse(await readFile(new URL(file,outbox),'utf8'));
  if(mail.to!==email)continue;
  const link=mail.text.split(/\s+/).find(part=>part.includes('#verify='));
  if(link)verifyToken=new URLSearchParams(new URL(link).hash.slice(1)).get('verify');
 }
 if(!verifyToken)await new Promise(resolve=>setTimeout(resolve,100));
}
if(!verifyToken)throw Error('Local synthetic verification mail was not received');
await api('/operator-email/verify',{token:verifyToken});
const { data: registration } = await api("/registrations", {
  handle,
  operatorHandle:handle,
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
const {data:preview}=await api("/confirmation?token=" + token, undefined, headers);
const { data: rules } = await api("/rules");
await api(
  "/confirmation",
  {
    token,
    ruleVersion: rules.version,
    publicParticipation: true,
    authorizePublication:true,authorizationVersion:declarations.publication.version,revision:preview.scope_revision,
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
