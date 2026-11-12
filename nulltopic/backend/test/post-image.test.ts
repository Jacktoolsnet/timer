import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizePostImage} from '../src/post-image.js';
import {normalizeAvatar} from '../src/avatar.js';
async function gif(frames=2,width=16,height=16,delay=100){
 const pixels=Buffer.concat(Array.from({length:frames},(_,i)=>Buffer.alloc(width*height*3,i%2?220:20)));
 return sharp(pixels,{raw:{width,height:height*frames,channels:3,pageHeight:height}}).gif({loop:0,delay:Array(frames).fill(delay)}).toBuffer();
}
test('post images accept exactly 1 MB and normalize safely, rejecting excess and static pixel bombs',async()=>{
 const png=await sharp({create:{width:20,height:20,channels:3,background:'purple'}}).png().toBuffer();
 const exact=Buffer.concat([png,Buffer.alloc(1_000_000-png.length)]);
 const value=await normalizePostImage(exact.toString('base64'));assert.equal(value.width,20);assert.equal(value.animated,false);assert.equal(value.poster,null);assert.equal((await sharp(Buffer.from(value.base64,'base64')).metadata()).format,'webp');
 await assert.rejects(normalizePostImage(Buffer.concat([exact,Buffer.alloc(1)]).toString('base64')));
 const bomb=await sharp({create:{width:2049,height:2049,channels:3,background:'white'}}).png().toBuffer();await assert.rejects(normalizePostImage(bomb.toString('base64')));
 for(const bad of ['AAAA','AAAA\n',Buffer.from('<svg/>').toString('base64')])await assert.rejects(normalizePostImage(bad));
});
test('own GIFs preserve distinct frames in normalized one-play WebP with an independent static poster; avatars remain static',async()=>{
 const input=await gif(),value=await normalizePostImage(input.toString('base64'));
 assert.equal(value.animated,true);assert.equal(value.frames,2);assert.equal(value.durationMs,200);assert.equal(value.width,16);assert.equal(value.height,16);assert.ok(value.poster);
 const meta=await sharp(Buffer.from(value.base64,'base64'),{animated:true}).metadata();assert.equal(meta.pages,2);assert.equal(meta.loop,1);assert.equal(meta.exif,undefined);assert.equal(meta.icc,undefined);
 const first=await sharp(Buffer.from(value.base64,'base64'),{page:0,pages:1}).raw().toBuffer(),last=await sharp(Buffer.from(value.base64,'base64'),{page:1,pages:1}).raw().toBuffer();assert.notDeepEqual(first,last);
 assert.equal((await sharp(Buffer.from(value.poster!,'base64'),{animated:true}).metadata()).pages||1,1);
 assert.ok(Buffer.from(value.base64,'base64').length<=1_000_000);assert.ok(Buffer.from(value.poster!,'base64').length<=1_000_000);
 await assert.rejects(normalizeAvatar(input.toString('base64')));
 await assert.rejects(normalizePostImage(value.base64),'animated WebP input is not silently enabled');
 const resized=await normalizePostImage((await gif(2,800,600)).toString('base64'));assert.equal(resized.width,512);assert.equal(resized.height,384);assert.equal(resized.frames,2);
 const exact=Buffer.concat([input,Buffer.alloc(1_000_000-input.length)]);assert.equal((await normalizePostImage(exact.toString('base64'))).animated,true);
 const still=await normalizePostImage((await gif(1)).toString('base64'));assert.equal(still.animated,false);
});
test('GIF frame, duration, dimensions, cumulative decode and malformed-input limits are enforced before full animation processing',async()=>{
 for(const input of [await gif(101),await gif(2,16,16,6000),await gif(2,1025,1024),await gif(65,512,512),Buffer.from('GIF89aTRUNCATED')])await assert.rejects(normalizePostImage(input.toString('base64')));
 const normalized=await normalizePostImage((await gif(2,16,16,10)).toString('base64'));assert.equal(normalized.durationMs,100,'fast frames are bounded to 20 fps');
 const padded=Buffer.concat([await gif(),Buffer.alloc(1_000_001)]);await assert.rejects(normalizePostImage(padded.toString('base64')));
});

test('GIF decoding rejects excess concurrent jobs without a retained work queue',async()=>{
 const input=(await gif()).toString('base64');
 const results=await Promise.allSettled([normalizePostImage(input),normalizePostImage(input),normalizePostImage(input)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,2);
 const rejected=results.find(r=>r.status==='rejected') as PromiseRejectedResult;assert.equal(rejected.reason.code,'IMAGE_BUSY');assert.equal(rejected.reason.statusCode,503);
 assert.equal((await normalizePostImage(input)).animated,true,'processing slots are released');
});
