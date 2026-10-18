/** Shared dial geometry for the live clock and the dropdown previews. */
export const analogDesigns = ['standard', 'roman', 'minimal', 'railway', 'square-standard', 'square-roman', 'square-minimal', 'square-railway'] as const;
export type AnalogDesign = typeof analogDesigns[number];
export const analogDesignText = {
 de: {label:'Analoges Uhrendesign', names:['Standard', 'Römisch', 'Minimalistisch', 'Bahnhofsuhr', 'Standard · Eckig', 'Römisch · Eckig', 'Minimalistisch · Eckig', 'Bahnhofsuhr · Eckig']},
 en: {label:'Analog clock design', names:['Standard', 'Roman', 'Minimal', 'Railway', 'Standard · Square', 'Roman · Square', 'Minimal · Square', 'Railway · Square']},
 es: {label:'Diseño del reloj analógico', names:['Estándar', 'Romano', 'Minimalista', 'Ferroviario', 'Estándar · Cuadrado', 'Romano · Cuadrado', 'Minimalista · Cuadrado', 'Ferroviario · Cuadrado']},
 fr: {label:'Style de l’horloge analogique', names:['Standard', 'Romain', 'Minimaliste', 'Gare', 'Standard · Carré', 'Romain · Carré', 'Minimaliste · Carré', 'Gare · Carré']},
};
function romanNumeral(value: number) {
 let result='';
 for(const [number,symbol] of [[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']] as const)
  while(value>=number){result+=symbol;value-=number;}
 return result;
}
/** Distance from the centre to a rounded-square edge along a clock-hand ray. */
function squareRadius(angle: number, half: number, corner: number) {
 const x=Math.abs(Math.sin(angle)), y=Math.abs(Math.cos(angle));
 let low=0, high=half*Math.SQRT2;
 for(let i=0;i<24;i++) {
  const r=(low+high)/2;
  const dx=Math.max(r*x-(half-corner),0), dy=Math.max(r*y-(half-corner),0);
  if(Math.hypot(dx,dy)>corner)high=r;else low=r;
 }
 return (low+high)/2;
}
export function dialMarkup(design: AnalogDesign, hourOffset = 0, minuteScale = false) {
 const square=design.startsWith('square-');
 const style=square?design.slice(7):design;
 const ticks = Array.from({length:60},(_,i) => {
  if(style==='minimal' && i%5!==0)return '';
  const radius=square?squareRadius(i*Math.PI/30,148,28):148;
  return `<line x1="160" y1="${160-radius+(i%5===0?10:5)}" x2="160" y2="${160-radius}" transform="rotate(${i*6} 160 160)" class="${i%5===0?'hour-mark':'minute-mark'}"/>`;
 }).join('');
 const numbers = Array.from({length:12},(_,i)=>{
  const n=i+1,a=n*Math.PI/6;
  if(style==='minimal' && n%3!==0)return '';
  const radius=square?squareRadius(a,116,20):116;
  const value=minuteScale?n*5:n+hourOffset;
  return `<text x="${160+radius*Math.sin(a)}" y="${160-radius*Math.cos(a)}">${style==='roman'?romanNumeral(value):value}</text>`;
 }).join('');
 const frame=square?'<rect x="11" y="11" width="298" height="298" rx="30" class="dial"/>':'<circle cx="160" cy="160" r="149" class="dial"/>';
 return `${frame}${ticks}<g class="dial-numerals" data-hour-offset="${hourOffset}" data-scale="${minuteScale?'minutes':'hours'}">${numbers}</g>`;
}
export const analogDesignStyles = `
.analog-face .dial-numerals text{fill:var(--text);stroke:none;font:16px system-ui;text-anchor:middle;dominant-baseline:middle}
.analog-face:is([data-design=roman],[data-design=square-roman]) .dial{stroke:#b39254;stroke-width:4}
.analog-face:is([data-design=roman],[data-design=square-roman]) .dial-numerals text{font-family:Georgia,serif;font-size:19px;fill:var(--text)}
.analog-face:is([data-design=roman],[data-design=square-roman]) .hour-mark{stroke:#b39254;stroke-width:2}
.analog-face:is([data-design=roman],[data-design=square-roman]) .minute-mark{opacity:.5}
.analog-face:is([data-design=minimal],[data-design=square-minimal]) .dial{stroke:var(--muted);stroke-width:1}
.analog-face:is([data-design=minimal],[data-design=square-minimal]) .hour-mark{stroke:var(--text);stroke-width:2}
.analog-face:is([data-design=minimal],[data-design=square-minimal]) .dial-numerals text{font-size:18px;font-weight:300}
.analog-face:is([data-design=railway],[data-design=square-railway]) .hour-mark{stroke:var(--text);stroke-width:6}
.analog-face:is([data-design=railway],[data-design=square-railway]) .minute-mark{stroke:var(--text);stroke-width:2}
.analog-face:is([data-design=railway],[data-design=square-railway]) .dial{stroke:var(--text);stroke-width:5}
.analog-face:is([data-design=railway],[data-design=square-railway]) .dial-numerals text{font-size:17px;font-weight:700}
`;
export function analogPreview(design: AnalogDesign) {
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" class="analog-face" data-design="${design}" style="--text:#253149;--accent:#467568;--muted:#7a8391;--surface:#fff;fill:none;stroke:var(--text);stroke-width:2"><style>.dial{fill:var(--surface);stroke:var(--accent)}.hour-mark{stroke:var(--accent);stroke-width:3}.minute-mark{stroke:var(--muted);stroke-width:1}${analogDesignStyles}</style>${dialMarkup(design)}<path d="M160 170V83" stroke-width="7" transform="rotate(305 160 160)"/><path d="M160 176V48" stroke-width="4" transform="rotate(60 160 160)"/><path d="M160 187V32" stroke="var(--accent)" transform="rotate(190 160 160)"/><circle cx="160" cy="160" r="5" fill="var(--accent)" stroke="none"/></svg>`;
 return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
