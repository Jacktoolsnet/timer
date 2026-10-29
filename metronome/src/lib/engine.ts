export const colorSchemes = ['terracotta', 'blue', 'green', 'orange', 'red', 'violet', 'teal', 'rose'] as const;
export type ColorScheme = typeof colorSchemes[number];
export const STORAGE_KEY = 'jacktools.metronome.settings.v1';
