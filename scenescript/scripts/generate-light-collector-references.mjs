/** Render the demo's own vector artwork; no AI calls, invented designs or external images. */
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
const base=process.argv[process.argv.indexOf('--url')+1]&&process.argv.includes('--url')?process.argv[process.argv.indexOf('--url')+1]:'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
let images;
try{
 const page=await browser.newPage();await page.goto(new URL('/de/',base).href);await page.locator('#editor[data-ready=true]').waitFor();
 images=await page.evaluate(async()=>{
  const {lightCollectorProject}=await import('/src/lib/light-collector-example.ts'),{parseModel2D}=await import('/src/lib/model2d.ts'),{defaultActor2D,defaultAction2D,defaultStage2D,defaultStage2DResource}=await import('/src/lib/stage2d.ts'),{Stage2DRenderer}=await import('/src/scripts/stage2d.ts'),{ExportRenderer}=await import('/src/scripts/export-renderer.ts'),{ExportMedia}=await import('/src/scripts/export-media.ts');
  const project=lightCollectorProject(),renderer=await new Stage2DRenderer().init(),canvas=document.createElement('canvas'),images={};
  const save=(id,canvas)=>{images['reference-'+id]={name:id+'.webp',data:canvas.toDataURL('image/webp',.92)};};
  try{
   for(const id of ['collector','spark','butterfly','flower']){
    const stage=defaultStage2DResource('custom');stage.model=parseModel2D({width:960,height:540,originX:0,originY:0,parts:[{id:'background',shape:'rectangle',width:960,height:540,fill:id==='spark'?'#173c3c':'#e8eee5'}]});
    const resources={objects2d:{[id]:project.objects2d[id]},stages2d:{reference:stage}},shot=defaultStage2D('reference');
    const variants=id==='butterfly'?['#8dd9df','#f4cf82','#f0a8cc']:id==='flower'?['#efa5bd','#f2cb79','#b9a4df']:[null];
    for(const [i,color]of variants.entries()){
     const actor=defaultActor2D(id,'reference-'+i);actor.x=variants.length===1?480:240+i*240;actor.y=id==='collector'?450:id==='flower'?475:id==='butterfly'?345:270;actor.scale=id==='collector'?1.75:id==='flower'?1.9:id==='butterfly'?2.8:4;actor.color=color;
     if(id==='collector')actor.actions=[{...defaultAction2D('wave'),duration:2.3}];shot.actors.push(actor);
    }
    renderer.render(shot,3,id==='collector'?1:.65,960,540,canvas,resources);save(id,canvas);
   }
   for(const id of ['forest','night-garden']){const shot=defaultStage2D(id);renderer.render(shot,3,2,960,540,canvas,project);save(id,canvas);}
  }finally{renderer.dispose();}
  const media=new ExportMedia(project,new AbortController().signal),exporter=new ExportRenderer(project,media);
  try{for(const [id,time]of [['arrival',2.3],['discovery',5.25],['catch',12.5],['transformation',21]]){const frame=await exporter.frame(time,960,540);save(id,frame);frame.width=frame.height=0;}}finally{exporter.dispose();media.dispose();}
  return images;
 });
}finally{await browser.close();}
const root=new URL('../public/examples/light-collector-storyboard/',import.meta.url);await mkdir(root,{recursive:true});
for(const image of Object.values(images))await writeFile(new URL(image.name,root),Buffer.from(image.data.split(',')[1],'base64'));
await writeFile(new URL('../src/lib/light-collector-references.json',import.meta.url),JSON.stringify(images,null,2)+'\n');
const result=spawnSync(process.execPath,['--experimental-strip-types','scripts/generate-light-collector.mjs'],{cwd:new URL('../',import.meta.url),stdio:'inherit'});if(result.status!==0)throw Error('Failed to package demo');
console.log(`Rendered ${Object.keys(images).length} storyboard references.`);
