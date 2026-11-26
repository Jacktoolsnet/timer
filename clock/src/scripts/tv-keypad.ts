/** Native buttons work with touch, Tab/Enter, and a remote's directional keys. */
export function createTvKeypad(input:HTMLInputElement,grid:HTMLElement,send:HTMLButtonElement,isBusy:()=>boolean){
 const buttons=[...grid.querySelectorAll<HTMLButtonElement>('button')];
 function sync(){send.disabled=isBusy()||(input.required&&input.value.replace(/\D/g,'').length!==8);}
 function edit(key:string){
  const digits=input.value.replace(/\D/g,'').slice(0,8);
  input.value=key==='clear'?'':key==='backspace'?digits.slice(0,-1):(digits+key).slice(0,8);
  input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,8);sync();});
 input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();buttons[0].focus();}});
 buttons.forEach((button,index)=>{
  button.addEventListener('click',()=>edit(button.dataset.key!));
  button.addEventListener('keydown',event=>{
   const key=event.key;
   if(/^\d$/.test(key)){event.preventDefault();edit(key);return;}
   if(key==='Backspace'||key==='Delete'){event.preventDefault();edit(key==='Delete'?'clear':'backspace');return;}
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key))return;
   event.preventDefault();const row=Math.floor(index/3),column=index%3;
   if(key==='ArrowUp'&&row===0){input.focus();return;}
   if(key==='ArrowDown'&&row===3){if(!send.disabled)send.focus();return;}
   const next=key==='ArrowLeft'?index-(column>0?1:0):key==='ArrowRight'?index+(column<2?1:0):key==='ArrowUp'?index-3:index+3;
   buttons[next]?.focus();
  });
 });
 send.addEventListener('keydown',event=>{if(event.key==='ArrowUp'){event.preventDefault();buttons[10].focus();}});
 sync();return {sync};
}
