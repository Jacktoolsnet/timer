/** Hide the idle pointer only in focus view; keyboard and dialogs stay usable. */
let cursorTimer:number|undefined;
let focused=document.body.classList.contains('focus-view');
function cursorActivity(){
 if(cursorTimer!==undefined){window.clearTimeout(cursorTimer);cursorTimer=undefined;}
 document.body.classList.remove('focus-cursor-hidden');
 if(!document.body.classList.contains('focus-view'))return;
 cursorTimer=window.setTimeout(()=>{
  cursorTimer=undefined;
  if(document.body.classList.contains('focus-view')&&!document.querySelector('dialog[open]')){
   document.body.classList.add('focus-cursor-hidden');
  }
 },3000);
}
document.addEventListener('pointermove',cursorActivity,{passive:true});
document.addEventListener('pointerdown',cursorActivity,{passive:true});
document.addEventListener('keydown',cursorActivity);
new MutationObserver(()=>{
 const next=document.body.classList.contains('focus-view');
 if(next!==focused){focused=next;cursorActivity();}
}).observe(document.body,{attributes:true,attributeFilter:['class']});
document.querySelectorAll('dialog').forEach(dialog=>{
 dialog.addEventListener('close',cursorActivity);
 new MutationObserver(cursorActivity).observe(dialog,{attributes:true,attributeFilter:['open']});
});
if(focused)cursorActivity();
export {};
