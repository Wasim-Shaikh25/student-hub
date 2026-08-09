import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'rm -rf data/e2e public/uploads/e2e && npm run dev',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      STUDENTSHUB_DATA_DIR: 'data/e2e',
      STUDENTSHUB_UPLOAD_DIR: 'public/uploads/e2e',
      STUDENTSHUB_UPLOAD_PUBLIC_PATH: '/uploads/e2e',
    },
  },
})
