import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const server=http.createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222">');return;}
 const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 res.setHeader('Content-Type',file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:720}});
const messages=[];page.on('console',m=>messages.push(m.type()+': '+m.text()));page.on('pageerror',e=>messages.push('ERROR '+e.message));
await page.goto(`http://127.0.0.1:${server.address().port}`);
const results=await page.evaluate(async()=>{
 const P=await import('/node_modules/pixi.js/dist/pixi.mjs');
 const T=await import('/node_modules/three/build/three.module.js');
 const app=new P.Application();await app.init({width:640,height:360,preference:'webgl',autoStart:false,background:0x142030,preserveDrawingBuffer:true});document.body.append(app.canvas);
 const output={pixi:P.VERSION,three:T.REVISION,userAgent:navigator.userAgent};
 const bubble=new P.Graphics().roundRect(15,15,610,115,18).fill(0xffffff).moveTo(70,130).lineTo(100,155).lineTo(110,130).fill(0xffffff);app.stage.addChild(bubble);
 const gradient=new P.FillGradient({type:'linear',colorStops:[{offset:0,color:'#ff0088'},{offset:1,color:'#0055ff'}]});
 const nativeText=new P.Text({text:'SceneScript: ÄÖÜ 🎬',style:{fontFamily:'Arial',fontSize:30,fill:gradient,stroke:{color:'#000000',width:1},dropShadow:{color:'#000000',blur:2,distance:2}}});nativeText.position.set(28,24);app.stage.addChild(nativeText);
 const html=new P.HTMLText({text:'<b>Fett</b> <i>Kursiv</i> <span style="color:#c00000;text-decoration:underline">Unterstrichen</span><br/><span style="text-decoration:line-through">Durchgestrichen</span>',style:{fontFamily:'Arial',fontSize:23,fill:'#101010'}});html.position.set(28,65);app.stage.addChild(html);
 for(let i=0;i<8;i++){app.render();await new Promise(r=>setTimeout(r,40));}
 let pixels=app.renderer.extract.pixels({target:app.stage}).pixels;
 output.text={htmlWidth:html.width,htmlHeight:html.height,nonWhitePixelsInText:0};
 // Confirm HTMLText generated visible marks inside a white bubble (not merely layout bounds).
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const c=canvas.getContext('2d');c.drawImage(app.canvas,0,0);const d=c.getImageData(30,70,350,50).data;for(let i=0;i<d.length;i+=4)if(d[i]<180&&d[i+1]<180&&d[i+2]<180)output.text.nonWhitePixelsInText++;
 const moving=new P.Graphics().rect(0,0,25,25).fill('#ff0000');app.stage.addChild(moving);
 const frame=t=>{moving.position.set(30+t*100,180);app.render();const cv=document.createElement('canvas');cv.width=640;cv.height=360;cv.getContext('2d').drawImage(app.canvas,0,0);return cv;};
 const hash=cv=>{let h=2166136261;for(const b of cv.getContext('2d').getImageData(0,0,640,360).data)h=Math.imul(h^b,16777619);return h>>>0;};
 const a=frame(.75),b=frame(.1),aa=frame(.75);output.seeking={first:hash(a),differentTime:hash(b),repeated:hash(aa),repeatEqual:hash(a)===hash(aa),timesDiffer:hash(a)!==hash(b)};
 const config={codec:'vp8',width:640,height:360,bitrate:1000000,framerate:30};
 output.encoding={supported:(await VideoEncoder.isConfigSupported(config)).supported};
 if(output.encoding.supported){const chunks=[];const encoder=new VideoEncoder({output:(chunk)=>chunks.push({type:chunk.type,timestamp:chunk.timestamp,bytes:chunk.byteLength}),error:e=>{throw e;}});encoder.configure(config);for(let i=0;i<3;i++){const f=new VideoFrame(frame(i/30),{timestamp:Math.round(i*1e6/30),duration:33333});encoder.encode(f,{keyFrame:i===0});f.close();}await encoder.flush();encoder.close();output.encoding.chunks=chunks;}
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><rect width="160" height="60" fill="gold"/><text x="10" y="25">SVG TEXT</text><circle cx="15" cy="45" r="7" fill="red"><animate attributeName="cx" from="15" to="145" dur="1s" fill="freeze"/></circle></svg>';
 try{const g=new P.Graphics().svg(svg);g.position.set(20,240);app.stage.addChild(g);app.render();output.svgNative={bounds:{width:g.width,height:g.height}};}catch(e){output.svgNative={error:e.message};} const plain=new P.Graphics().svg(svg.replace(/<animate[^>]*\/>/,''));plain.position.set(20,240);app.stage.addChild(plain);app.render();
 // Browser SMIL -> frozen SVG -> Pixi texture: same principle as SceneScript freezeSvg.
 const host=document.createElement('div');host.innerHTML=svg;document.body.append(host);const s=host.firstChild;s.pauseAnimations();
 const svgFrames=[];for(const t of [0,.5,0]){s.setCurrentTime(t);const clone=s.cloneNode(true);clone.querySelector('circle').setAttribute('cx',String(s.querySelector('circle').cx.animVal.value));clone.querySelectorAll('animate').forEach(n=>n.remove());const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));const img=new Image();img.src=url;await img.decode();const tex=P.Texture.from(img),sp=new P.Sprite(tex);sp.position.set(210,240);app.stage.addChild(sp);app.render();const cv=document.createElement('canvas');cv.width=640;cv.height=360;cv.getContext('2d').drawImage(app.canvas,0,0);svgFrames.push(hash(cv));app.stage.removeChild(sp);sp.destroy();tex.destroy(true);URL.revokeObjectURL(url);}
 host.remove();output.svgAdapter={hashes:svgFrames,repeatEqual:svgFrames[0]===svgFrames[2],timesDiffer:svgFrames[0]!==svgFrames[1]};
 // Three -> canvas texture -> Pixi, matching current separate Three renderer ownership.
 const three=new T.WebGLRenderer({alpha:true,preserveDrawingBuffer:true});three.setSize(100,100);const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=3;const mesh=new T.Mesh(new T.PlaneGeometry(1.8,1.8),new T.MeshBasicMaterial({color:0x00ff00}));scene.add(mesh);three.render(scene,camera);const tex=P.Texture.from(three.domElement),sp=new P.Sprite(tex);sp.position.set(500,200);app.stage.addChild(sp);app.render();const sample=()=>{c.clearRect(0,0,640,360);c.drawImage(app.canvas,0,0);return [...c.getImageData(550,250,1,1).data];};const green=sample();mesh.material.color.set(0x0000ff);three.render(scene,camera);tex.source.update();app.render();output.threeCanvas={green,blue:sample()};
 // Shared context proof, independent of the existing Stage3DRenderer implementation.
 const tr=new T.WebGLRenderer({stencil:true,preserveDrawingBuffer:true});tr.setSize(160,90);const pr=new P.WebGLRenderer();await pr.init({context:tr.getContext(),width:160,height:90,clearBeforeRender:false});const st=new P.Container();st.addChild(new P.Graphics().rect(0,0,30,30).fill(0xff0000));tr.resetState();tr.render(scene,camera);pr.resetState();pr.render({container:st});const cv=document.createElement('canvas');cv.width=160;cv.height=90;cv.getContext('2d').drawImage(tr.domElement,0,0);output.threeShared={overlay:[...cv.getContext('2d').getImageData(10,10,1,1).data],background:[...cv.getContext('2d').getImageData(80,45,1,1).data]};
 window.checkApp=app;return output;
});
await page.screenshot({path:path.join(root,'result.png')});
await fs.writeFile(path.join(root,'results.json'),JSON.stringify({results,messages},null,2));console.log(JSON.stringify({results,messages},null,2));
assert.ok(results.text.nonWhitePixelsInText>100,'HTMLText must visibly render');
assert.ok(results.seeking.repeatEqual && results.seeking.timesDiffer,'Timeline frames must repeat deterministically');
assert.ok(results.encoding.supported && results.encoding.chunks.length===3,'Three video frames must encode');
assert.ok(results.svgNative.error?.includes('freeze'),'Record native SMIL incompatibility');
assert.ok(results.svgAdapter.repeatEqual && results.svgAdapter.timesDiffer,'SVG adapter must seek deterministically');
assert.deepEqual(results.threeCanvas.green,[0,255,0,255]);
assert.deepEqual(results.threeCanvas.blue,[0,0,255,255]);
assert.deepEqual(results.threeShared.overlay,[255,0,0,255]);
assert.deepEqual(results.threeShared.background,[0,0,255,255]);
assert.ok(!messages.some(m=>m.startsWith('ERROR ')),'No unhandled browser errors');

}finally{await browser?.close();server.close();}
