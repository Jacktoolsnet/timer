export type ToastKind='success'|'warning'|'error';
let toast:HTMLDivElement|undefined,timer:ReturnType<typeof setTimeout>|undefined;
let removeCloseListener:(()=>void)|undefined;
export function dismissToast(){
 clearTimeout(timer);removeCloseListener?.();removeCloseListener=undefined;
 if(!toast)return;
 if(typeof toast.hidePopover==='function'&&toast.matches(':popover-open'))toast.hidePopover();
 toast.remove();toast=undefined;
}
export function showToast(message:string,kind:ToastKind='success',duration=4000){
 dismissToast();
 const node=document.createElement('div');toast=node;node.className='app-toast';node.dataset.kind=kind;
 node.setAttribute('popover','manual');node.setAttribute('role',kind==='error'?'alert':'status');node.setAttribute('aria-atomic','true');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',kind==='success'?'M22 11v1a10 10 0 1 1-6-9M22 4 12 14l-3-3':kind==='warning'?'m12 3 10 18H2ZM12 9v5m0 3h.01':'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 7v6m0 4h.01');svg.append(path);
 const text=document.createElement('span');text.textContent=message;node.append(svg,text);
 // Keep the live region inside the active modal's accessible subtree.
 const dialog=document.querySelector<HTMLDialogElement>('dialog[open]');(dialog||document.body).append(node);
 if(typeof node.showPopover==='function')node.showPopover();else node.classList.add('toast-fallback');
 if(dialog){const close=()=>dismissToast();dialog.addEventListener('close',close,{once:true});removeCloseListener=()=>dialog.removeEventListener('close',close);}
 timer=setTimeout(dismissToast,duration);
}
