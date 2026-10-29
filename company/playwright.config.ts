import { defineConfig } from '@playwright/test';
const port=Number(process.env.COMPANY_TEST_PORT||4322);
export default defineConfig({
  testDir: './tests',
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true },
  webServer: { command: `npm run dev -- --port ${port} --ignore-lock`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
