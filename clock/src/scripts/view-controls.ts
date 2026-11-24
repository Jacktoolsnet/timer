/** Compact type selector; legacy combined views remain the rendering/storage format. */
export function createViewControls(form:HTMLFormElement){
 const field=(name:string)=>form.elements.namedItem(name) as HTMLSelectElement;
 const base=(view:string)=>view==='combined'||view==='analogFlip'?'analog':view.startsWith('binary')?'binary':view;
 const selectedView=()=>{
  const type=field('view').value;
  const readout=['analog','binary','orbit','sundial'].includes(type)?field(type+'Readout').value:'off';
  if(type==='analog')return readout==='digital'?'combined':readout==='flip'?'analogFlip':'analog';
  if(type==='binary')return readout==='digital'?'binaryDigital':readout==='flip'?'binaryFlip':'binary';
  return type;
 };
 return {selectedView,sync(view:string){
  const type=base(view);field('view').value=type;
  if(type==='analog')field('analogReadout').value=view==='combined'?'digital':view==='analogFlip'?'flip':'off';
  if(type==='binary')field('binaryReadout').value=view==='binaryDigital'?'digital':view==='binaryFlip'?'flip':'off';
  for(const name of ['analog','binary','orbit','sundial'])document.getElementById(name+'-readout-options')!.hidden=name!==type;
  field('view').dispatchEvent(new Event('options-sync'));
 }};
}
