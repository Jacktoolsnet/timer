import type {FacePose3D} from './stage3d.ts';
/** 12×8 LED masks. Only lit-cell scales change at render time, never GPU resources. */
export const pixelFaces3D={
 neutral:['............','..##....##..','..##....##..','............','............','..#......#..','...######...','............'],
 happy:['............','..##....##..','.#..#..#..#.','............','............','..#......#..','...######...','............'],
 sad:['............','..##....##..','..##....##..','............','............','...######...','..#......#..','............'],
 angry:['.#........#.','..#......#..','..##....##..','............','............','...######...','............','............'],
 surprised:['............','..##....##..','..##....##..','............','.....##.....','....#..#....','....#..#....','.....##.....'],
 blink:['............','............','.####..####.','............','............','..#......#..','...######...','............']
} as const;
export function facePixel3D(p:FacePose3D,row:number,col:number):number{
 const lit=(key:keyof typeof pixelFaces3D)=>pixelFaces3D[key][row]?.[col]==='#'?1:0;
 const neutral=Math.max(0,1-p.happy-p.sad-p.angry-p.surprised);
 const value=neutral*lit('neutral')+p.happy*lit('happy')+p.sad*lit('sad')+p.angry*lit('angry')+p.surprised*lit('surprised');
 return row<4?value*(1-p.blink)+lit('blink')*p.blink:value;
}
