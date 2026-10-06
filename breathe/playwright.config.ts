import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4321', headless: true },
  webServer: { command: 'npm run dev -- --port 4321 --ignore-lock', url: 'http://127.0.0.1:4321', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1100 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
