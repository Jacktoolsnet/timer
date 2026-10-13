import {defaultTextEffects} from './text-effects.ts';
import type {Element} from './model.ts';
export const textPresets=['neonPink','neonBlue','gold','comic'] as const;
export type TextPreset=typeof textPresets[number];
/** Fresh settings on every application; retain content, font, layout and timing. */
export function applyTextPreset(element:Element,preset:TextPreset):Element{
 const e=structuredClone(element);e.textEffects=defaultTextEffects();e.textGradient=null;
 if(preset==='neonPink'||preset==='neonBlue'){
  e.color=preset==='neonPink'?'#fff0fa':'#eaffff';
  e.textEffects.glow={enabled:true,color:preset==='neonPink'?'#ff33bb':'#00bbff',intensity:28};
 }else if(preset==='gold'){
  e.color='#ffd166';e.textGradient={type:'linear',angle:180,x:50,y:50,stops:[{color:'#fff4c2',position:0,opacity:1},{color:'#e6a128',position:35,opacity:1},{color:'#fff1aa',position:55,opacity:1},{color:'#b87916',position:100,opacity:1}]};
  e.textEffects.shadow={enabled:true,color:'#000000',blur:4,x:3,y:4,opacity:.7};
 }else{
  e.color='#ffe14a';e.bold=true;e.textEffects.outline={enabled:true,color:'#222222',width:5};
  e.textEffects.shadow={enabled:true,color:'#222222',blur:0,x:7,y:7,opacity:1};
 }
 // Presets apply to the entire text, even when a selection was active.
 e.runs=e.runs.map(run=>{const next={...run};delete next.color;if(preset==='comic')delete next.bold;return next;});
 return e;
}
