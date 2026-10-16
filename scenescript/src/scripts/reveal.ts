import type {Element} from '../lib/model';
import {revealClip} from '../lib/reveal';
/** Masks the complete local artwork after paper/liquid, before fragmenting it. */
export function updateReveal(node:HTMLElement,e:Element,time:number,width:number,height:number){
 node.style.clipPath=revealClip(e.reveal,time,e.at,width,height);
}
