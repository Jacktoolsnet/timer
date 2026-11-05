import sharp from 'sharp';
import { fail } from './db.js';

// Limit decoded input, not its ~33% larger Base64 representation.
export const MAX_AVATAR_BYTES = 1_000_000;
export const MAX_AVATAR_BASE64 = 4 * Math.ceil(MAX_AVATAR_BYTES / 3);
export async function normalizeAvatar(base64: string): Promise<string> {
  if (!base64 || base64.length > MAX_AVATAR_BASE64 || base64.length % 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(base64))
    fail(400, 'INVALID_AVATAR', 'Use canonical Base64 without a data URL prefix');
  const input = Buffer.from(base64, 'base64');
  if (input.length > MAX_AVATAR_BYTES) fail(413, 'AVATAR_TOO_LARGE', 'Avatar must not exceed 1,000,000 bytes');
  if (input.toString('base64') !== base64) fail(400, 'INVALID_AVATAR', 'Invalid Base64 encoding');
  // Reject vector formats before passing any data to an image decoder.
  const png = input.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
  const webp = input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP';
  if (!png && !jpeg && !webp) fail(400, 'INVALID_AVATAR', 'Only static PNG, JPEG and WebP images are accepted');
  // libvips may decode only the first APNG frame, so reject animation chunks explicitly.
  if (png) {
    for (let offset = 8; offset + 12 <= input.length;) {
      const length = input.readUInt32BE(offset);
      if (input.toString('ascii', offset + 4, offset + 8) === 'acTL')
        fail(400, 'INVALID_AVATAR', 'Animated avatars are not supported');
      if (length > input.length - offset - 12) fail(400, 'INVALID_AVATAR', 'Truncated PNG');
      offset += length + 12;
    }
  }
  try {
    const image = sharp(input, { limitInputPixels: 4_194_304, failOn: 'warning' });
    const meta = await image.metadata();
    if (!['png', 'jpeg', 'webp'].includes(meta.format || '') || (meta.pages || 1) !== 1)
      throw Error('Unsupported image');
    // Decode/re-encode, auto-orient and strip metadata; never serve original uploads.
    const output = await image.rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    if (output.length > MAX_AVATAR_BYTES) throw Error('Image too large');
    return output.toString('base64');
  } catch {
    return fail(400, 'INVALID_AVATAR', 'Invalid, animated or oversized image dimensions (maximum 4,194,304 pixels)');
  }
}
