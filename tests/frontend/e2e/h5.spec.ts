import { test, expect } from '@playwright/test'

test.describe('H5 工人端', () => {
  test('H5 首页可访问，展示入口或登录引导', async ({ page }) => {
    await page.goto('/h5')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/(h5|h5\/login)/)
    await expect(page.getByText(/考勤|我的合同|登录|工号|姓名/).first()).toBeVisible({ timeout: 8000 })
  })

  test('H5 登录页可访问', async ({ page }) => {
    await page.goto('/h5/login')
    await expect(page.locator('text=工号').or(page.locator('text=姓名')).first()).toBeVisible({ timeout: 10000 })
  })
})
