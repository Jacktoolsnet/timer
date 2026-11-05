// Runs synchronously in <head> to avoid a light-theme flash before saved settings apply.
(() => {
  const root = document.documentElement;
  let saved = {};
  try {
    if (localStorage.getItem("nulltopic.storage-consent.v1") === "yes") {
      const parsed = JSON.parse(
        localStorage.getItem("nulltopic.appearance.v1") || "null",
      );
      if (parsed && typeof parsed === "object") saved = parsed;
    }
  } catch {
    /* Storage may be unavailable or contain malformed values. */
  }
  const mode = ["auto", "light", "dark"].includes(saved.themeMode)
    ? saved.themeMode
    : "auto";
  root.dataset.themeMode = mode;
  root.dataset.theme =
    mode === "dark" ||
    (mode === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
  root.dataset.palette = [
    "terracotta",
    "blue",
    "green",
    "orange",
    "red",
    "violet",
    "teal",
    "rose",
  ].includes(saved.colorScheme)
    ? saved.colorScheme
    : "terracotta";
  root.dataset.style = ["warm", "minimal", "technical", "soft"].includes(
    saved.style,
  )
    ? saved.style
    : "warm";
  root.dataset.fontSize =
    Number.isInteger(saved.fontSize) &&
    saved.fontSize >= 0 &&
    saved.fontSize <= 3
      ? String(saved.fontSize)
      : "0";
})();
