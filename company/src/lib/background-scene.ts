const styles = ["warm", "minimal", "technical", "soft"] as const;
export type BackgroundStyle = (typeof styles)[number];
export interface BackgroundScene {
  style: BackgroundStyle;
  accent: string;
  width: number;
  height: number;
}
export function backgroundStyle(value: string | undefined): BackgroundStyle {
  return styles.includes(value as BackgroundStyle)
    ? (value as BackgroundStyle)
    : "warm";
}
const fraction = (value: number) => value - Math.floor(value);
const seed = (index: number, salt = 1) =>
  fraction(Math.sin(index * 127.1 + salt * 311.7) * 43758.5453);

/** Stateless bounded drawing: no growing particle buffers or stored message data. */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  scene: BackgroundScene,
  seconds: number,
) {
  const { width, height, accent, style } = scene;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;
  if (style === "technical") {
    const glyphs = Array.from(
      "01アイウエオカキクケコサシスセソヌネノ+-:=<>[]{}",
    );
    const columns = Math.min(80, Math.max(8, Math.floor(width / 26)));
    ctx.font = '14px ui-monospace, "SFMono-Regular", Consolas, monospace';
    for (let column = 0; column < columns; column++) {
      const tail = 7 + Math.floor(seed(column, 4) * 6);
      const y =
        (seconds * (38 + seed(column, 2) * 52) +
          seed(column, 3) * (height + tail * 20)) %
        (height + tail * 20);
      for (let row = 0; row < tail; row++) {
        const glyphY = y - row * 20;
        if (glyphY < 0 || glyphY > height + 20) continue;
        ctx.globalAlpha = row === 0 ? 0.55 : 0.32 * (1 - row / tail);
        ctx.fillText(
          glyphs[
            (Math.floor(seconds * 2) + column * 13 + row * 7) % glyphs.length
          ],
          ((column + 0.5) * width) / columns,
          glyphY,
        );
      }
    }
  } else if (style === "warm") {
    const count = Math.min(
      60,
      Math.max(26, Math.floor((width * height) / 24000)),
    );
    for (let i = 0; i < count; i++) {
      const x = seed(i, 5) * width + Math.sin(seconds * 0.28 + i) * 28;
      const y =
        height -
        fraction(
          seed(i, 6) + (seconds * (12 + seed(i, 7) * 16)) / (height + 30),
        ) *
          (height + 30);
      ctx.globalAlpha = 0.26 + seed(i, 8) * 0.22;
      ctx.beginPath();
      ctx.arc(x, y, 2.5 + seed(i, 9) * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === "minimal") {
    const count = Math.min(28, Math.max(12, Math.floor(width / 70)));
    ctx.lineWidth = 1.75;
    ctx.lineCap = "round";
    for (let i = 0; i < count; i++) {
      const x =
        fraction(seed(i, 10) + (seconds * 18) / (width + 100)) * (width + 100) -
        50;
      const y = seed(i, 11) * height + Math.sin(seconds * 0.18 + i) * 18;
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 36 + seed(i, 12) * 72, y);
      ctx.stroke();
    }
  } else {
    const radius = Math.min(420, Math.max(160, Math.min(width, height) * 0.42));
    for (let i = 0; i < 4; i++) {
      const x = width * (0.5 + 0.45 * Math.sin(seconds * 0.1 + i * 1.7));
      const y = height * (0.5 + 0.4 * Math.cos(seconds * 0.12 + i * 2.1));
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, accent);
      gradient.addColorStop(0.28, accent);
      gradient.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }
  ctx.globalAlpha = 1;
}

export function canvasResolution(
  width: number,
  height: number,
  pixelRatio: number,
) {
  const safeWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
  const safeHeight = Number.isFinite(height) ? Math.max(1, height) : 1;
  const requested =
    Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const scale = Math.min(
    requested,
    1.5,
    Math.sqrt(2200000 / (safeWidth * safeHeight)),
  );
  return {
    width: Math.max(1, Math.floor(safeWidth * scale)),
    height: Math.max(1, Math.floor(safeHeight * scale)),
    scale,
  };
}
