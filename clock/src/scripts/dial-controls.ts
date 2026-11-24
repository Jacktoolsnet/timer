import {analogPreview,type AnalogDesign} from '../lib/analog-designs';

/** Keep the existing combined setting as the persisted source of truth. */
export function createDialControls(form:HTMLFormElement) {
 const shape=form.elements.namedItem('dialShape') as HTMLSelectElement;
 const style=form.elements.namedItem('dialStyle') as HTMLSelectElement;
 const design=form.elements.namedItem('analogDesign') as HTMLSelectElement;
 const group=document.getElementById('clock-dial-options')!;
 const compose=(shape:string,style:string)=>(shape==='square'?'square-':'')+style;
 for(const input of [shape,style])input.addEventListener('change',()=>{
  // This runs before the form's change listener, so it saves and renders one update.
  design.value=compose(shape.value,style.value);
 });
 return (selected:string,view:string)=>{
  group.hidden=!['analog','combined','analogFlip','orbit','sundial'].includes(view);
  shape.value=selected.startsWith('square-')?'square':'round';
  style.value=selected.replace(/^square-/,'');
  for(const option of shape.options)option.dataset.preview=analogPreview(compose(option.value,style.value) as AnalogDesign);
  for(const option of style.options)option.dataset.preview=analogPreview(compose(shape.value,option.value) as AnalogDesign);
  shape.dispatchEvent(new Event('options-sync'));style.dispatchEvent(new Event('options-sync'));
 };
}
