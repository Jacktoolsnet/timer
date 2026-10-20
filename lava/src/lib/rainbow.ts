/** Persistent per-blob colours; contact exchanges colour without resetting on separation. */
export const BLOB_COUNT = 14;
export function rainbowColour(hue: number): number[] {
 return [0, 2 / 3, 1 / 3].map(offset => {
  const phase = ((hue + offset) % 1 + 1) % 1;
  return .12 + .88 * Math.max(0, Math.min(1, Math.abs(phase * 6 - 3) - 1));
 });
}
export function createBlobColours(): Float32Array {
 return new Float32Array(Array.from({length: BLOB_COUNT}, (_, i) => rainbowColour(i / BLOB_COUNT)).flat());
}
export function blobShape(index: number, time: number, viscosity = .35) {
 const phase = time * (.11 + index * .006) + index * 2.399;
 const radius = .055 + .035 * (.5 + .5 * Math.sin(index * 7));
 const shapeCycle = .5 + .5 * Math.sin(time * (.075 / (1 + viscosity)) + index * 1.73);
 const stretch = .85 + (1.2 + 1.3 * viscosity) * Math.pow(shapeCycle, 1.4) * (.6 + .4 * Math.abs(Math.cos(phase)));
 return {x: .5 + Math.sin(phase * .45 + index * 2.399) * .46, y: .5 + .55 * Math.sin(phase),
  rx: radius / Math.sqrt(stretch), ry: radius * Math.sqrt(stretch)};
}
export function advanceBlobColours(colours: Float32Array, time: number, dt: number, aspect: number, viscosity = .35, offsets?: Float32Array, evolve = true) {
 if (dt <= 0) return;
 const sizeScale = Math.min(aspect, 1);
 const shapes = Array.from({length: BLOB_COUNT}, (_, i) => {const shape=blobShape(i,time,viscosity);return {...shape,x:shape.x+(offsets?.[i*2]||0),y:shape.y+(offsets?.[i*2+1]||0)};});
 // Simultaneous symmetric exchange avoids order-dependent mixing and retains colour.
 const changes = new Float32Array(colours.length);
 for (let i = 0; i < BLOB_COUNT; i++) for (let j = i + 1; j < BLOB_COUNT; j++) {
  const a = shapes[i], b = shapes[j];
  const distance = Math.hypot((a.x - b.x) * aspect / ((a.rx + b.rx) * sizeScale), (a.y - b.y) / ((a.ry + b.ry) * sizeScale));
  const contact = Math.max(0, Math.min(1, (1.4 - distance) / .5));
  const exchange = (1 - Math.exp(-dt * .8)) * contact / 3;
  for (let c = 0; c < 3; c++) {
   const delta = (colours[j * 3 + c] - colours[i * 3 + c]) * exchange;
   changes[i * 3 + c] += delta;
   changes[j * 3 + c] -= delta;
  }
 }
 const drift = evolve ? 1 - Math.exp(-dt / 100) : 0;
 for (let i = 0; i < BLOB_COUNT; i++) {
  const target = rainbowColour(i / BLOB_COUNT + time / 240);
  for (let c = 0; c < 3; c++) {
   const k = i * 3 + c;
   colours[k] = Math.max(0, Math.min(1, colours[k] + changes[k] + (target[c] - colours[k]) * drift));
  }
 }
}
