import { test, expect } from '@playwright/test'

test.describe('studentshub core flows', () => {
  test('register, raise a case, confirm resolution, and moderate from admin', async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@studentshub.test`

    // 1. Register first user (becomes SuperAdmin)
    await page.goto('/register')
    await page.fill('input[name="name"]', 'E2E Admin')
    await page.fill('input[name="email"]', uniqueEmail)
    await page.fill('input[name="password"]', 'admin123')
    await page.selectOption('select[name="institution"]', 'Delhi University')
    await page.selectOption('select[name="location"]', 'Delhi')
    await page.locator('main button[type="submit"]').click()
    await page.waitForURL('/')
    await expect(page.locator('a[href="/admin"]')).toBeVisible()
    await expect(page.locator('text=E2E Admin')).toBeVisible()

    // 2. Raise a formal case with mandatory evidence
    await page.goto('/raise')
    await page.fill('input[name="title"]', 'Scholarship payments delayed')
    await page.fill(
      'textarea[name="description"]',
      'Students have not received scholarship payments for 8 months despite multiple reminders.'
    )
    await page.selectOption('select[name="institution"]', 'Delhi University')
    await page.selectOption('select[name="category"]', 'Scholarship / Fee')
    await page.selectOption('select[name="location"]', 'Delhi')
    await page.fill('input[name="affectedCount"]', '50')
    await page.setInputFiles('input[name="evidence"]', 'tests/fixtures/notice.txt')
    await page.locator('main button[type="submit"]').click()
    await page.waitForURL(/\/cases\/.+/)
    await expect(page.locator('h1')).toContainText('Scholarship payments delayed')
    await expect(page.locator('main')).toContainText('Unverified')
    await expect(page.locator('main')).toContainText('0%')

    // 3. Confirm affected
    await page.locator('main button:has-text("I am affected")').click()
    await expect(page.locator('main')).toContainText('Confirmed Problem', { timeout: 10000 })

    // 4. Confirm resolved
    await page.locator('main button:has-text("My issue is resolved")').click()
    await expect(page.locator('main')).toContainText('Resolved', { timeout: 10000 })
    await expect(page.locator('main')).toContainText('100%')

    // 5. Verify admin control room and audit trail
    await page.goto('/admin')
    await expect(page.locator('h1')).toContainText('Super Admin Control Room')
    await expect(page.locator('text=USER_REGISTERED')).toBeVisible()
    await expect(page.locator('text=CASE_CREATED')).toBeVisible()
    await expect(page.locator('text=CONFIRMATION_ADDED').first()).toBeVisible()
  })
})
