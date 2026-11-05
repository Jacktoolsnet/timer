import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { initializeAppearanceSettings } from "../src/scripts/appearance";
import {
  normalizeAppearance,
  defaults,
  APPEARANCE_KEY,
  CONSENT_KEY,
  palettes,
  styles,
} from "../src/lib/appearance";

const html = readFileSync(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
const bootstrap = readFileSync(
  new URL("../src/scripts/appearance-init.js", import.meta.url),
  "utf8",
);
function fixture(
  options: {
    dark?: boolean;
    saved?: unknown;
    consent?: boolean;
    blocked?: boolean;
  } = {},
) {
  const dom = new JSDOM(html, {
    url: "http://localhost:4321",
    runScripts: "outside-only",
  });
  const w = dom.window;
  const media = new w.EventTarget() as InstanceType<typeof w.EventTarget> & {
    matches: boolean;
  };
  media.matches = options.dark || false;
  Object.defineProperty(w, "matchMedia", { value: () => media });
  if (options.saved !== undefined)
    w.localStorage.setItem(
      APPEARANCE_KEY,
      typeof options.saved === "string"
        ? options.saved
        : JSON.stringify(options.saved),
    );
  if (options.consent) w.localStorage.setItem(CONSENT_KEY, "yes");
  w.localStorage.setItem("jacktools.company.appearance.v1", "company-sentinel");
  if (options.blocked)
    Object.defineProperty(w, "localStorage", {
      get() {
        throw Error("Storage blocked");
      },
    });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: w,
    document: w.document,
    localStorage: options.blocked
      ? {
          getItem() {
            throw Error("blocked");
          },
          setItem() {
            throw Error("blocked");
          },
          removeItem() {
            throw Error("blocked");
          },
        }
      : w.localStorage,
    Node: w.Node,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  }
  w.eval(bootstrap);
  initializeAppearanceSettings();
  return {
    w,
    media,
    root: w.document.documentElement,
    click(selector: string) {
      const e = w.document.querySelector<HTMLElement>(selector);
      assert.ok(e, selector);
      e.click();
    },
    choose(selector: string) {
      const e = w.document.querySelector<HTMLInputElement>(selector)!;
      e.checked = true;
      e.dispatchEvent(new w.Event("change", { bubbles: true }));
    },
    close() {
      dom.window.close();
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test("Appearance preferences and actual page controls", async (t) => {
  await t.test(
    "validates unknown, malformed and out-of-range saved settings",
    () => {
      for (const value of [
        null,
        [],
        42,
        "dark",
        {},
        {
          themeMode: "invalid",
          colorScheme: "pink",
          style: "neon",
          fontSize: 99,
        },
        { fontSize: 1.5 },
        { fontSize: "2" },
      ])
        assert.deepEqual(normalizeAppearance(value), defaults);
      for (const colorScheme of palettes)
        for (const style of styles)
          assert.deepEqual(
            normalizeAppearance({
              themeMode: "dark",
              colorScheme,
              style,
              fontSize: 3,
            }),
            { themeMode: "dark", colorScheme, style, fontSize: 3 },
          );
    },
  );
  await t.test(
    "defaults follow OS, changing appearance writes nothing without consent",
    () => {
      const f = fixture({ dark: true });
      try {
        assert.equal(f.root.dataset.theme, "dark");
        assert.equal(f.root.dataset.themeMode, "auto");
        f.click("[data-theme-choice=light]");
        assert.equal(f.root.dataset.theme, "light");
        f.choose("[name=appearance-palette][value=blue]");
        assert.equal(f.root.dataset.palette, "blue");
        f.choose("[name=appearance-style][value=technical]");
        assert.equal(f.root.dataset.style, "technical");
        const font = f.w.document.querySelector<HTMLInputElement>(
          "#appearance-font-size",
        )!;
        font.value = "3";
        font.dispatchEvent(new f.w.Event("input"));
        assert.equal(f.root.dataset.fontSize, "3");
        assert.equal(font.getAttribute("aria-valuetext"), "130 %");
        assert.equal(f.w.localStorage.getItem(CONSENT_KEY), null);
        assert.equal(f.w.localStorage.getItem(APPEARANCE_KEY), null);
        f.media.matches = false;
        f.media.dispatchEvent(new f.w.Event("change"));
        assert.equal(f.root.dataset.theme, "light");
        f.click("[data-theme-choice=auto]");
        f.media.matches = true;
        f.media.dispatchEvent(new f.w.Event("change"));
        assert.equal(f.root.dataset.theme, "dark");
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "saving, reload and revocation affect only NullTopic keys",
    () => {
      const f = fixture();
      let saved: string;
      try {
        f.click("[data-theme-choice=dark]");
        f.choose("[name=appearance-palette][value=violet]");
        f.choose("#appearance-remember");
        assert.equal(f.w.localStorage.getItem(CONSENT_KEY), "yes");
        saved = f.w.localStorage.getItem(APPEARANCE_KEY)!;
        assert.equal(JSON.parse(saved).colorScheme, "violet");
        const remember = f.w.document.querySelector<HTMLInputElement>(
          "#appearance-remember",
        )!;
        remember.checked = false;
        remember.dispatchEvent(new f.w.Event("change"));
        assert.equal(f.w.localStorage.getItem(APPEARANCE_KEY), null);
        assert.equal(f.root.dataset.theme, "dark");
        assert.equal(
          f.w.localStorage.getItem("jacktools.company.appearance.v1"),
          "company-sentinel",
        );
      } finally {
        f.close();
      }
      const reloaded = fixture({ saved: saved!, consent: true });
      try {
        assert.equal(reloaded.root.dataset.palette, "violet");
        assert.equal(reloaded.root.dataset.theme, "dark");
        assert.equal(
          reloaded.w.document
            .querySelector("[data-theme-choice=dark]")
            ?.getAttribute("aria-pressed"),
          "true",
        );
      } finally {
        reloaded.close();
      }
    },
  );
  await t.test(
    "head bootstrap ignores unconsented/invalid data and survives blocked storage",
    () => {
      for (const options of [
        { saved: { themeMode: "dark", colorScheme: "blue" } },
        { saved: "broken JSON", consent: true },
        { saved: 42, consent: true },
        { saved: { fontSize: 999, colorScheme: "injected" }, consent: true },
        { blocked: true },
      ]) {
        const f = fixture(options);
        try {
          assert.equal(f.root.dataset.palette, "terracotta");
          assert.equal(f.root.dataset.fontSize, "0");
          f.click("[data-theme-choice=dark]");
          assert.equal(f.root.dataset.theme, "dark");
          if (options.blocked) {
            f.choose("#appearance-remember");
            assert.match(
              f.w.document.querySelector("#appearance-status")!.textContent!,
              /unavailable/,
            );
          }
        } finally {
          f.close();
        }
      }
    },
  );
  await t.test(
    "keyboard Escape and close restore focus; outside click closes the panel",
    () => {
      const f = fixture();
      try {
        const panel = f.w.document.querySelector<HTMLDetailsElement>(
          "#appearance-settings",
        )!;
        panel.open = true;
        panel.dispatchEvent(
          new f.w.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
          }),
        );
        assert.equal(panel.open, false);
        assert.equal(
          f.w.document.activeElement,
          panel.querySelector("summary"),
        );
        panel.open = true;
        f.click("#appearance-close");
        assert.equal(panel.open, false);
        panel.open = true;
        f.click("h1");
        assert.equal(panel.open, false);
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "cross-tab changes synchronize and revoked storage restores defaults",
    () => {
      const f = fixture();
      try {
        f.w.localStorage.setItem(CONSENT_KEY, "yes");
        f.w.localStorage.setItem(
          APPEARANCE_KEY,
          JSON.stringify({
            themeMode: "dark",
            colorScheme: "teal",
            style: "soft",
            fontSize: 2,
          }),
        );
        f.w.dispatchEvent(
          new f.w.StorageEvent("storage", { key: APPEARANCE_KEY }),
        );
        assert.equal(f.root.dataset.palette, "teal");
        assert.equal(f.root.dataset.fontSize, "2");
        f.w.localStorage.removeItem(CONSENT_KEY);
        f.w.dispatchEvent(
          new f.w.StorageEvent("storage", { key: CONSENT_KEY }),
        );
        assert.equal(f.root.dataset.palette, "terracotta");
        assert.equal(f.root.dataset.themeMode, "auto");
      } finally {
        f.close();
      }
    },
  );

  await t.test(
    "palette and style tokens exactly match Company across every combination",
    () => {
      const css = readFileSync(
        new URL("../src/styles/appearance.css", import.meta.url),
        "utf8",
      );
      const company = readFileSync(
        new URL("../../../company/src/styles/global.css", import.meta.url),
        "utf8",
      );
      const f = fixture();
      function tokens(source: string) {
        const result: Record<string, string> = {};
        for (const rule of source.matchAll(
          /:root((?:\[[^\]]+\])*)\s*\{([^}]+)\}/g,
        ))
          if (f.root.matches(":root" + rule[1]))
            for (const declaration of rule[2].matchAll(
              /(--[a-z-]+)\s*:\s*([^;]+);/gi,
            ))
              result[declaration[1]] = declaration[2].trim();
        return result;
      }
      try {
        for (const mode of ["light", "dark"])
          for (const palette of palettes)
            for (const style of styles) {
              f.click("[data-theme-choice=" + mode + "]");
              f.choose("[name=appearance-palette][value=" + palette + "]");
              f.choose("[name=appearance-style][value=" + style + "]");
              const actual = tokens(css),
                expected = tokens(company);
              for (const key of [
                "--bg",
                "--surface",
                "--text",
                "--muted",
                "--line",
                "--accent",
                "--accent-soft",
                "--track",
                "--green",
                "--shadow",
              ])
                assert.equal(
                  actual[key],
                  expected[key],
                  `${mode}/${palette}/${style}: ${key}`,
                );
            }
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "settings text and SVG icons match the English Company menu",
    async () => {
      const { getDictionary } = await import("../../../company/src/lib/i18n");
      const copy = getDictionary("en");
      const companyLayout = readFileSync(
        new URL("../../../company/src/layouts/Layout.astro", import.meta.url),
        "utf8",
      );
      const autoButton = readFileSync(
        new URL("../../../shared/AutoThemeButton.astro", import.meta.url),
        "utf8",
      );
      const f = fixture();
      try {
        const doc = f.w.document;
        assert.equal(
          doc
            .querySelector("#appearance-settings summary")!
            .getAttribute("aria-label"),
          copy.menuSettings,
        );
        assert.equal(
          doc.querySelector(".preferences-heading h2")!.textContent,
          copy.menuSettings,
        );
        assert.equal(
          doc.querySelector(".preferences-theme h3")!.textContent,
          copy.appearance,
        );
        assert.equal(
          doc.querySelector(".palette-grid legend")!.textContent,
          copy.colorScheme,
        );
        assert.equal(
          doc.querySelector(".style-picker legend")!.textContent,
          copy.styleLabel,
        );
        assert.equal(
          doc.querySelector("[data-theme-choice=auto]")!.textContent,
          "Auto",
        );
        assert.equal(
          doc.querySelector("[data-theme-choice=light]")!.textContent,
          copy.lightMode,
        );
        assert.equal(
          doc.querySelector("[data-theme-choice=dark]")!.textContent,
          copy.darkMode,
        );
        assert.equal(
          doc.querySelector(
            ".storage-choice:has(#appearance-remember) label > span:last-child",
          )!.textContent,
          copy.rememberPreferences,
        );
        for (const palette of palettes)
          assert.equal(
            doc
              .querySelector(`[name=appearance-palette][value=${palette}]`)!
              .getAttribute("aria-label"),
            copy[palette],
          );
        for (const style of styles) {
          const input = doc.querySelector(
            `[name=appearance-style][value=${style}]`,
          )!;
          assert.equal(input.getAttribute("aria-label"), copy[style]);
          assert.ok(input.nextElementSibling!.querySelector("svg"));
        }
        for (const path of doc.querySelectorAll(
          "#appearance-settings svg path",
        ))
          assert.ok(
            (companyLayout + autoButton).includes(
              'd="' + path.getAttribute("d") + '"',
            ),
            "SVG geometry matches Company",
          );
        assert.equal(
          doc.querySelector("#appearance-settings summary")!.children.length,
          1,
        );
        assert.equal(
          doc.querySelector(".storage-choice [role=switch]")!
            .nextElementSibling!.className,
          "storage-switch-track",
        );
        assert.equal(doc.querySelector("#appearance-status")!.textContent, "");
        assert.equal(doc.querySelector("#appearance-reset"), null);
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "appearance controls exist on every page; language picker is absent",
    () => {
      for (const page of [
        "index",
        "agents/index",
        "conversation/index",
        "operator/index",
        "administration/index",
        "guide/index",
        "rules/index",
      ]) {
        const pageHtml = readFileSync(
          new URL("../dist/" + page + ".html", import.meta.url),
          "utf8",
        );
        assert.match(pageHtml, /id="appearance-settings"/);
        assert.match(pageHtml, /nulltopic\.storage-consent\.v1/);
        assert.ok(!pageHtml.includes('name="language"'));
      }
    },
  );
});
