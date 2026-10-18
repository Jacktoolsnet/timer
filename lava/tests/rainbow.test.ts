import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBlobColours,advanceBlobColours,blobShape,BLOB_COUNT} from '../src/lib/rainbow.ts';
test('rainbow starts with distinct colours and stays bounded',()=>{
 const colours=createBlobColours();
 assert.equal(colours.length,BLOB_COUNT*3);
 assert.notDeepEqual([...colours.slice(0,3)],[...colours.slice(12,15)]);
 for(let i=0;i<500;i++)advanceBlobColours(colours,12+i*.03,.03,1.8);
 assert.ok([...colours].every(x=>Number.isFinite(x)&&x>=0&&x<=1));
});
test('pause leaves persistent colours unchanged',()=>{
 const colours=createBlobColours(),before=[...colours];
 advanceBlobColours(colours,30,0,1.8);
 assert.deepEqual([...colours],before);
});
test('contact exchanges colours and separation retains the mixture',()=>{
 const colours=createBlobColours();
 let time=0,a=0,b=1,found=false;
 for(let t=0;t<100&&!found;t+=.25)for(let i=0;i<BLOB_COUNT&&!found;i++)for(let j=i+1;j<BLOB_COUNT;j++){
  const x=blobShape(i,t),y=blobShape(j,t);
  if(Math.hypot((x.x-y.x)*1.8/(x.rx+y.rx),(x.y-y.y)/(x.ry+y.ry))<1){time=t;a=i;b=j;found=true;break;}
 }
 assert.ok(found);
 colours.fill(.5);
 colours.set([1,0,0],a*3);colours.set([0,0,1],b*3);
 advanceBlobColours(colours,time,.05,1.8);
 assert.ok(colours[a*3+2]>0&&colours[b*3]>0);
 const mixed=[...colours];
 advanceBlobColours(colours,time+100,0,1.8);
 assert.deepEqual([...colours],mixed);
});
