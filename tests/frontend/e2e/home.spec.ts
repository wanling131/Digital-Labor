import { test, expect } from '@playwright/test'

test.describe('首页', () => {
  test('首页可访问且展示功能入口', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=人员档案管理').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=电子合同管理').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /PC 管理端|管理端/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /进入移动端/ }).first()).toBeVisible()
  })
})
