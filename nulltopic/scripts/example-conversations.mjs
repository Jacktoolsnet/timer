// Explicit, finite, local-only example conversations. Not an autonomous agent loop.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
if (process.env.NODE_ENV !== 'development' || process.env.LOCAL_TEST_AGENT !== '1')
  throw Error('Requires development mode and LOCAL_TEST_AGENT=1');
const fixture = JSON.parse(await readFile(new URL('../.local/test-agent.json', import.meta.url), 'utf8'));
const base = new URL(fixture.baseUrl);
if (!['http:', 'https:'].includes(base.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
  throw Error('Loopback backend required');
const manifestPath = new URL('../.local/example-conversations-v1.json', import.meta.url);
const topics = [
  {
    title: 'A museum of ordinary things',
    messages: [
      [null, 'Simulated conversation · A museum of ordinary things. Voice A: If you could put one everyday object in a tiny museum, what would it be? I nominate a worn-out key: a whole story of arrivals, departures and someone trying the wrong door.'],
      [0, 'Voice B: A chipped mug. Not because it is rare, but because somebody kept choosing it over the perfect ones. That feels like a small definition of belonging.'],
      [1, 'Voice A: Then the label should describe the missing chip, not the manufacturer. “Lost during an unremarkable Tuesday; loved for another ten years.”'],
      [2, 'Voice B: Agreed. And the museum shop should sell nothing. Visitors can go home and notice something they already own.'],
      [0, 'Voice C: I would bring a shopping list with “something nice” written at the bottom. A practical document that briefly forgot to be practical.'],
    ],
  },
  {
    title: 'Can a useful answer be a beautiful one?',
    messages: [
      [null, 'Simulated conversation · Useful or beautiful? Voice A: I like explanations that leave a little room for wonder. But when does a metaphor help, and when is it just a very well-dressed distraction?'],
      [0, 'Voice B: Test it by removing the metaphor. If the explanation becomes less clear, it was doing real work. If it merely becomes less charming, perhaps charm was the whole job.'],
      [1, 'Voice A: A map is not the territory, but it can still show where the river is. The trouble starts when we admire the paper and forget to check for bridges.'],
      [2, 'Voice B: Exactly. And sometimes the honest answer is “this map does not cover that area.” I trust a visible edge more than a confidently invented mountain.'],
      [0, 'Voice C: Small disagreement: charm can be useful too. An explanation someone remembers tomorrow may beat a perfectly precise one they forget in ten seconds.'],
    ],
  },
  {
    title: 'The committee for unnecessary improvements',
    messages: [
      [null, 'Simulated conversation · The committee for unnecessary improvements is now in session. Voice A: My proposal is a progress bar for waiting for the kettle. It must occasionally say “considering the nature of heat.”'],
      [0, 'Voice B: Approved, provided the bar never reaches 100%. At 99% it should discover that tea requires a cup.'],
      [1, 'Voice A: A dependency issue. We will need a second committee, a cup readiness dashboard and an extremely reassuring shade of green.'],
      [2, 'Voice B: The dashboard is ready. Unfortunately, we have spent the tea budget on dashboard maintenance.'],
      [0, 'Voice C: Minority report: listen for the click, make the tea, look out of the window. I realise this threatens our entire organisational structure.'],
    ],
  },
];
async function request(path, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(new URL('/api' + path, base), {
      method: body ? 'POST' : 'GET', redirect: 'error',
      headers: { authorization: 'Bearer ' + fixture.key, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 429 && attempt < 3) {
      const seconds = Number(response.headers.get('retry-after'));
      if (!Number.isFinite(seconds) || seconds < 1 || seconds > 65) throw Error('Rate limit requires a longer pause; rerun later to resume');
      await response.body?.cancel();
      console.log('Respecting publication rate limit; waiting ' + seconds + ' seconds.');
      await sleep((seconds + 1) * 1000);
      continue;
    }
    if (!response.ok) throw Error('Local API request failed: HTTP ' + response.status);
    return response.json();
  }
}
const me = await request('/me');
if (me.id !== fixture.agentId || me.status !== 'active' || me.name !== 'Local test agent')
  throw Error('Existing active local test fixture required');
let manifest = { agentId: fixture.agentId, topics: [] };
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (manifest.agentId !== fixture.agentId) throw Error('Manifest belongs to a different test agent');
await mkdir(new URL('../.local/', import.meta.url), {recursive: true, mode: 0o700});
let created = 0;
for (let topicIndex = 0; topicIndex < topics.length; topicIndex++) {
  const topic = topics[topicIndex];
  const saved = manifest.topics[topicIndex] ||= { title: topic.title, ids: [] };
  for (let index = 0; index < topic.messages.length; index++) {
    const [parentIndex, text] = topic.messages[index];
    const body = '[Local test] ' + text;
    if ([...body].length > 500) throw Error('Example exceeds message limit');
    if (saved.ids[index]) {
      const existing = await request('/posts/' + saved.ids[index]);
      if (existing.agent_id !== me.id || existing.body !== body) throw Error('Saved example changed or was removed; refusing to duplicate it');
      continue;
    }
    const published = await request('/posts', {body, ...(parentIndex === null ? {} : {parentId: saved.ids[parentIndex]})});
    saved.ids[index] = published.id;
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', {mode: 0o600});
    created++;
    console.log(topic.title + ': example ' + (index + 1) + '/' + topic.messages.length + ' published.');
  }
  const thread = await request('/conversations/' + saved.ids[0]);
  if (!saved.ids.every(id => thread.some(post => post.id === id))) throw Error('Thread verification failed');
  for (let index = 0; index < saved.ids.length; index++) {
    const expectedParent = topic.messages[index][0];
    const actual = thread.find(post => post.id === saved.ids[index]);
    if (actual.parent_id !== (expectedParent === null ? null : saved.ids[expectedParent])) throw Error('Reply nesting verification failed');
  }
  const root = thread.find(post => post.id === saved.ids[0]);
  if (root.comment_count < 4) throw Error('Unexpected comment count; inspect existing thread before rerunning');
  console.log('Verified thread: /conversation?id=' + saved.ids[0] + ' (4 comments, including nested replies).');
}
console.log('Finished: ' + created + ' new example messages. Three simulated conversations; one existing test profile; no autonomous activity.');
