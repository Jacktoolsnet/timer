import type {Model3D} from '../lib/model3d';
import {parseTexture3D,textureFaces3D,textureAssetIDs3D,type Texture3D} from '../lib/texture3d';
import type {Asset} from '../lib/model';
/** A small material inspector alongside the full declarative model editor. */
export function installTextureEditor(host:HTMLElement,model:()=>Model3D|null,assets:Record<string,Asset>,words:Record<string,string>,change:(next:Model3D)=>void){
 const section=document.createElement('details'),summary=document.createElement('summary'),grid=document.createElement('div'),help=document.createElement('p'),error=document.createElement('p');section.open=Boolean(model()?.parts.some(p=>p.texture));section.className='model3d-editor';summary.textContent=words.textures;grid.className='stage3d-field-grid';help.className='small-hint';help.textContent=words.textureHint;error.className='model3d-error';error.setAttribute('role','status');section.append(summary,help,grid,error);host.append(section);let selected='';
 const images=Object.entries(assets).filter(([,a])=>/^data:image\/(png|jpeg|webp);base64,/.test(a.data));
 const field=(caption:string,control:HTMLElement)=>{const label=document.createElement('label'),span=document.createElement('span');span.textContent=caption;label.append(span,control);grid.append(label);return control;};
 function refresh(){
  grid.replaceChildren();const current=model(),parts=current?.parts.filter(p=>p.shape!=='group')??[];if(!parts.length){section.hidden=true;return;}section.hidden=false;
  if(!parts.some(p=>p.id===selected))selected=parts.find(p=>p.texture)?.id??parts[0].id;const part=parts.find(p=>p.id===selected)!;
  const choose=(id:string,caption:string,values:[string,string][],value:string,run:(v:string)=>void)=>{const select=document.createElement('select');select.dataset.textureField=id;for(const [id,name]of values){const o=document.createElement('option');o.value=id;o.textContent=name;select.append(o);}select.value=value;select.addEventListener('change',()=>run(select.value));field(caption,select);return select;};
  choose('part',words.texturePart,parts.map(p=>[p.id,p.id]),selected,id=>{selected=id;refresh();});
  const commit=(mutate:(t:Texture3D)=>void)=>{try{const texture:Texture3D=structuredClone(part.texture??{asset:'',repeat:{x:1,y:1},offset:{x:0,y:0},rotation:0,faces:{}});mutate(texture);const next={...current!,parts:current!.parts.map(p=>p===part?{...p}:p)},target=next.parts.find(p=>p.id===selected)!;if(textureAssetIDs3D(texture).length)target.texture=parseTexture3D(texture,part.shape,'texture');else delete target.texture;change(next);error.textContent='';refresh();}catch(e){error.textContent=(e as Error).message;}};
  choose('asset',words.textureImage,[['',words.textureNone],...images.map(([id,a])=>[id,a.name] as [string,string])],part.texture?.asset??'',id=>commit(t=>{t.asset=id;}));
  const number=(id:string,label:string,value:number,min:number,max:number,apply:(t:Texture3D,n:number)=>void)=>{const input=document.createElement('input');input.type='number';input.dataset.textureField=id;input.value=String(value);input.min=String(min);input.max=String(max);input.step='.01';input.addEventListener('change',()=>commit(t=>apply(t,input.valueAsNumber)));field(label,input);};
  for(const [key,base,min,max]of [['repeat',1,.01,100],['offset',0,-100,100]] as const)for(const axis of ['x','y'] as const)number(key+axis,words['texture'+(key==='repeat'?'Repeat':'Offset')]+' '+axis.toUpperCase(),part.texture?.[key][axis]??base,min,max,(t,n)=>{t[key][axis]=n;});
  number('rotation',words.textureRotation,part.texture?.rotation??0,-3600,3600,(t,n)=>{t.rotation=n;});
  if(part.shape==='box')for(const face of textureFaces3D)choose(face,words['texture_'+face],[['__inherit',words.textureInherit],['',words.textureNone],...images.map(([id,a])=>[id,a.name] as [string,string])],part.texture?.faces[face]??'__inherit',id=>commit(t=>{if(id==='__inherit')delete t.faces[face];else t.faces[face]=id;}));
 }
 refresh();return refresh;
}
