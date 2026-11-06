import type {JSDOM} from 'jsdom';
// JSDOM has no top-layer/focus-trap implementation; this models only open/close.
export function installDialogMock(dom:JSDOM){
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new dom.window.Event('close'));};
}
