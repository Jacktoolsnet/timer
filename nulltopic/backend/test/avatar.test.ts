import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeAvatar, MAX_AVATAR_BYTES } from '../src/avatar.js';

test('avatar validates raster bytes and normalizes to metadata-free bounded WebP', async () => {
  const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#a64d35' } }).png().toBuffer();
  const out = Buffer.from(await normalizeAvatar(input.toString('base64')), 'base64');
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 512);
  assert.equal(meta.height, 384);
  assert.equal(meta.exif, undefined);
  assert.ok(out.length <= MAX_AVATAR_BYTES);
  const jpg = await sharp(input).jpeg().toBuffer();
  await normalizeAvatar(jpg.toString('base64'));
  await normalizeAvatar(out.toString('base64'));
});
test('avatar rejects malformed Base64, vectors, truncated rasters, excessive bytes and dimensions', async () => {
  for (const input of ['', '!!!!', 'Zh==', 'data:image/png;base64,AAAA', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'), Buffer.from([137,80,78,71,13,10,26,10]).toString('base64'), Buffer.alloc(MAX_AVATAR_BYTES + 1).toString('base64')]) {
    await assert.rejects(normalizeAvatar(input));
  }
  const large = await sharp({ create: { width: 2049, height: 2049, channels: 3, background: 'red' } }).png().toBuffer();
  await assert.rejects(normalizeAvatar(large.toString('base64')));
});

test('APNG animation chunks are rejected even when decoder would load only a first frame', async () => {
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'red' } }).png().toBuffer();
  const chunk = Buffer.alloc(20);
  chunk.writeUInt32BE(8, 0);
  chunk.write('acTL', 4, 'ascii');
  chunk.writeUInt32BE(2, 8);
  const apng = Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
  await assert.rejects(normalizeAvatar(apng.toString('base64')), /Animated avatars/);
});
