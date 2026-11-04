import {test,expect} from '@playwright/test';
import {constellationStar,constellationCentre,constellationLights,paintConstellation} from '../src/lib/constellation';
import {LandscapeHistory} from '../src/lib/landscape';
import bank from '../public/library/classical-canon.orbit.json' with {type:'json'};
import {chooseAnimation,setTempo} from './animation-helpers';

test('81 independent, stable star groups remain on-canvas and cancel queued or released notes',()=>{
 const history=new LandscapeHistory(81),centres=new Set<string>();
 for(let i=0;i<81;i++){
  centres.add(constellationCentre(i,true).join(':'));
  for(const pitch of [-36,0,12,72]){
   const p=constellationStar(i,pitch,true);expect(p).toEqual(constellationStar(i,pitch,true));
   expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(700);expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(700);
  }
  const [sx,sy]=constellationCentre(i,true),large=constellationStar(i,0,true);
  expect(Math.hypot(large.x-sx,large.y-sy)).toBeCloseTo((20+36/108*43)*1.05,8);
  history.record(i,{at:1,pitch:12,level:.8,length:4});history.record(i,{at:3,pitch:24,level:.8,length:4});
  expect(constellationLights(history,i,.9,true)).toHaveLength(0);expect(constellationLights(history,i,2,true)).toHaveLength(1);
 }
 expect(centres.size).toBe(81);history.cancel(80,2);expect(history.notes(80)).toHaveLength(1);
 expect(constellationLights(history,80,4,true)).toHaveLength(0);expect(constellationLights(history,79,4,true).length).toBeGreaterThan(0);
 history.clear(79);expect(history.notes(79)).toHaveLength(0);expect(history.notes(0)).toHaveLength(2);
});

test('dense shared skies have bounded light work; mutes and reduced motion suppress note haloes',()=>{
 const history=new LandscapeHistory(81),tracks=Array.from({length:81},(_,index)=>({index,color:'#77ccff',volume:.5,mute:false,pitched:true}));
 for(let i=0;i<81;i++)for(let j=0;j<128;j++)history.record(i,{at:1+j*.001,pitch:j%24,level:.8,length:4});
 const draw=(reduced=false,mute=false)=>{
  let gradients=0;const ctx={save(){},restore(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillText(){},arc(){},
   createRadialGradient(){gradients++;return {addColorStop(){}};}} as unknown as CanvasRenderingContext2D;
  paintConstellation(ctx,history,tracks.map(t=>({...t,mute})),2,true,true,reduced,1,1,'stars',true);return gradients;
 };
 expect(draw()).toBeGreaterThan(81);expect(draw()).toBeLessThanOrEqual(181);
 expect(draw(true)).toBe(1);expect(draw(false,true)).toBe(1); // only the fixed sky background
});

test('Canon lights all four audible sets, keeps a shared sky on selection, and mutes only the chosen set',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  (window as any).skyGlows=[];const radial=CanvasRenderingContext2D.prototype.createRadialGradient;
  CanvasRenderingContext2D.prototype.createRadialGradient=function(...args){if(this.canvas.id==='orbit'&&args[2]===0){const a=(window as any).skyGlows;a.push([args[0],args[1]]);if(a.length>5000)a.splice(0,500);}return radial.apply(this,args);};
 });
 await page.goto('/de/');await page.locator('#music-settings-open').click();await page.locator('[data-library-open=classical]').click();await page.locator('[data-library-song=classical-canon]').click();
 const orbit=page.locator('#orbit');await expect(orbit).toHaveAttribute('data-visualization','constellation');await expect(orbit).toHaveAttribute('data-constellation-sets','4');await expect(orbit).toHaveAttribute('data-constellation-lanes','36');
 await setTempo(page,'220');
 const lit=()=>page.evaluate(()=> (window as any).skyGlows as number[][]);
 await expect.poll(async()=>{
  const glows=await lit();return [0,10,20,30].filter(i=>{const [x,y]=constellationCentre(i,true);return glows.some(p=>Math.hypot(p[0]-x,p[1]-y)<70);}).length;
 },{timeout:13000}).toBe(4);
 await orbit.screenshot({path:'/tmp/canon-sky-'+info.project.name+'.png'});
 await page.locator('#orbit-sets-open').click();await page.locator('[data-orbit-select="2"]').click();
 await expect(orbit).toHaveAttribute('data-visualization','constellation');await expect(orbit).toHaveAttribute('data-constellation-sets','4');await expect(orbit).toHaveAttribute('data-constellation-lanes','36');
 await page.locator('[data-orbit-mute="3"]').click();await page.evaluate(()=>(window as any).skyGlows=[]);await page.waitForTimeout(450);
 const [x,y]=constellationCentre(30,true);expect((await lit()).some(p=>Math.hypot(p[0]-x,p[1]-y)<70)).toBe(false);
 await page.locator('[data-orbit-mute="3"]').click();await expect.poll(async()=>(await lit()).some(p=>Math.hypot(p[0]-x,p[1]-y)<70)).toBe(true);
 await page.locator('#play').click();await page.evaluate(()=>(window as any).skyGlows=[]);await page.waitForTimeout(350);expect(await lit()).toHaveLength(0);
 await chooseAnimation(page,'button[data-visualization=orbit]');await expect(orbit).toHaveAttribute('data-visualization','orbit');
 expect(errors).toEqual([]);
});

test('all 9 sets and 81 instruments are represented without changing imported notes',async({page})=>{
 const p=structuredClone(bank) as any;const one=structuredClone(p.sets[0].settings);delete one.songScript;
 one.visualization='constellation';one.tracks.forEach((tr:any)=>{tr.enabled=true;tr.volume=.2;tr.score=[{start:0,duration:.03,points:[{offset:0,pitch:12,velocity:.5}]}];});
 p.sets=Array.from({length:9},(_,i)=>({name:'Group '+i,muted:false,settings:structuredClone(one),barOffset:0}));
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'81.orbit.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await page.locator('#files-close').click();
 await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-sets','9');await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-lanes','81');
 await page.locator('#play').click();await page.waitForTimeout(500);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
});


test('one occupied set still shows all nine rings, including disabled and silent instrument slots',async({page})=>{
 const p=structuredClone(bank);for(let i=1;i<9;i++)p.sets[i]={name:'',muted:false,settings:null,barOffset:0} as any;
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'one.orbit.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await page.locator('#files-close').click();
 await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-sets','1');await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-lanes','9');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});

test('silent orbit rings do not dilute the nebula; dense banks retain strong clouds within the rendering budget',()=>{
 const history=new LandscapeHistory(81);
 for(let i=0;i<81;i++)history.record(i,{at:1,pitch:12,level:.9,length:3});
 const tracks=Array.from({length:81},(_,index)=>({index,color:'#77ccff',volume:.5,mute:false,pitched:true}));
 const draw=(lanes:typeof tracks)=>{
  let gradients=0;const alphas:number[]=[];
  const ctx={globalAlpha:1,save(){},restore(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){alphas.push(this.globalAlpha);},fillText(){},arc(){},
   createRadialGradient(){gradients++;return {addColorStop(){}};}};
  paintConstellation(ctx as unknown as CanvasRenderingContext2D,history,lanes,2,true,true,false,1,1,'nebula',true);
  return {gradients,alphas};
 };
 const four=tracks.slice(0,4),quiet=tracks.slice(4,36).map(t=>({...t,mute:true,volume:0}));
 const reference=draw(four),expanded=draw([...four,...quiet]);
 expect(reference.gradients).toBeGreaterThan(40);expect(expanded.gradients).toBe(reference.gradients);
 expect(expanded.alphas.filter(a=>a>.05).length).toBeGreaterThan(20);
 // 81 sounding lanes get at most three nebula layers and two note haloes each.
 expect(draw(tracks).gradients).toBeLessThanOrEqual(1+81*5);
});

test('Canon nebula paints visibly strong clouds despite all 36 orbit rings being present',async({page},info)=>{
 await page.addInitScript(()=>{
  (window as any).visibleNebula=0;const clouds=new WeakSet<CanvasGradient>();
  const radial=CanvasRenderingContext2D.prototype.createRadialGradient,fill=CanvasRenderingContext2D.prototype.fill;
  CanvasRenderingContext2D.prototype.createRadialGradient=function(...args){const g=radial.apply(this,args);if(this.canvas.id==='orbit'&&args[2]===0&&args[5]>45)clouds.add(g);return g;};
  CanvasRenderingContext2D.prototype.fill=function(...args:any[]){if(this.canvas.id==='orbit'&&typeof this.fillStyle==='object'&&clouds.has(this.fillStyle as CanvasGradient)&&this.globalAlpha>.02)(window as any).visibleNebula++;return (fill as any).apply(this,args);};
 });
 await page.goto('/de/');await page.locator('#music-settings-open').click();await page.locator('[data-library-open=classical]').click();await page.locator('[data-library-song=classical-canon]').click();
 await setTempo(page,'220');await chooseAnimation(page,'button[data-constellation-variant=nebula]');
 await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-lanes','36');
 await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-variant','nebula');
 await expect.poll(()=>page.evaluate(()=>(window as any).visibleNebula)).toBeGreaterThan(20);
 await page.waitForTimeout(6500);await page.locator('#orbit').screenshot({path:'/tmp/canon-nebula-'+info.project.name+'.png'});
});
