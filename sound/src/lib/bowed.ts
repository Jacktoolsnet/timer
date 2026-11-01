/** Reuse a moving bow for neighbouring notes, not a new attack for every step. */
export function continueBow(last:number,started:number,time:number,bpm:number,ratio=1){
 return ratio>=.7&&ratio<=1.5&&time>last+.001&&time-last<=Math.min(.8,60/bpm*1.25)&&time-started<.9;
}
