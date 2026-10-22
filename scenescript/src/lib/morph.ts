/** Screen-space mesh morph. Declarative landmarks, no optical flow or scene code. */
export type MorphPoint={from:{x:number;y:number};to:{x:number;y:number}};
export type Morph={points:MorphPoint[]};
type Point={x:number;y:number};
export type MorphMesh={from:Point[];to:Point[];triangles:number[][];strength:number};
export function parseMorph(value:unknown,path='morph'):Morph|null{
 if(value===undefined||value===null)return null;
 const fail=(message:string):never=>{throw new Error(`${path}: ${message}`);};
 if(typeof value!=='object'||Array.isArray(value))return fail('expected object');
 if(Object.keys(value).some(k=>k!=='points'))return fail('unknown field');
 const points=(value as Morph).points;
 if(!Array.isArray(points)||points.length>32)return fail('expected points array (0–32 landmarks)');
 const result=points.map((p,i)=>{if(!p||typeof p!=='object'||Object.keys(p).some(k=>k!=='from'&&k!=='to'))return fail(`points[${i}]: expected from/to`);const point=(key:'from'|'to')=>{const q=p?.[key];if(!q||typeof q!=='object'||Object.keys(q).some(k=>k!=='x'&&k!=='y')||![q.x,q.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100))return fail(`points[${i}].${key}: expected x/y percentages 0–100`);return {x:q.x,y:q.y};};return {from:point('from'),to:point('to')};});
 for(let i=0;i<result.length;i++)for(let j=0;j<i;j++)if(Math.hypot(result[i].from.x-result[j].from.x,result[i].from.y-result[j].from.y)<.1)return fail('source landmarks must be distinct');
 return {points:result};
}
export function morphMesh(config:Morph|null,columns=16,rows=24):MorphMesh{
 const defaults=[{from:{x:25,y:25},to:{x:27,y:27}},{from:{x:75,y:25},to:{x:73,y:27}},{from:{x:25,y:75},to:{x:27,y:73}},{from:{x:75,y:75},to:{x:73,y:73}}];
 const anchors=[...(config?.points??defaults)];
 // Pinned edges keep the full frame covered throughout the deformation.
 for(let i=0;i<=8;i++)for(const p of [{x:i*12.5,y:0},{x:i*12.5,y:100},{x:0,y:i*12.5},{x:100,y:i*12.5}])anchors.push({from:p,to:p});
 const from:Point[]=[],to:Point[]=[],triangles:number[][]=[];
 for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
  const p={x:100*x/columns,y:100*y/rows};from.push(p);
  if(x===0||x===columns||y===0||y===rows){to.push({...p});continue;}
  let dx=0,dy=0,total=0;
  for(const a of anchors){const d=Math.max(.000001,(p.x-a.from.x)**2+(p.y-a.from.y)**2),weight=1/(d*d);dx+=(a.to.x-a.from.x)*weight;dy+=(a.to.y-a.from.y)*weight;total+=weight;}
  to.push({x:p.x+dx/total,y:p.y+dy/total});
 }
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;triangles.push([a,b,d],[a,d,c]);}
 // Attenuate extreme/conflicting maps globally rather than allowing folded triangles.
 let strength=1;
 const area=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const scaled=(i:number,t:number)=>({x:from[i].x+(to[i].x-from[i].x)*t,y:from[i].y+(to[i].y-from[i].y)*t});
 const folds=([a,b,c]:number[])=>{
  const at=(t:number)=>area(scaled(a,t*strength),scaled(b,t*strength),scaled(c,t*strength)),start=at(0),end=at(1),half=at(.5);
  // Signed triangle area is quadratic in time. Check its exact interior minimum,
  // not just sampled frames, so even a brief fold between samples is excluded.
  const quadratic=2*(end-2*half+start),linear=end-start-quadratic,minimumAt=quadratic>0?-linear/(2*quadratic):0;
  return Math.min(start,end,minimumAt>0&&minimumAt<1?at(minimumAt):Infinity)<start*.08;
 };
 while(strength>1/128&&triangles.some(folds))strength/=2;
 return {from,to:to.map((_,i)=>scaled(i,strength)),triangles,strength};
}
export const morphProgress=(p:number)=>{const t=Math.max(0,Math.min(1,p));return t*t*(3-2*t);};
