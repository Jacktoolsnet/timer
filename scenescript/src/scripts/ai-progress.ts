/** Cosmetic progress only: never triggers provider requests or estimates completion. */
export function elapsedTime(milliseconds:number){
 const seconds=Math.floor(Math.max(0,milliseconds)/1000),s=String(seconds%60).padStart(2,'0'),m=String(Math.floor(seconds/60)%60).padStart(2,'0'),h=Math.floor(seconds/3600);
 return h?String(h).padStart(2,'0')+':'+m+':'+s:m+':'+s;
}
export function installAiProgress(matrix:HTMLElement,elapsed:HTMLElement){
 const alphabet='01{}[]<>/=+アイウエオカキクケコ';
 for(let column=0;column<18;column++){
  const stream=document.createElement('span');stream.textContent=Array.from({length:26},(_,row)=>alphabet[(column*7+row*11)%alphabet.length]).join('\n');
  stream.style.left=(column/18*100)+'%';stream.style.animationDuration=(8+column%6)+'s';stream.style.animationDelay=(-column*1.73)+'s';matrix.append(stream);
 }
 let running=false,started=0,timer:ReturnType<typeof setInterval>|undefined;
 const update=()=>{elapsed.textContent=elapsedTime(performance.now()-started);};
 return {
  setRunning(value:boolean){
   if(value===running)return;running=value;matrix.hidden=!value;
   if(timer!==undefined){clearInterval(timer);timer=undefined;}
   if(value){started=performance.now();update();timer=setInterval(update,250);}
  }
 };
}
