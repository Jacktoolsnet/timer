import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4322', headless: true },
  webServer: {
    command: 'npm run dev -- --port 4322 --ignore-lock',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } },
  ],
});
