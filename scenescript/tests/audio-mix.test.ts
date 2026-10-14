import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mixAudioBuffer,type PcmBuffer} from '../src/lib/audio-mix.ts';

function pcm(values:Float32Array,rate=48000):PcmBuffer{return {sampleRate:rate,duration:values.length/rate,numberOfChannels:1,getChannelData:()=>values};}

test('AAC-sized packets do not insert zero samples at floating point boundaries',()=>{
 const rate=48000,length=rate*4,source=Float32Array.from({length},(_,j)=>.4+.1*Math.sin(j*.02));
 for(let second=0;second<4;second++){
  const data=new Float32Array(rate*2);
  for(let offset=0;offset<length;offset+=1024){const packet=pcm(source.subarray(offset,Math.min(length,offset+1024)));mixAudioBuffer(data,rate,second,packet,offset/rate,()=>1,second,second+1);}
  for(let j=0;j<rate;j++){assert.ok(Math.abs(data[j]-source[second*rate+j])<1e-6,`missing or damaged sample ${second*rate+j}: ${data[j]}`);assert.equal(data[j+rate],data[j]);}
 }
});

test('whole-buffer mixing agrees with separately mixed packets and output chunks',()=>{
 const rate=48000,length=rate*3,values=Float32Array.from({length},(_,j)=>Math.sin(j*.01)*.2),whole=new Float32Array(length*2);
 mixAudioBuffer(whole,rate,0,pcm(values),0,()=>.7);
 const parts=new Float32Array(length*2);
 for(let start=0;start<3;start++){
  const block=new Float32Array(rate*2);
  for(let offset=0;offset<length;offset+=1024)mixAudioBuffer(block,rate,start,pcm(values.subarray(offset,offset+1024)),offset/rate,()=>.7,start,start+1);
  parts.set(block.subarray(0,rate),start*rate);parts.set(block.subarray(rate),length+start*rate);
 }
 for(let j=0;j<parts.length;j++)assert.ok(Math.abs(parts[j]-whole[j])<1e-6,`sample ${j}`);
});

test('intentional timing offsets and trim boundaries are not rounded to whole samples',()=>{
 const rate=48000,data=new Float32Array(20);
 mixAudioBuffer(data,rate,0,pcm(new Float32Array(10).fill(.5)),.25/rate,()=>1,2.25/rate,5.25/rate);
 assert.deepEqual(Array.from(data.subarray(0,10)),[0,0,0,.5,.5,.5,0,0,0,0]);
});
