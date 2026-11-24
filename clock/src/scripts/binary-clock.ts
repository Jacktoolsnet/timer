import {createFlipClock} from './flip-clock';

export function bcdDigits(parts:Intl.DateTimeFormatPart[]) {
 return ['hour','minute','second'].flatMap(type=>(parts.find(p=>p.type===type)?.value??'00').padStart(2,'0').slice(-2).split('').map(Number));
}
export function createBinaryClock(root:HTMLElement) {
 const face=root.querySelector<SVGElement>('#binary-face')!;
 const digital=root.querySelector<HTMLTimeElement>('#binary-digital')!;
 const updateFlip=createFlipClock(root.querySelector<HTMLElement>('#binary-flip')!);
 const weights=root.querySelector<SVGElement>('.binary-weights')!;
 const context=root.querySelector<HTMLElement>('#binary-context')!;
 let last='',lastTime=0;
 return (now:Date,parts:Intl.DateTimeFormatPart[],view:string,numbers:boolean,label:string)=>{
  if(!view.startsWith('binary')){last='';lastTime=0;return;}
  const text=parts.map(p=>p.value).join(''),seconds=parts.some(p=>p.type==='second');
  const key=[text,view,numbers].join('|');if(last===key){lastTime=now.getTime();return;}last=key;
  const digits=bcdDigits(parts);
  root.dataset.seconds=String(seconds);
  face.setAttribute('viewBox',seconds?'0 0 360 230':'0 0 250 230');
  face.setAttribute('aria-label',`${label}: ${text}`);
  weights.style.display=numbers?'':'none';
  root.querySelectorAll<SVGGElement>('[data-binary-column]').forEach(column=>{
   const value=digits[Number(column.dataset.binaryColumn)];
   column.querySelectorAll<SVGCircleElement>('[data-bit]').forEach(dot=>dot.dataset.on=String((value&Number(dot.dataset.bit))!==0));
  });
  digital.textContent=text;digital.dateTime=now.toISOString();
  context.textContent=parts.filter(p=>p.type==='dayPeriod'||p.type==='timeZoneName').map(p=>p.value).join(' · ');
  if(view==='binaryFlip')updateFlip(parts,lastTime>0&&now.getTime()-lastTime<1500);
  lastTime=now.getTime();
 };
}
