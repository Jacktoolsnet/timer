/** Authoring pixels, independent of export resolution. Existing presets stay 960×540. */
export function formatFrame2D(format:'landscape'|'portrait'|'square'){
 return format==='portrait'?{width:540,height:960}:format==='square'?{width:720,height:720}:{width:960,height:540};
}
export function stageFrame2D(stage:{preset:string;model?:{width:number;height:number}}){
 return stage.preset==='custom'&&stage.model?{width:stage.model.width,height:stage.model.height}:formatFrame2D('landscape');
}
export function matchingFrame2D(frame:{width:number;height:number},format:'landscape'|'portrait'|'square'){
 const expected=formatFrame2D(format);return Math.abs(frame.width/frame.height-expected.width/expected.height)<.001;
}
