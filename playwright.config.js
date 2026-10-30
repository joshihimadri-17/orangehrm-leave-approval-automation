const { defineConfig, devices } = require('@playwright/test');
const { env } = require('./config/env');

module.exports = defineConfig({
  testDir: './tests',
  // The public demo is slow and shared, so the timeouts are generous and the workflow runs on one worker.
  timeout: 5 * 60 * 1000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/html' }],
    ['allure-playwright', { resultsDir: 'reports/allure-results', environmentInfo: { 'Base URL': env.baseUrl, Browser: 'Chromium' } }],
  ],
  outputDir: 'reports/test-results',
  use: {
    baseURL: env.baseUrl,
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
