import type {Project} from '../lib/model';
import {formats} from '../lib/model';
import {ExportMedia} from './export-media';
import {ExportRenderer} from './export-renderer';
/** Frozen endpoint snapshots are prepared once; playback only deforms their mesh. */
export class MorphPreview{
 readonly canvas=document.createElement('canvas');
 private abort=new AbortController();private renderer:ExportRenderer;private media:ExportMedia;
 private preparing=0;private released=false;
 private busy=false;private disposed=false;private requested=0;private serial=0;
 private width:number;private height:number;
 constructor(project:Project,private fail:(error:Error)=>void){
  const [w,h]=formats[project.format],scale=Math.min(1,640/Math.max(w,h));this.width=Math.round(w*scale);this.height=Math.round(h*scale);
  this.canvas.className='morph-transition-canvas';Object.assign(this.canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',display:'none'});
  this.media=new ExportMedia(project,this.abort.signal);this.renderer=new ExportRenderer(project,this.media);
 }
 async ready(index:number){this.preparing++;try{await this.renderer.prepareMorph(index,this.width,this.height);}finally{this.preparing--;if(this.disposed&&!this.busy&&!this.preparing)this.release();}}
 draw(time:number){this.requested=time;this.serial++;if(!this.busy&&!this.disposed)void this.paint();}
 private async paint(){
  this.busy=true;const serial=this.serial;
  try{const frame=await this.renderer.frame(this.requested,this.width,this.height);try{if(!this.disposed&&serial===this.serial){this.canvas.width=frame.width;this.canvas.height=frame.height;this.canvas.getContext('2d')!.drawImage(frame,0,0);this.canvas.style.display='block';this.canvas.dataset.morphTime=String(this.requested);}}finally{frame.width=0;frame.height=0;}}
  catch(error){if(!this.disposed){this.fail(error as Error);this.dispose();}}
  finally{this.busy=false;if(this.disposed){if(!this.preparing)this.release();}else if(serial!==this.serial)void this.paint();}
 }
 private release(){if(this.released)return;this.released=true;this.renderer.dispose();this.media.dispose();this.canvas.width=0;this.canvas.height=0;}
 dispose(){if(this.disposed)return;this.disposed=true;this.abort.abort();this.canvas.remove();if(!this.busy&&!this.preparing)this.release();}
}
