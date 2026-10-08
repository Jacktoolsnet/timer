/** Visit all five horizontal regions in random order before repeating any region. */
export function wavePositionPicker(random=Math.random){
 let regions:number[]=[],previous=-1;
 return ()=>{
  if(!regions.length){
   regions=[0,1,2,3,4];
   for(let i=regions.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [regions[i],regions[j]]=[regions[j],regions[i]];
   }
   // Avoid adjacent waves sharing a region at the boundary between batches.
   if(regions[regions.length-1]===previous){
    [regions[0],regions[regions.length-1]]=[regions[regions.length-1],regions[0]];
   }
  }
  const region=regions.pop()!;
  previous=region;
  return 80+(region+random())*168;
 };
}
