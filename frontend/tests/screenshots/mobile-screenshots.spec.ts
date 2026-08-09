import { test, expect, type Page } from '@playwright/test'
import { join } from 'path'

const outputDir = join(process.cwd(), 'mobile-screenshots')

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: join(outputDir, `${name}.png`),
    fullPage: true,
  })
}

test.describe('mobile viewport screenshots', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('capture key screens', async ({ page }) => {
    const uniqueEmail = `mobile-${Date.now()}@studentshub.test`

    // Home (logged out)
    await page.goto('/')
    await screenshot(page, '01-home-logged-out')

    // Register
    await page.goto('/register')
    await screenshot(page, '02-register')

    // Register first user
    await page.fill('input[name="name"]', 'Mobile Admin')
    await page.fill('input[name="email"]', uniqueEmail)
    await page.fill('input[name="password"]', 'admin123')
    await page.selectOption('select[name="institution"]', 'Delhi University')
    await page.selectOption('select[name="location"]', 'Delhi')
    await page.locator('main button[type="submit"]').click()
    await page.waitForURL('/')
    await screenshot(page, '03-home-logged-in')

    // Raise a case
    await page.goto('/raise')
    await screenshot(page, '04-raise-empty')

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
    await screenshot(page, '05-raise-filled')

    await page.locator('main button[type="submit"]').click()
    await page.waitForURL(/\/cases\/.+/)
    await expect(page.locator('h1')).toContainText('Scholarship payments delayed')
    await screenshot(page, '06-case-detail-unverified')

    // Confirm affected and resolved
    await page.locator('main button:has-text("I am affected")').click()
    await expect(page.locator('text=Status: Confirmed Problem')).toBeVisible({ timeout: 10000 })
    await screenshot(page, '07-case-detail-confirmed')

    await page.locator('main button:has-text("My issue is resolved")').click()
    await expect(page.locator('text=Status: Resolved')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Resolution confidence: 100%')).toBeVisible({ timeout: 10000 })
    await screenshot(page, '08-case-detail-resolved')

    // Discover
    await page.goto('/discover')
    await screenshot(page, '09-discover')

    // Admin
    await page.goto('/admin')
    await screenshot(page, '10-admin')
  })
})
