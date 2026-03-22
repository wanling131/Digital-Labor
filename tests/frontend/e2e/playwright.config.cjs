const path = require('path')
const { defineConfig, devices } = require('@playwright/test')

/**
 * 浏览器 E2E（CommonJS：Playwright 对 .ts 配置的转译不支持 import.meta）
 *
 * 端口：`web` 下 `npm run dev` 为 **3002**（与 `next start -p 3001` 区分）。
 * 后端：先 `cd server && python -m digital_labor.run`（默认 http://localhost:3000）
 */
const configDir = __dirname
const testsFrontendDir = path.join(configDir, '..')
const webDir = path.join(testsFrontendDir, '..', '..', 'web')

const WEB_DEV_PORT = 3002
const WEB_DEV_ORIGIN = `http://localhost:${WEB_DEV_PORT}`

module.exports = defineConfig({
  testDir: testsFrontendDir,
  testMatch: ['e2e/**/*.spec.ts', 'e2e.test.js'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: WEB_DEV_ORIGIN,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  ],
  webServer: {
    command: 'npm run dev',
    cwd: webDir,
    url: WEB_DEV_ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
