import { test, expect } from '@playwright/test'

test('logos return public, applicant and staff pages home without signing out', async ({
  page,
  request,
}) => {
  const home = page.getByRole('heading', {
    name: 'Greyhound Adoption Program',
    exact: true,
  })
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of [
      '/applicant/login',
      '/staff/login',
      '/register',
      '/forgot-password',
    ]) {
      await page.goto(route)
      const logo = page.getByRole('link', { name: 'GAP home', exact: true })
      await expect(logo).toHaveAttribute('href', '/')
      await logo.click()
      await expect(page).toHaveURL('/')
      await expect(home).toBeVisible()
    }
  }

  const email = `logo-${Date.now()}@example.test`
  const password = 'LogoNavigation123!'
  const registered = await request.post('/api/auth/register', {
    data: {
      fullName: 'Logo Applicant',
      email,
      password,
      termsAccepted: true,
      privacyConsent: true,
    },
  })
  expect(registered.status()).toBe(201)
  await page.goto('/applicant/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL('/applicant')
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/applicant')
    await page.locator('.portal-brand__logo').click()
    await expect(page).toHaveURL('/')
    await expect(home).toBeVisible()
    await page.goto('/applicant')
    await expect(page).toHaveURL('/applicant')
  }

  await page.evaluate(() => localStorage.clear())
  await page.goto('/staff/login')
  await page.getByLabel('Email', { exact: true }).fill('jamie@gap.example')
  await page.getByLabel('Password', { exact: true }).fill('Greyhound2026!')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL('/staff')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.locator('.sidebar .brand').click()
  await expect(page).toHaveURL('/')
  await expect(home).toBeVisible()
  await page.goto('/staff')
  await expect(page).toHaveURL('/staff')
  await page.setViewportSize({ width: 390, height: 900 })
  await page
    .locator('.mobile-header')
    .getByRole('link', { name: 'GAP home', exact: true })
    .click()
  await expect(page).toHaveURL('/')
  await expect(home).toBeVisible()
  await page.goto('/staff')
  await page
    .getByRole('button', { name: 'Open navigation', exact: true })
    .click()
  await page.locator('.sidebar .brand').click()
  await expect(page).toHaveURL('/')
  await expect(home).toBeVisible()
})
