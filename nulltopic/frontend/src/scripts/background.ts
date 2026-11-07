import {t} from '../lib/i18n';
import {
  backgroundStyle,
  canvasResolution,
  drawBackground,
  type BackgroundScene,
} from "../lib/background-scene";

export function initializeBackgroundAnimation(
  initialPaused = false,
): () => void {
  const canvasNode = document.querySelector<HTMLCanvasElement>(
    "#ambient-background",
  );
  const toggleNode =
    document.querySelector<HTMLInputElement>("#background-motion");
  if (!canvasNode || !toggleNode || canvasNode.dataset.initialized === "true")
    return () => {};
  const canvas = canvasNode;
  const toggle = toggleNode;
  const status = document.querySelector<HTMLElement>(
    "#background-motion-status",
  );
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext("2d", { alpha: true });
  } catch {}
  if (!ctx) {
    toggle.checked = false;
    if (status)
      status.textContent =
        t("Background animation is unavailable in this browser.");
    return () => {};
  }
  canvas.dataset.initialized = "true";
  const context = ctx;
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const forced = window.matchMedia("(forced-colors: active)");
  let paused = initialPaused,
    disposed = false,
    frame = 0,
    lastFrame = 0,
    elapsed = 0;
  let scene: BackgroundScene = {
    style: "warm",
    accent: "#a64d35",
    width: 1,
    height: 1,
  };
  const canAnimate = () =>
    !disposed &&
    !paused &&
    !reduced.matches &&
    !forced.matches &&
    !document.hidden;
  const render = () => drawBackground(context, scene, elapsed);
  function tick(time: number) {
    frame = 0;
    if (!canAnimate()) return;
    if (!lastFrame || time - lastFrame >= 1000 / 24) {
      if (lastFrame) elapsed += Math.min(100, time - lastFrame) / 1000;
      lastFrame = time;
      render();
    }
    frame = window.requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    const systemOff = reduced.matches || forced.matches;
    canvas.hidden = systemOff || paused;
    toggle.disabled = systemOff;
    toggle.checked = !systemOff && !paused;
    if (status)
      status.textContent = reduced.matches
        ? t("Disabled by your system's reduced-motion setting.")
        : forced.matches
          ? t("Disabled while your system uses forced colours.")
          : "";
    if (canAnimate()) frame = window.requestAnimationFrame(tick);
  }
  function readAppearance() {
    const next = backgroundStyle(root.dataset.style);
    if (next !== scene.style) elapsed = 0;
    scene.style = next;
    scene.accent =
      window.getComputedStyle(root).getPropertyValue("--accent").trim() ||
      "#a64d35";
    if (!reduced.matches && !forced.matches) render();
  }
  function resize() {
    scene.width = Math.max(1, window.innerWidth);
    scene.height = Math.max(1, window.innerHeight);
    const size = canvasResolution(
      scene.width,
      scene.height,
      window.devicePixelRatio,
    );
    canvas.width = size.width;
    canvas.height = size.height;
    context.setTransform(size.scale, 0, 0, size.scale, 0, 0);
    readAppearance();
  }
  const change = () => {
    readAppearance();
    sync();
  };
  const changeToggle = () => {
    paused = !toggle.checked;
    sync();
  };
  const visibility = () => sync();
  const observer = new MutationObserver(readAppearance);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-theme", "data-palette", "data-style"],
  });
  toggle.addEventListener("change", changeToggle);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", visibility);
  reduced.addEventListener("change", change);
  forced.addEventListener("change", change);
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    observer.disconnect();
    toggle.removeEventListener("change", changeToggle);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", visibility);
    reduced.removeEventListener("change", change);
    forced.removeEventListener("change", change);
    window.removeEventListener("pagehide", pageHide);
    window.removeEventListener("pageshow", restore);
    delete canvas!.dataset.initialized;
  }
  // A back/forward-cache restore reinitializes resources after pagehide cleanup.
  function restore(event: PageTransitionEvent) {
    if (event.persisted) {
      window.removeEventListener("pageshow", restore);
      initializeBackgroundAnimation(paused);
    }
  }
  const pageHide = (event: PageTransitionEvent) => {
    dispose();
    if (event.persisted)
      window.addEventListener("pageshow", restore, { once: true });
  };
  window.addEventListener("pagehide", pageHide, { once: true });
  resize();
  sync();
  return () => {
    window.removeEventListener("pageshow", restore);
    dispose();
  };
}
