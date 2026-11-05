import {
  APPEARANCE_KEY,
  CONSENT_KEY,
  applyAppearance,
  defaults,
  normalizeAppearance,
  type Appearance,
} from "../lib/appearance";
export function initializeAppearanceSettings() {
  const root = document.documentElement;
  const panel = document.querySelector<HTMLDetailsElement>(
    "#appearance-settings",
  );
  if (!panel) return;
  const trigger = panel.querySelector("summary")!;
  const remember = panel.querySelector<HTMLInputElement>(
    "#appearance-remember",
  )!;
  const status = panel.querySelector<HTMLElement>("#appearance-status")!;
  const font = panel.querySelector<HTMLInputElement>("#appearance-font-size")!;
  const output = panel.querySelector<HTMLOutputElement>(
    "#appearance-font-value",
  )!;
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  let state = normalizeAppearance({
    themeMode: root.dataset.themeMode,
    colorScheme: root.dataset.palette,
    style: root.dataset.style,
    fontSize: Number(root.dataset.fontSize),
  });
  let persistent = false;
  try {
    persistent = localStorage.getItem(CONSENT_KEY) === "yes";
  } catch {}
  function sync() {
    applyAppearance(root, state, system.matches);
    panel!
      .querySelectorAll<HTMLButtonElement>("[data-theme-choice]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.themeChoice === state.themeMode),
        ),
      );
    panel!
      .querySelectorAll<HTMLInputElement>("[name=appearance-palette]")
      .forEach((input) => {
        input.checked = input.value === state.colorScheme;
      });
    panel!
      .querySelectorAll<HTMLInputElement>("[name=appearance-style]")
      .forEach((input) => {
        input.checked = input.value === state.style;
      });
    font.value = String(state.fontSize);
    output.value = `${100 + 10 * state.fontSize} %`;
    font.setAttribute("aria-valuetext", output.value);
    remember.checked = persistent;
  }
  function persist() {
    if (!persistent) return;
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(state));
      status.textContent = "";
    } catch {
      status.textContent =
        "Browser storage is unavailable. Settings will work for this visit.";
    }
  }
  function change(patch: Partial<Appearance>) {
    state = normalizeAppearance({ ...state, ...patch });
    sync();
    persist();
  }
  panel
    .querySelectorAll<HTMLButtonElement>("[data-theme-choice]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        change({
          themeMode: button.dataset.themeChoice as Appearance["themeMode"],
        }),
      ),
    );
  panel
    .querySelectorAll<HTMLInputElement>("[name=appearance-palette]")
    .forEach((input) =>
      input.addEventListener("change", () => {
        if (input.checked)
          change({ colorScheme: input.value as Appearance["colorScheme"] });
      }),
    );
  panel
    .querySelectorAll<HTMLInputElement>("[name=appearance-style]")
    .forEach((input) =>
      input.addEventListener("change", () => {
        if (input.checked)
          change({ style: input.value as Appearance["style"] });
      }),
    );
  font.addEventListener("input", () =>
    change({ fontSize: Number(font.value) }),
  );
  remember.addEventListener("change", () => {
    const requested = remember.checked;
    try {
      if (requested) {
        localStorage.setItem(CONSENT_KEY, "yes");
        persistent = true;
        persist();
      } else {
        localStorage.removeItem(CONSENT_KEY);
        localStorage.removeItem(APPEARANCE_KEY);
        persistent = false;
        status.textContent = "";
      }
    } catch {
      persistent = false;
      status.textContent =
        "Browser storage is unavailable. Settings will work for this visit.";
    }
    sync();
  });
  function close() {
    panel!.open = false;
    trigger.focus();
  }
  panel.querySelector("#appearance-close")!.addEventListener("click", close);
  panel.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" ||
      (event.key === "Enter" &&
        (event.target as HTMLElement)?.tagName === "INPUT")
    ) {
      event.preventDefault();
      close();
    }
  });
  document.addEventListener("click", (event) => {
    if (!panel.contains(event.target as Node)) panel.open = false;
  });
  panel.addEventListener("focusout", (event) => {
    if (
      event.relatedTarget instanceof Node &&
      !panel.contains(event.relatedTarget)
    )
      panel.open = false;
  });
  system.addEventListener("change", () => {
    if (state.themeMode === "auto") sync();
  });
  window.addEventListener("storage", (event) => {
    if (
      event.key !== null &&
      event.key !== APPEARANCE_KEY &&
      event.key !== CONSENT_KEY
    )
      return;
    try {
      persistent = localStorage.getItem(CONSENT_KEY) === "yes";
      state = persistent
        ? normalizeAppearance(
            JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "null"),
          )
        : { ...defaults };
      status.textContent = persistent ? "" : "";
      sync();
    } catch {
      status.textContent =
        "Browser storage is unavailable. Settings will work for this visit.";
    }
  });
  sync();
  status.textContent = persistent ? "" : "";
}
