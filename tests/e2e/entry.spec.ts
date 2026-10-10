import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function assertPageFits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true)
}

async function scrollToLink(page: Page, name: string) {
  const link = page.getByRole('link', { name, exact: true })
  await link.scrollIntoViewIfNeeded()
  await expect(link).toBeInViewport()
}

test('home choices and authentication remain reachable at desktop and mobile sizes', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 600 },
    { width: 1024, height: 600 },
    { width: 901, height: 500 },
    { width: 390, height: 844 },
    { width: 320, height: 640 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(
      page.getByRole('heading', {
        name: 'Greyhound Adoption Program',
        exact: true,
      }),
    ).toBeVisible()
    await assertPageFits(page)
    await scrollToLink(page, 'Applicant')
    await scrollToLink(page, 'Staff')
    if ([1920, 1280, 390].includes(viewport.width))
      await page.screenshot({
        path: `test-results/home-${viewport.width}.png`,
        fullPage: true,
      })
    await page
      .getByRole('link', { name: 'Applicant', exact: true })
      .click()
    await expect(page).toHaveURL(/\/applicant\/login$/)
    await expect(
      page.getByRole('heading', { name: 'Applicant Login' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Sign in with Microsoft' }),
    ).toHaveCount(0)
    await assertPageFits(page)
    await scrollToLink(page, 'Apply to become a foster carer')
    await scrollToLink(page, 'Back to home')
    await page.getByRole('link', { name: 'Back to home' }).click()
    await page.getByRole('link', { name: 'Staff', exact: true }).click()
    await expect(page).toHaveURL(/\/staff\/login$/)
    await expect(
      page.getByRole('heading', { name: 'Staff Login' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Sign in with Microsoft' }),
    ).toHaveCount(0)
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
    await expect(
      page.getByLabel('Password', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Create an account' }),
    ).toHaveCount(0)
    await assertPageFits(page)
    await scrollToLink(page, 'Back to home')
    await page.goto('/register')
    await assertPageFits(page)
    await scrollToLink(page, 'Login here')
    const bottom = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
      return {
        scrollable:
          document.documentElement.scrollHeight > window.innerHeight,
        overflow: getComputedStyle(
          document.querySelector('.public-page--auth')!,
        ).overflowY,
      }
    })
    expect(bottom.overflow).toBe('visible')
    if (viewport.height <= 600) expect(bottom.scrollable).toBe(true)
  }
  await page.setViewportSize({ width: 1280, height: 600 })
  for (const route of [
    '/',
    '/applicant/login',
    '/staff/login',
    '/register',
  ]) {
    await page.goto(route)
    await expect(page.locator('.brand__logo')).toBeVisible()
    expect(
      await page
        .locator('.brand__logo')
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    ).toBe(true)
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(accessibility.violations).toEqual([])
  }
  await page.goto('/apply')
  await expect(
    page.getByRole('heading', { name: 'Foster Application', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Next', exact: true })
    .scrollIntoViewIfNeeded()
  await expect(
    page.getByRole('button', { name: 'Next', exact: true }),
  ).toBeInViewport()
  expect(errors).toEqual([])
})

test('selected portals enforce account roles and staff screens scroll on laptops', async ({
  page,
  request,
  browser,
}) => {
  const email = `entry-${Date.now()}@example.com`
  const password = 'FosterPassword123!'
  const registration = await request.post('/api/auth/register', {
    data: {
      fullName: 'Entry Applicant',
      email,
      password,
      termsAccepted: true,
      privacyConsent: true,
    },
  })
  expect(registration.status()).toBe(201)
  const registered = await registration.json()
  expect(registered.verificationUrl).toBeUndefined()
  await page.goto('/')
  await page.getByRole('link', { name: 'Staff', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(
    page.getByText('Use the applicant sign-in page for this account.'),
  ).toBeVisible()
  expect(
    await page.evaluate(() => localStorage.getItem('gap.api.session.v1')),
  ).toBeNull()
  await page.getByRole('link', { name: 'Back to home' }).click()
  await page.getByRole('link', { name: 'Applicant', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/applicant$/)
  await page.goto('/applications/new')
  await expect(
    page.getByRole('heading', { name: 'Foster Application', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Next', exact: true })
    .scrollIntoViewIfNeeded()
  await expect(
    page.getByRole('button', { name: 'Next', exact: true }),
  ).toBeInViewport()

  const staffLogin = await request.post('/api/auth/login', {
    data: {
      email: 'jamie@gap.example',
      password: 'Greyhound2026!',
      audience: 'staff',
    },
  })
  expect(staffLogin.status()).toBe(200)
  await page.goto('/staff/login')
  await page.getByLabel('Email', { exact: true }).fill('jamie@gap.example')
  await page.getByLabel('Password', { exact: true }).fill('Greyhound2026!')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/staff$/)
  await expect(page.locator('.dashboard-heading h1')).toBeVisible()
  expect(
    await page.evaluate(() =>
      localStorage.getItem('gap.applicant.session'),
    ),
  ).toBeNull()
  await page.goto('/')
  await page.getByRole('link', { name: 'Applicant', exact: true }).click()
  await expect(page).toHaveURL(/\/applicant\/login$/)

  const context = await browser.newContext({
    baseURL: 'http://localhost:5174',
  })
  try {
    const staff = await context.newPage()
    await staff.goto('/')
    await staff.getByRole('link', { name: 'Staff', exact: true }).click()
    await staff
      .getByLabel('Email', { exact: true })
      .fill('jamie@gap.example')
    await staff
      .getByLabel('Password', { exact: true })
      .fill('Greyhound2026!')
    await staff.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(staff).toHaveURL(/\/staff$/)
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1024, height: 600 },
      { width: 1024, height: 400 },
      { width: 390, height: 844 },
    ]) {
      await staff.setViewportSize(viewport)
      for (const route of [
        '/staff',
        '/staff/applications',
        '/staff/greyhounds',
        '/staff/reports',
        '/staff/administration',
      ]) {
        await staff.goto(route)
        await expect(staff.locator('main h1').first()).toBeVisible()
        await assertPageFits(staff)
      }
      await staff.goto('/staff/reports')
      const table = staff.getByRole('region', {
        name: 'Application status records',
      })
      await expect(table).toBeVisible()
      const reachable = await table.evaluate((element) => {
        element.scrollLeft = element.scrollWidth
        return (
          element.scrollWidth <= element.clientWidth ||
          element.scrollLeft > 0
        )
      })
      expect(reachable).toBe(true)
      if (viewport.width > 900) {
        await staff.locator('.sidebar').evaluate((element) => {
          element.scrollTop = element.scrollHeight
        })
        await expect(staff.locator('.profile-trigger')).toBeInViewport()
      }
    }
    await staff.setViewportSize({ width: 1024, height: 600 })
    await staff.goto('/staff/reports')
    await staff.screenshot({
      path: 'test-results/staff-laptop-scroll.png',
      fullPage: true,
    })
  } finally {
    await context.close()
  }
})
