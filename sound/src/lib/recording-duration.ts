/** Bound native recorder lifetimes even if an internal caller supplies invalid values. */
export function recordingSeconds(seconds=600){
 return Number.isFinite(seconds)?Math.max(60,Math.min(600,Math.round(seconds))):600;
}
