export const colorSchemes = ['terracotta', 'blue', 'green', 'orange', 'red', 'violet', 'teal', 'rose'] as const;
export type ColorScheme = typeof colorSchemes[number];
