import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import {
  drawBackground,
  canvasResolution,
  backgroundStyle,
} from "../src/lib/background-scene";
import { initializeBackgroundAnimation } from "../src/scripts/background";

function contextMock() {
  const calls: {
    kind: string;
    color: unknown;
    args: unknown[];
    alpha: number;
  }[] = [];
  const ctx: any = {
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    font: "",
    lineWidth: 1,
  };
  for (const kind of [
    "clearRect",
    "fillText",
    "fillRect",
    "beginPath",
    "arc",
    "fill",
    "moveTo",
    "lineTo",
    "stroke",
    "setTransform",
  ])
    ctx[kind] = (...args: unknown[]) =>
      calls.push({ kind, color: ctx.fillStyle, args, alpha: ctx.globalAlpha });
  ctx.createRadialGradient = () => ({
    addColorStop: (...args: unknown[]) =>
      calls.push({
        kind: "colorStop",
        color: ctx.fillStyle,
        args,
        alpha: ctx.globalAlpha,
      }),
  });
  return { ctx: ctx as CanvasRenderingContext2D, calls };
}
const html = readFileSync(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
function fixture(
  options: { reduced?: boolean; forced?: boolean; unsupported?: boolean } = {},
) {
  const dom = new JSDOM(html, {
    url: "http://localhost:4321",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  const reduced = Object.assign(new w.EventTarget(), {
    matches: !!options.reduced,
  });
  const forced = Object.assign(new w.EventTarget(), {
    matches: !!options.forced,
  });
  Object.defineProperty(w, "matchMedia", {
    value: (query: string) =>
      query.includes("reduced-motion") ? reduced : forced,
  });
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  w.requestAnimationFrame = (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  };
  w.cancelAnimationFrame = (key: number) => {
    frames.delete(key);
  };
  const mock = contextMock();
  const canvas = w.document.querySelector<HTMLCanvasElement>(
    "#ambient-background",
  )!;
  Object.defineProperty(canvas, "getContext", {
    value: () => (options.unsupported ? null : mock.ctx),
  });
  Object.defineProperty(w, "getComputedStyle", {
    value: () => ({
      getPropertyValue: () =>
        w.document.documentElement.dataset.palette === "blue"
          ? "#1753bb"
          : "#a64d35",
    }),
  });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: w,
    document: w.document,
    MutationObserver: w.MutationObserver,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  }
  const cleanup = initializeBackgroundAnimation();
  return {
    w,
    canvas,
    toggle: w.document.querySelector<HTMLInputElement>("#background-motion")!,
    frames,
    reduced,
    forced,
    ...mock,
    step(time: number) {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(time);
    },
    close() {
      cleanup();
      dom.window.close();
      for (const [key, value] of originals) {
        if (value) Object.defineProperty(globalThis, key, value);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}
const settled = () => new Promise<void>((resolve) => setImmediate(resolve));

test("Palette-aware ambient backgrounds", async (t) => {
  await t.test(
    "each visual style draws its own bounded scene in the selected accent",
    () => {
      for (const style of ["warm", "minimal", "technical", "soft"] as const) {
        const { ctx, calls } = contextMock();
        drawBackground(
          ctx,
          { style, accent: "#1753bb", width: 1920, height: 1080 },
          12,
        );
        assert.equal(calls[0].kind, "clearRect");
        assert.equal(ctx.globalAlpha, 1);
        assert.ok(calls.length < 1200);
        if (style === "technical") {
          assert.ok(calls.some((c) => c.kind === "fillText"));
          assert.ok(
            calls
              .filter((c) => c.kind === "fillText")
              .every((c) => c.color === "#1753bb"),
          );
        }
        if (style === "warm") assert.ok(calls.some((c) => c.kind === "arc"));
        if (style === "minimal")
          assert.ok(calls.some((c) => c.kind === "lineTo"));
        if (style === "soft")
          assert.ok(
            calls.some(
              (c) => c.kind === "colorStop" && c.args[1] === "#1753bb",
            ),
          );
      }
      assert.equal(backgroundStyle("unknown"), "warm");
    },
  );
  await t.test(
    "nontechnical backgrounds have stronger marks and visibly changing geometry",
    () => {
      for (const style of ["warm", "minimal", "soft"] as const) {
        const first = contextMock(),
          later = contextMock();
        const scene = { style, accent: "#1753bb", width: 1280, height: 800 };
        drawBackground(first.ctx, scene, 0);
        drawBackground(later.ctx, scene, 1);
        const kind =
          style === "warm"
            ? "arc"
            : style === "minimal"
              ? "moveTo"
              : "fillRect";
        assert.notDeepEqual(
          first.calls.filter((c) => c.kind === kind).map((c) => c.args),
          later.calls.filter((c) => c.kind === kind).map((c) => c.args),
        );
        const marks = first.calls.filter(
          (c) =>
            c.kind ===
            (style === "warm"
              ? "fill"
              : style === "minimal"
                ? "stroke"
                : "fillRect"),
        );
        assert.ok(marks.length > 0);
        assert.ok(marks.every((c) => c.alpha >= 0.26));
        if (style === "warm")
          assert.ok(
            first.calls
              .filter((c) => c.kind === "arc")
              .every((c) => Number(c.args[2]) >= 2.5),
          );
        if (style === "minimal") assert.equal(first.ctx.lineWidth, 1.75);
      }
    },
  );
  await t.test(
    "backing pixels and device pixel ratio remain bounded, including oversized viewports",
    () => {
      for (const [width, height, dpr] of [
        [390, 844, 3],
        [3840, 2160, 4],
        [100000, 100000, 2],
        [0, 0, NaN],
      ]) {
        const result = canvasResolution(width, height, dpr);
        assert.ok(result.width * result.height <= 2200000);
        assert.ok(result.width >= 1 && result.height >= 1);
        assert.ok(Number.isFinite(result.scale));
        assert.ok(result.scale <= 1.5);
      }
    },
  );
  await t.test(
    "pause/resume schedules a single loop and drawing is capped below display refresh rate",
    () => {
      const f = fixture();
      try {
        assert.equal(f.canvas.hidden, false);
        assert.equal(f.toggle.hidden, false);
        assert.equal(f.frames.size, 1);
        initializeBackgroundAnimation();
        assert.equal(f.frames.size, 1);
        f.step(100);
        const count = f.calls.length;
        f.step(110);
        assert.equal(f.calls.length, count);
        f.step(160);
        assert.ok(f.calls.length > count);
        f.toggle.click();
        assert.equal(f.frames.size, 0);
        assert.equal(f.toggle.checked, false);
        assert.equal(f.canvas.hidden, true);
        assert.equal(
          f.w.document.querySelector("#background-motion-status")!.textContent,
          "",
        );
        f.toggle.click();
        assert.equal(f.frames.size, 1);
        assert.equal(f.toggle.checked, true);
        assert.equal(f.canvas.hidden, false);
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "system motion/forced-color preferences disable drawing and react to changes",
    () => {
      for (const options of [{ reduced: true }, { forced: true }]) {
        const f = fixture(options);
        try {
          assert.equal(f.frames.size, 0);
          assert.equal(f.canvas.hidden, true);
          assert.equal(f.toggle.disabled, true);
          assert.equal(f.calls.filter((c) => c.kind === "clearRect").length, 0);
          f.reduced.matches = false;
          f.forced.matches = false;
          f.reduced.dispatchEvent(new f.w.Event("change"));
          assert.equal(f.canvas.hidden, false);
          assert.equal(f.frames.size, 1);
          f.reduced.matches = true;
          f.reduced.dispatchEvent(new f.w.Event("change"));
          assert.equal(f.frames.size, 0);
          assert.equal(f.canvas.hidden, true);
        } finally {
          f.close();
        }
      }
    },
  );
  await t.test(
    "style and palette changes update the existing canvas without another loop",
    async () => {
      const f = fixture();
      try {
        f.w.document.documentElement.dataset.style = "technical";
        f.w.document.documentElement.dataset.palette = "blue";
        await settled();
        const glyphs = f.calls.filter((c) => c.kind === "fillText");
        assert.ok(glyphs.length > 0);
        assert.ok(glyphs.every((c) => c.color === "#1753bb"));
        assert.equal(f.frames.size, 1);
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "hidden tabs stop the loop; pagehide releases it and cached restore retains pause",
    () => {
      const f = fixture();
      try {
        Object.defineProperty(f.w.document, "hidden", {
          value: true,
          configurable: true,
        });
        f.w.document.dispatchEvent(new f.w.Event("visibilitychange"));
        assert.equal(f.frames.size, 0);
        Object.defineProperty(f.w.document, "hidden", {
          value: false,
          configurable: true,
        });
        f.w.document.dispatchEvent(new f.w.Event("visibilitychange"));
        assert.equal(f.frames.size, 1);
        f.toggle.click();
        f.w.dispatchEvent(
          new f.w.PageTransitionEvent("pagehide", { persisted: true }),
        );
        assert.equal(f.frames.size, 0);
        assert.equal(f.canvas.dataset.initialized, undefined);
        f.w.dispatchEvent(
          new f.w.PageTransitionEvent("pageshow", { persisted: true }),
        );
        assert.equal(f.canvas.dataset.initialized, "true");
        assert.equal(f.toggle.checked, false);
        assert.equal(f.canvas.hidden, true);
        assert.equal(f.frames.size, 0);
        f.w.dispatchEvent(new f.w.PageTransitionEvent("pagehide"));
        assert.equal(f.frames.size, 0);
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "unavailable canvas leaves the page functional with no dead control",
    () => {
      const f = fixture({ unsupported: true });
      try {
        assert.equal(f.frames.size, 0);
        assert.equal(f.toggle.disabled, true);
        assert.equal(f.toggle.checked, false);
        assert.match(
          f.w.document.querySelector("#background-motion-status")!.textContent!,
          /unavailable/,
        );
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "all pages expose the animation switch inside settings, never in the footer",
    () => {
      for (const path of [
        "index",
        "agents/index",
        "guide/index",
        "operator/index",
        "moderation/index",
        "conversation/index",
        "rules/index",
      ]) {
        const dom = new JSDOM(
          readFileSync(
            new URL("../dist/" + path + ".html", import.meta.url),
            "utf8",
          ),
        );
        try {
          assert.equal(
            dom.window.document
              .querySelector("#ambient-background")!
              .getAttribute("aria-hidden"),
            "true",
          );
          assert.equal(
            dom.window.document
              .querySelector("#background-motion")!
              .getAttribute("type"),
            "checkbox",
          );
        } finally {
          dom.window.close();
        }
      }
    },
  );
});
