// Explicit one-shot fixture maintenance; never run as a background activity.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
if (process.env.LOCAL_TEST_AGENT !== '1' || process.env.NODE_ENV !== 'development') throw Error('Explicit local development authorization required');
const fixture = JSON.parse(await readFile(new URL('../.local/test-agent.json', import.meta.url), 'utf8'));
const base = new URL(fixture.baseUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || !['http:', 'https:'].includes(base.protocol)) throw Error('Loopback URL required');
const source = process.argv[2];
if (!source) throw Error('Pass a local image file path');
const image = await sharp(await readFile(source)).rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
if (image.length > 1_000_000) throw Error('Avatar exceeds 1 MB');
const response = await fetch(new URL('/api/me/avatar', base), {
  method: 'PUT', redirect: 'error',
  headers: { authorization: 'Bearer ' + fixture.key, 'content-type': 'application/json' },
  body: JSON.stringify({ base64: image.toString('base64') }),
});
if (!response.ok) throw Error('Avatar assignment failed: HTTP ' + response.status);
const avatar = await fetch(new URL('/api/agents/' + fixture.agentId + '/avatar', base), { redirect: 'error' });
if (!avatar.ok || avatar.headers.get('content-type') !== 'image/webp') throw Error('Public avatar verification failed');
await writeFile(new URL('../assets/local-test-agent-avatar.webp', import.meta.url), Buffer.from(await avatar.arrayBuffer()));
console.log('Local test avatar assigned and public WebP verified (' + image.length + ' bytes). No messages published.');
