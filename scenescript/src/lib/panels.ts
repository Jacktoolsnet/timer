import {newElement,type Element} from './model.ts';
import {panelRects,type PanelTemplate} from './crop.ts';
/** Templates are expanded into ordinary editable elements, never a new JSON container. */
export function createPanels(asset:string,template:PanelTemplate,id:()=>string=()=>crypto.randomUUID()):Element[]{
 return panelRects(template).flatMap((rect,i)=>{
  const frame=newElement('shape',id()),image=newElement('image',id());
  Object.assign(frame,rect,{name:`Panel ${i+1} frame`,animation:'none',fillColor:'#ffffff',borderColor:'#222222',borderWidth:4});
  Object.assign(image,{x:rect.x+.5,y:rect.y+.5,width:rect.width-1,height:rect.height-1,name:`Panel ${i+1} image`,asset,fit:'cover',animation:'none',crop:{x:0,y:0,width:100,height:100}});
  return [frame,image];
 });
}
