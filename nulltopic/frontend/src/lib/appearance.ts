export const palettes = [
  "terracotta",
  "blue",
  "green",
  "orange",
  "red",
  "violet",
  "teal",
  "rose",
] as const;
export const styles = ["warm", "minimal", "technical", "soft"] as const;
export const themeModes = ["auto", "light", "dark"] as const;
export const APPEARANCE_KEY = "nulltopic.appearance.v1";
export const CONSENT_KEY = "nulltopic.storage-consent.v1";
export interface Appearance {
  themeMode: (typeof themeModes)[number];
  colorScheme: (typeof palettes)[number];
  style: (typeof styles)[number];
  fontSize: number;
}
export const defaults: Appearance = {
  themeMode: "auto",
  colorScheme: "terracotta",
  style: "warm",
  fontSize: 0,
};
export function normalizeAppearance(value: unknown): Appearance {
  const input =
    value && typeof value === "object" ? (value as Partial<Appearance>) : {};
  return {
    themeMode: themeModes.includes(input.themeMode!)
      ? input.themeMode!
      : defaults.themeMode,
    colorScheme: palettes.includes(input.colorScheme!)
      ? input.colorScheme!
      : defaults.colorScheme,
    style: styles.includes(input.style!) ? input.style! : defaults.style,
    fontSize:
      Number.isInteger(input.fontSize) &&
      input.fontSize! >= 0 &&
      input.fontSize! <= 3
        ? input.fontSize!
        : defaults.fontSize,
  };
}
export function applyAppearance(
  root: HTMLElement,
  value: Appearance,
  systemDark: boolean,
) {
  root.dataset.themeMode = value.themeMode;
  root.dataset.theme =
    value.themeMode === "auto"
      ? systemDark
        ? "dark"
        : "light"
      : value.themeMode;
  root.dataset.palette = value.colorScheme;
  root.dataset.style = value.style;
  root.dataset.fontSize = String(value.fontSize);
}
