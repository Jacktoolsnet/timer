import type {Language} from './i18n';
export const CREDITS_SECONDS=3;
export const SONG_TAIL_SECONDS=2;
export const videoCreditsCopy={
 de:{mode:'Videolänge',fixed:'Feste Dauer',song:'Ganzer Song',songHint:'Ein Durchlauf ab Songanfang, ohne Zufalls-Play, plus 2 Sekunden Ausklang. Nur mit geladenem Song-Skript.',enabled:'Musik & Rechte · 3 Sekunden Abspann',text:'Abspanntext',hint:'Nur geprüfte Angaben eintragen. Gemeinfreiheit der Originalkomposition ist keine Lizenz für jede Bearbeitung oder Aufnahme.',title:'Musik & Rechte',fallback:'Mit jacktools Sound synthetisiert'},
 en:{mode:'Video length',fixed:'Fixed duration',song:'Whole song',songHint:'One pass from the beginning, without Random Play, plus 2 seconds of decay. Requires a loaded song script.',enabled:'Music & rights · 3-second credits',text:'Credits text',hint:'Enter verified information only. A public-domain composition does not license every arrangement or recording.',title:'Music & rights',fallback:'Synthesized with jacktools Sound'},
 es:{mode:'Duración del vídeo',fixed:'Duración fija',song:'Canción completa',songHint:'Una vuelta desde el principio, sin reproducción aleatoria, más 2 segundos de resonancia. Requiere un guion de canción.',enabled:'Música y derechos · Créditos de 3 segundos',text:'Texto de créditos',hint:'Introduce solo información verificada. Una composición de dominio público no licencia todos sus arreglos o grabaciones.',title:'Música y derechos',fallback:'Sintetizado con jacktools Sound'},
 fr:{mode:'Durée de la vidéo',fixed:'Durée fixe',song:'Morceau entier',songHint:'Un passage depuis le début, sans lecture aléatoire, plus 2 secondes de résonance. Nécessite un script de morceau.',enabled:'Musique et droits · Générique de 3 secondes',text:'Texte du générique',hint:'Indiquez uniquement des informations vérifiées. Une composition du domaine public ne rend pas libres tous ses arrangements ou enregistrements.',title:'Musique et droits',fallback:'Synthétisé avec jacktools Sound'}
};
export function songVideoSeconds(bars:number,bpm:number){return bars*4*60/bpm+SONG_TAIL_SECONDS;}
/** Plain text only, bounded and wrapped even when a line contains a long URL. */
export function paintVideoCredits(ctx:CanvasRenderingContext2D,text:string,language:Language,elapsed:number){
 const {width,height}=ctx.canvas,copy=videoCreditsCopy[language];
 ctx.save();ctx.fillStyle='#080e16';ctx.fillRect(0,0,width,height);
 ctx.globalAlpha=Math.min(1,Math.max(0,elapsed/.3));ctx.textAlign='center';ctx.textBaseline='middle';
 let size=Math.round(Math.min(width,height)*.038);
 const maxWidth=width*.84,lines:string[]=[];
 const wrap=()=>{
  lines.length=0;ctx.font=`500 ${size}px system-ui, sans-serif`;
  for(const paragraph of (text.trim()||copy.fallback).slice(0,600).split('\n')){
   let line='';for(const char of paragraph){if(ctx.measureText(line+char).width>maxWidth){lines.push(line);line='';}line+=char;}lines.push(line);
  }
 };
 wrap();while((lines.length+4)*size*1.5>height*.85&&size>10){size--;wrap();}
 const lineHeight=size*1.5,start=height/2-(lines.length-1)*lineHeight/2;
 ctx.fillStyle='#b6d7ed';ctx.font=`600 ${Math.round(size*1.2)}px system-ui, sans-serif`;ctx.fillText(copy.title,width/2,Math.max(size*2,start-lineHeight*2));
 ctx.fillStyle='#fff';ctx.font=`500 ${size}px system-ui, sans-serif`;
 lines.forEach((line,index)=>ctx.fillText(line,width/2,start+index*lineHeight));ctx.restore();
}
