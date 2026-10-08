// Shared appearance API, matching the other Jacktools tools.
export const STORAGE_KEY = 'jacktools.scenescript.project.v1';
export const colorSchemes = ['terracotta','blue','green','orange','red','violet','teal','rose'] as const;
export type ColorScheme = typeof colorSchemes[number];
