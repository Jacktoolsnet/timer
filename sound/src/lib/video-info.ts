export type VideoInfoSettings={enabled:boolean;title:string;showTitle:boolean;style:boolean;tempo:boolean;section:boolean;signature:boolean};
export const defaultVideoInfo:VideoInfoSettings={enabled:false,title:'',showTitle:true,style:true,tempo:false,section:false,signature:true};
export type VideoInfoContent={style:string;tempo:string;section:string;signature:string};
export const videoInfoCopy={
 de:{label:'Infos im Video anzeigen',title:'Liedtitel',placeholder:'Dein Liedtitel',showTitle:'Titel einblenden',style:'Musikrichtung',tempo:'Tempo',section:'Songabschnitt',signature:'Tool-Signatur',credit:'Erstellt mit JackTools Sound'},
 en:{label:'Show video information',title:'Song title',placeholder:'Your song title',showTitle:'Show title',style:'Music style',tempo:'Tempo',section:'Song section',signature:'Tool signature',credit:'Created with JackTools Sound'},
 es:{label:'Mostrar información en el vídeo',title:'Título',placeholder:'Título de tu canción',showTitle:'Mostrar título',style:'Estilo musical',tempo:'Tempo',section:'Sección de la canción',signature:'Firma de la herramienta',credit:'Creado con JackTools Sound'},
 fr:{label:'Afficher les infos dans la vidéo',title:'Titre du morceau',placeholder:'Le titre de ton morceau',showTitle:'Afficher le titre',style:'Style musical',tempo:'Tempo',section:'Section du morceau',signature:'Signature de l’outil',credit:'Créé avec JackTools Sound'}
};
export function videoInfoSize(width:number,height:number,enabled=false){return Math.max(1,Math.min(width,height)- (enabled&&width>height?180:40));}
/** Canvas-only captions, with bounded single lines and contrast independent of the live theme. */
export function paintVideoInfo(ctx:CanvasRenderingContext2D,settings:VideoInfoSettings,content:VideoInfoContent){
 if(!settings.enabled)return;
 const {width,height}=ctx.canvas,portrait=height>width,maxWidth=width-80;
 ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';
 const line=(value:string,y:number,size:number,bold=false)=>{
  let text=value.replace(/[\r\n\t\u0000-\u001f]/g,' ').trim();if(!text)return;
  ctx.font=`${bold?650:450} ${size}px system-ui, sans-serif`;
  const units=Array.from(text);
  if(ctx.measureText(text).width>maxWidth){
   let low=0,high=units.length;
   while(low<high){const mid=Math.ceil((low+high)/2);if(ctx.measureText(units.slice(0,mid).join('')+'…').width<=maxWidth)low=mid;else high=mid-1;}
   text=units.slice(0,low).join('')+'…';
  }
  // Soft outline/shadow keeps text legible without covering the visual with boxes.
  ctx.fillStyle='#f3f8ff';ctx.strokeStyle='rgba(3,8,16,.72)';ctx.lineWidth=bold?4:3;ctx.lineJoin='round';
  ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=10;
  ctx.strokeText(text,width/2,y);ctx.fillText(text,width/2,y);ctx.shadowBlur=0;
 };
 if(settings.showTitle)line(settings.title,portrait?height*.13:34,portrait?34:26,true);
 const meta=[settings.style?content.style:'',settings.tempo?content.tempo:''].filter(Boolean).join(' · ');
 line(meta,portrait?height*.17:64,portrait?21:17);
 if(settings.section)line(content.section,portrait?height*.86:height-70,portrait?22:16);
 if(settings.signature){
  line(content.signature,portrait?height*.92:height-38,portrait?17:13);
  line('sound.jacktools.net',portrait?height*.945:height-18,portrait?15:12);
 }
 ctx.restore();
}
