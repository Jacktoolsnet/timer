import {formats,type Project} from './model.ts';
export type ExportOptions={format:'mp4'|'webm';resolution:number;fps:number;audio:boolean};
export const MEMORY_EXPORT_LIMIT=128*1024*1024;
export function exportSize(p:Project,o:ExportOptions){const [w,h]=formats[p.format],scale=o.resolution/Math.min(w,h);return {width:Math.round(w*scale/2)*2,height:Math.round(h*scale/2)*2,bitrate:o.resolution<=480?2000000:o.resolution<=720?4000000:8000000};}
/** Planning estimate, not a guaranteed file size (encoders use variable bitrates). */
export function estimatedExportBytes(p:Project,o:ExportOptions){return Math.ceil(p.scenes.reduce((n,s)=>n+s.duration,0)*(exportSize(p,o).bitrate+(o.audio?128000:0))/8*1.2)+1024*1024;}
