import type {Language} from './i18n';
export type VideoInfoSettings={enabled:boolean;title:string;showTitle:boolean;style:boolean;tempo:boolean;section:boolean;signature:boolean;language?:Language};
export const defaultVideoInfo:VideoInfoSettings={enabled:false,title:'',showTitle:true,style:true,tempo:false,section:false,signature:true,language:'en'};
export type VideoInfoContent={style:string;tempo:string;section:string;signature:string};
export const videoInfoCopy={
 de:{language:'Sprache im Video',randomNotice:'Melodien entstehen mit Zufall',syntheticNotice:'Alle Töne sind synthetisch erzeugt',label:'Infos im Video anzeigen',title:'Liedtitel',placeholder:'Dein Liedtitel',showTitle:'Titel einblenden',style:'Musikrichtung',tempo:'Tempo',section:'Songabschnitt',signature:'Tool-Signatur',credit:'Erstellt mit JackTools Sound'},
 en:{language:'Video language',randomNotice:'Melodies created with randomness',syntheticNotice:'All sounds are synthesized',label:'Show video information',title:'Song title',placeholder:'Your song title',showTitle:'Show title',style:'Music style',tempo:'Tempo',section:'Song section',signature:'Tool signature',credit:'Created with JackTools Sound'},
 es:{language:'Idioma del vídeo',randomNotice:'Melodías creadas con azar',syntheticNotice:'Todos los sonidos son sintetizados',label:'Mostrar información en el vídeo',title:'Título',placeholder:'Título de tu canción',showTitle:'Mostrar título',style:'Estilo musical',tempo:'Tempo',section:'Sección de la canción',signature:'Firma de la herramienta',credit:'Creado con JackTools Sound'},
 fr:{language:'Langue de la vidéo',randomNotice:'Mélodies créées avec le hasard',syntheticNotice:'Tous les sons sont synthétisés',label:'Afficher les infos dans la vidéo',title:'Titre du morceau',placeholder:'Le titre de ton morceau',showTitle:'Afficher le titre',style:'Style musical',tempo:'Tempo',section:'Section du morceau',signature:'Signature de l’outil',credit:'Créé avec JackTools Sound'}
};
export function videoInfoSize(width:number,height:number,enabled=false){return Math.max(1,Math.min(width,height)- (enabled&&width>height?180:40));}
function topInfoLines(settings:VideoInfoSettings,content:VideoInfoContent,portrait:boolean){
 const copy=videoInfoCopy[settings.language??'en'];
 const rows:{text:string;size:number;leading:number;bold?:boolean;tint?:'accent'|'muted'}[]=[];
 if(settings.showTitle&&settings.title.trim())rows.push({text:settings.title,size:portrait?28:26,leading:36,bold:true,tint:'accent'});
 const meta=[settings.style?content.style:'',settings.tempo?content.tempo:''].filter(Boolean).join(' · ');
 if(meta)rows.push({text:meta,size:portrait?18:16,leading:24});
 rows.push({text:copy.randomNotice,size:14,leading:20,tint:'muted'},{text:copy.syntheticNotice,size:14,leading:20,tint:'muted'});
 if(settings.section&&content.section)rows.push({text:content.section,size:17,leading:24});
 if(settings.signature)rows.push({text:content.signature,size:14,leading:20,tint:'accent'},{text:'sound.jacktools.net',size:13,leading:18,tint:'muted'});
 return rows;
}
export function videoTopInfoHeight(settings:VideoInfoSettings,content:VideoInfoContent,portrait:boolean){
 return settings.enabled?24+topInfoLines(settings,content,portrait).reduce((sum,row)=>sum+row.leading,0):0;
}
/** Canvas-only captions, with bounded single lines and contrast independent of the live theme. */
export function paintVideoInfo(ctx:CanvasRenderingContext2D,settings:VideoInfoSettings,content:VideoInfoContent,placement:'split'|'top'='split'){
 if(!settings.enabled)return;
 const {width,height}=ctx.canvas,portrait=height>width,maxWidth=width-80;
 const theme=getComputedStyle(document.documentElement),body=getComputedStyle(document.body);
 const heading=document.querySelector('.intro h1'),titleFont=heading?getComputedStyle(heading).fontFamily:body.fontFamily;
 const accent=theme.getPropertyValue('--accent').trim()||'#b0d975',textColor=theme.getPropertyValue('--text').trim()||'#e2edf7',muted=theme.getPropertyValue('--muted').trim()||textColor;
 const dark=theme.colorScheme.includes('dark');
 const captions=videoInfoCopy[settings.language??'en'];
 ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';
 const line=(value:string,y:number,size:number,bold=false,color=textColor)=>{
  let text=value.replace(/[\r\n\t\u0000-\u001f]/g,' ').trim();if(!text)return;
  let fontSize=size;
  const setFont=()=>{ctx.font=`${bold?650:450} ${fontSize}px ${bold?titleFont:body.fontFamily}`;};
  setFont();
  // Keep normal session titles intact when the selected tool font is wider.
  if(bold)while(fontSize>(portrait?24:20)&&ctx.measureText(text).width>maxWidth){fontSize--;setFont();}
  const units=Array.from(text);
  if(ctx.measureText(text).width>maxWidth){
   let low=0,high=units.length;
   while(low<high){const mid=Math.ceil((low+high)/2);if(ctx.measureText(units.slice(0,mid).join('')+'…').width<=maxWidth)low=mid;else high=mid-1;}
   text=units.slice(0,low).join('')+'…';
  }
  // Soft outline/shadow keeps text legible without covering the visual with boxes.
  ctx.fillStyle=color;ctx.strokeStyle=dark?'rgba(3,8,16,.85)':'rgba(255,253,248,.9)';ctx.lineWidth=bold?4:3;ctx.lineJoin='round';
  ctx.shadowColor=dark?'rgba(0,0,0,.9)':'rgba(255,255,255,.9)';ctx.shadowBlur=10;
  ctx.strokeText(text,width/2,y);ctx.fillText(text,width/2,y);ctx.shadowBlur=0;
 };
 if(placement==='top'){
  let y=12;
  for(const row of topInfoLines(settings,content,portrait)){
   y+=row.leading;line(row.text,y-5,row.size,row.bold,row.tint==='accent'?accent:row.tint==='muted'?muted:textColor);
  }
  ctx.restore();return;
 }
 if(settings.showTitle)line(settings.title,portrait?height*.13:34,portrait?34:26,true,accent);
 const meta=[settings.style?content.style:'',settings.tempo?content.tempo:''].filter(Boolean).join(' · ');
 line(meta,portrait?height*.17:64,portrait?21:17);
 if(portrait){
  line(captions.randomNotice,height*.805,17,false,muted);
  line(captions.syntheticNotice,height*.827,17,false,muted);
 }else line(captions.randomNotice+' · '+captions.syntheticNotice,height-88,13,false,muted);
 if(settings.section)line(content.section,portrait?height*.86:height-70,portrait?22:16);
 if(settings.signature){
  line(content.signature,portrait?height*.92:height-38,portrait?17:13,false,accent);
  line('sound.jacktools.net',portrait?height*.945:height-18,portrait?15:12,false,muted);
 }
 ctx.restore();
}

/** An empty editable title means automatic naming; custom text is never overwritten. */
export function defaultVideoTitle(style:string){return `Random ${style} Sound Session`;}
