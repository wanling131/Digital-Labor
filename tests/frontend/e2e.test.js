/**
 * 四项功能点端到端测试（Edge浏览器）
 * 使用 Playwright 进行自动化测试
 * 依赖：
 * - 后端（Python dtcloud）已运行在 http://localhost:3000
 * - 前端已运行在 http://localhost:3001
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'

test.use({
  baseURL: BASE_URL,
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
})

async function loginAsAdmin(page) {
  await page.goto('/pc/login')
  await page.fill('input[placeholder*="用户名"], input[name="username"]', 'admin')
  await page.fill('input[placeholder*="密码"], input[name="password"]', '123456')
  await page.click('button[type="submit"], button:has-text("登录")')
  await page.waitForURL(/\/pc\/dashboard/, { timeout: 5000 })
}

async function loginAsUser(page) {
  await page.goto('/pc/login')
  await page.fill('input[placeholder*="用户名"], input[name="username"]', 'user')
  await page.fill('input[placeholder*="密码"], input[name="password"]', '123456')
  await page.click('button[type="submit"], button:has-text("登录")')
  await page.waitForURL(/\/pc\/dashboard/, { timeout: 5000 })
}

// 这里只保留少量关键用例示例；如需完整迁移，可从原 server/test/e2e.test.js 拷贝所有用例。

test('PC 登录后能看到仪表盘', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page).toHaveURL(/\/pc\/dashboard/)
  await expect(page.locator('h1')).toContainText(/仪表盘|数据看板/)
})

