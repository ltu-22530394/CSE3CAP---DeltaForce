import { test, expect } from '@playwright/test'

test('registration, private staff creation and administrator password reset work without providers', async ({
  page,
  browser,
}) => {
  const stamp = Date.now()
  const applicantEmail = `password-applicant-${stamp}@example.test`
  const staffEmail = `password-staff-${stamp}@example.test`
  await page.goto('/register')
  await page.getByLabel('Full Name', { exact: true }).fill('Password Applicant')
  await page.getByLabel('Email', { exact: true }).fill(applicantEmail)
  await page
    .getByLabel('Password', { exact: true })
    .fill('ApplicantPassword123!')
  await page
    .getByLabel('Confirm Password', { exact: true })
    .fill('ApplicantPassword123!')
  await page.getByRole('checkbox').nth(0).check()
  await page.getByRole('checkbox').nth(1).check()
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page).toHaveURL(/\/applicant\/login$/)
  await expect(
    page.getByText(
      'Registration successful. You can now log in with your email and password.',
    ),
  ).toBeVisible()
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 800 })
    await page.screenshot({
      path: `test-results/password-applicant-login-${width}.png`,
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true)
    expect(
      await page
        .locator('.brand__logo')
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    ).toBe(true)
  }
  await page.getByLabel('Email', { exact: true }).fill(applicantEmail)
  await page
    .getByLabel('Password', { exact: true })
    .fill('ApplicantPassword123!')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/applicant$/)

  const context = await browser.newContext({ baseURL: 'http://localhost:5174' })
  try {
    const admin = await context.newPage()
    await admin.goto('/staff/login')
    for (const width of [1440, 390]) {
      await admin.setViewportSize({ width, height: 800 })
      await expect(admin.getByLabel('Email', { exact: true })).toBeVisible()
      await expect(
        admin.getByRole('link', { name: 'Sign in with Microsoft' }),
      ).toHaveCount(0)
      await admin.screenshot({
        path: `test-results/password-staff-login-${width}.png`,
        fullPage: true,
      })
    }
    await admin.setViewportSize({ width: 1440, height: 900 })
    await admin.getByLabel('Email', { exact: true }).fill('jamie@gap.example')
    await admin.getByLabel('Password', { exact: true }).fill('Greyhound2026!')
    await admin.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(admin).toHaveURL(/\/staff$/)
    await admin.goto('/staff/administration')
    await admin.getByRole('button', { name: 'Add staff account' }).click()
    await admin.getByLabel('Staff name', { exact: true }).fill('Password Staff')
    await admin.getByLabel('Staff email', { exact: true }).fill(staffEmail)
    await admin
      .getByLabel('Staff password', { exact: true })
      .fill('StaffPassword123!')
    await admin.getByRole('button', { name: 'Create staff account' }).click()
    await expect(admin.getByText(staffEmail, { exact: true })).toBeVisible()
    await admin
      .getByRole('button', {
        name: `Reset password for ${applicantEmail}`,
        exact: true,
      })
      .click()
    await admin
      .getByLabel(`New password for ${applicantEmail}`, { exact: true })
      .fill('ChangedApplicantPassword123!')
    await admin
      .getByRole('button', { name: 'Update password', exact: true })
      .click()
    await expect(
      admin.getByRole('button', { name: 'Update password', exact: true }),
    ).toHaveCount(0)
    await page.goto('/applicant/login')
    await page.getByLabel('Email', { exact: true }).fill(applicantEmail)
    await page
      .getByLabel('Password', { exact: true })
      .fill('ChangedApplicantPassword123!')
    await page.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(page).toHaveURL(/\/applicant$/)

    const staffContext = await browser.newContext({
      baseURL: 'http://localhost:5174',
    })
    try {
      const staff = await staffContext.newPage()
      await staff.goto('/staff/login')
      await staff.getByLabel('Email', { exact: true }).fill(staffEmail)
      await staff
        .getByLabel('Password', { exact: true })
        .fill('StaffPassword123!')
      await staff.getByRole('button', { name: 'Login', exact: true }).click()
      await expect(staff).toHaveURL(/\/staff$/)
      await staff.goto('/staff/administration')
      await expect(
        staff.getByRole('heading', { name: 'Administrator Access Required' }),
      ).toBeVisible()
    } finally {
      await staffContext.close()
    }
  } finally {
    await context.close()
  }
  const helpContext = await browser.newContext({
    baseURL: 'http://localhost:5174',
  })
  try {
    const help = await helpContext.newPage()
    await help.goto('/forgot-password')
    await expect(
      help.getByRole('heading', { name: 'Password assistance' }),
    ).toBeVisible()
    await expect(help.getByRole('textbox')).toHaveCount(0)
    await expect(help.getByText(/Contact a GAP administrator/)).toBeVisible()
  } finally {
    await helpContext.close()
  }
})
