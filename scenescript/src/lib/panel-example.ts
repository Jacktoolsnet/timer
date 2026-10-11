import {demoProject,newScene,type Project} from './model.ts';
import {createPanels} from './panels.ts';
import {svgDataURL} from './svg.ts';
export function panelProject():Project{
 const p=demoProject();p.title='The missing briefcase';p.description='An original fictional office comic: one illustration, several editable crops.';p.hashtags='#Comic, #SceneScript';
 const person=(x:number,color:string)=>`<g transform="translate(${x} 100)"><path d="M30 260h170l-10 200H40Z" fill="${color}"/><path d="M45 460h50v180H40ZM145 460h50l10 180h-60Z" fill="#334257"/><circle cx="115" cy="140" r="85" fill="#ffd2ab" stroke="#334257" stroke-width="6"/><path d="M35 105Q80 5 190 105L175 58 85 45Z" fill="#52433e"/><circle cx="85" cy="130" r="7" fill="#334257"/><circle cx="145" cy="130" r="7" fill="#334257"/><path d="M85 165Q115 195 148 165" fill="none" stroke="#334257" stroke-width="6"/></g>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#e7eef3"/><rect y="680" width="1200" height="120" fill="#b4c7ca"/><rect x="480" y="60" width="240" height="200" rx="12" fill="#b8dcd8"/>${person(110,'#608caf')}${person(830,'#d99056')}<g><rect x="490" y="520" width="220" height="145" rx="16" fill="#384657" stroke="#202b36" stroke-width="8"/><path d="M550 520v-35h100v35" fill="none" stroke="#202b36" stroke-width="12"/><rect x="584" y="552" width="32" height="30" fill="#f3c26a"><animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></rect></g></svg>`;
 p.assets={office:{name:'Fictional office.svg',data:svgDataURL(svg)}};let next=0;const ids=()=>`panel-${++next}`;
 const full=newScene('full');full.name='Full view';full.transition='none';full.elements=createPanels('office','full',ids);
 const close=newScene('close');close.name='Manager close-up';close.transition='fade';close.elements=createPanels('office','full',ids);close.elements[1].crop={x:5,y:5,width:33,height:90};close.elements[1].fit='contain';
 const panels=newScene('panels');panels.name='Two panels';panels.transition='none';panels.elements=createPanels('office','two',ids);panels.elements[1].crop={x:0,y:12,width:50,height:35};panels.elements[3].crop={x:50,y:12,width:50,height:35};
 p.scenes=[full,close,panels];return p;
}
