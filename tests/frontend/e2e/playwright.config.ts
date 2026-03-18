import { defineConfig, devices } from '@playwright/test'

/**
 * 浏览器 E2E 配置（本目录为浏览器自动化测试根目录）
 * 运行前请先启动后端：cd server && python -m digital_labor.run
 * 前端由 webServer 自动启动。
 */
// 声明process变量
declare const process: {
  env: Record<string, string | undefined>
  cwd: () => string
}

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' as const } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    cwd: process.cwd(),
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
