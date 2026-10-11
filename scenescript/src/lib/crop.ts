export type Crop={x:number;y:number;width:number;height:number};
export function parseCrop(value:unknown,path='crop'):Crop|null{
 if(value===undefined||value===null)return null;
 if(typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected rectangle');
 const o=value as Record<string,unknown>;
 if(Object.keys(o).length!==4||Object.keys(o).some(k=>!['x','y','width','height'].includes(k)))throw new Error(path+': required x, y, width, height');
 for(const k of ['x','y','width','height'])if(typeof o[k]!=='number'||!Number.isFinite(o[k])||Number(o[k])<0||Number(o[k])>100)throw new Error(path+'.'+k+': expected 0–100 percent');
 const c=o as Crop;if(c.width<=0||c.height<=0||c.x+c.width>100+1e-9||c.y+c.height>100+1e-9)throw new Error(path+': empty or outside image');return {...c};
}
export const panelTemplates=['full','two','three','detail'] as const;
export type PanelTemplate=typeof panelTemplates[number];
export function panelRects(template:PanelTemplate){
 const inset=3,gap=2,width=94;
 if(template==='detail')return [{x:inset,y:inset,width,height:94},{x:60,y:60,width:35,height:35}];
 const count=template==='two'?2:template==='three'?3:1,height=(94-gap*(count-1))/count;
 return Array.from({length:count},(_,i)=>({x:inset,y:inset+i*(height+gap),width,height}));
}
