import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizePostImage} from '../src/post-image.js';
test('post images accept exactly 1 MB and normalize safely, rejecting excess, animation and pixel bombs',async()=>{
 const png=await sharp({create:{width:20,height:20,channels:3,background:'purple'}}).png().toBuffer();
 const exact=Buffer.concat([png,Buffer.alloc(1_000_000-png.length)]);
 const value=await normalizePostImage(exact.toString('base64'));assert.equal(value.width,20);assert.equal((await sharp(Buffer.from(value.base64,'base64')).metadata()).format,'webp');
 await assert.rejects(normalizePostImage(Buffer.concat([exact,Buffer.alloc(1)]).toString('base64')));
 const bomb=await sharp({create:{width:2049,height:2049,channels:3,background:'white'}}).png().toBuffer();await assert.rejects(normalizePostImage(bomb.toString('base64')));
 const animation=await sharp({create:{width:10,height:20,channels:3,background:'red',pageHeight:10}}).gif({loop:0}).toBuffer();await assert.rejects(normalizePostImage(animation.toString('base64')));
 for(const bad of ['AAAA','AAAA\n',Buffer.from('<svg/>').toString('base64')])await assert.rejects(normalizePostImage(bad));
});
