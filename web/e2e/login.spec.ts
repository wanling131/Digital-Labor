import { test, expect } from '@playwright/test'

test.describe('PC 管理端登录', () => {
  test('登录页可访问且包含表单', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=PC 管理端登录').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByLabel(/用户名/)).toBeVisible()
    await expect(page.getByRole('button', { name: /登录/ })).toBeVisible()
  })

  test('错误密码显示错误信息', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByRole('textbox', { name: '密码' }).fill('wrong')
    await page.getByRole('button', { name: /登录/ }).click()
    await expect(page.getByText(/登录失败|错误|无效/)).toBeVisible({ timeout: 5000 })
  })

  test('正确账号密码登录后跳转工作台', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByRole('textbox', { name: '密码' }).fill('123456')
    await page.getByRole('button', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/pc\/dashboard/, { timeout: 15000 })
    await expect(page.locator('text=综合数据看板').first()).toBeVisible({ timeout: 5000 })
  })
})
