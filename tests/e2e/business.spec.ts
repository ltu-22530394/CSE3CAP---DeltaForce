import { test, expect } from '@playwright/test'

test('public application, immediate login, staff decision, import, and carer placement', async ({
  page,
  browser,
}) => {
  const email = `capstone-${Date.now()}@example.com`
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/apply')
  await expect(
    page.getByRole('heading', { name: 'Foster Application', exact: true }),
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page
    .getByRole('button', { name: 'Why we ask for Residential Address' })
    .click()
  const helpBounds = await page
    .locator('#application-address-help')
    .boundingBox()
  expect(helpBounds).not.toBeNull()
  expect(helpBounds!.x + helpBounds!.width).toBeLessThanOrEqual(390)
  await page.screenshot({
    path: 'test-results/application-mobile.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page
    .getByLabel('Full Name *', { exact: true })
    .fill('Capstone Foster')
  await page
    .getByLabel('Date of Birth *', { exact: true })
    .fill('1990-04-12')
  await page.getByLabel('Email Address *', { exact: true }).fill(email)
  await page
    .getByLabel('Phone Number *', { exact: true })
    .fill('0412345678')
  await page
    .getByLabel('Residential Address *', { exact: true })
    .fill('10 Example Street')
  await page.getByLabel('Suburb *', { exact: true }).fill('Sydney')
  await page.getByLabel('Postcode *', { exact: true }).fill('2000')
  await page
    .getByLabel('Password *', { exact: true })
    .fill('FosterPassword123!')
  await page
    .getByLabel('Confirm password *', { exact: true })
    .fill('FosterPassword123!')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByLabel('Residence Type *').selectOption('house')
  await page.getByRole('radio', { name: 'Own', exact: true }).check()
  await page.getByLabel('Adults in Household *').fill('2')
  await page.getByLabel('Children in Household *').fill('0')
  await page
    .getByRole('group', { name: 'Do you have a secure fenced yard? *' })
    .getByRole('radio', { name: 'Yes', exact: true })
    .check()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page
    .getByLabel('Describe your experience caring for dogs *')
    .fill('Five years of caring for dogs.')
  await page
    .getByRole('group', {
      name: 'Have you cared for a greyhound before? *',
    })
    .getByRole('radio', { name: 'No', exact: true })
    .check()
  await page
    .getByRole('group', { name: 'Do pets currently live in your home? *' })
    .getByRole('radio', { name: 'No', exact: true })
    .check()
  await page.getByLabel('Preferred fostering period *').fill('Four weeks')
  await page.getByLabel('Your availability *').fill('Every weekday')
  await page
    .getByRole('group', { name: 'Can you transport a greyhound? *' })
    .getByRole('radio', { name: 'Yes', exact: true })
    .check()
  await page
    .getByLabel('Why would you like to foster? *')
    .fill('Provide a calm and caring home.')
  await page.getByLabel('Emergency contact name *').fill('Sam Contact')
  await page.getByLabel('Emergency contact phone *').fill('0412345679')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByLabel('I confirm these details are correct. *').check()
  await page.getByLabel('I accept the terms of use. *').check()
  await page.getByLabel(/I consent to GAP using/).check()
  await page.getByRole('button', { name: 'Submit Application' }).click()
  await expect(page.getByText(/Application received/)).toBeVisible()
  await page.goto('/applicant/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page
    .getByLabel('Password', { exact: true })
    .fill('FosterPassword123!')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'My Applications' }),
  ).toBeVisible()
  const staffContext = await browser.newContext()
  const staff = await staffContext.newPage()
  await staff.goto('http://localhost:5174/login')
  await staff
    .getByLabel('Email', { exact: true })
    .fill('jamie@gap.example')
  await staff
    .getByLabel('Password', { exact: true })
    .fill('Greyhound2026!')
  await staff.getByRole('button', { name: 'Login', exact: true }).click()
  await staff
    .getByRole('link', { name: 'Applications', exact: true })
    .click()
  await staff
    .getByRole('link', { name: /Capstone Foster/ })
    .first()
    .click()
  await staff.getByRole('button', { name: 'Approve', exact: true }).click()
  await staff
    .getByRole('button', { name: 'Approve application', exact: true })
    .click()
  await expect(
    staff.getByRole('button', { name: 'Assign Greyhound' }),
  ).toBeVisible()
  const reviewUrl = staff.url()
  await staff
    .getByRole('link', { name: 'Integrations & Resources' })
    .click()
  await staff.getByRole('tab', { name: 'Care resources' }).click()
  await staff
    .getByLabel('Title', { exact: true })
    .fill('Foster care guide')
  await staff
    .getByLabel('HTTPS link')
    .fill('https://example.com/approved-guide.pdf')
  await staff.getByRole('button', { name: 'Save resource' }).click()
  await expect(
    staff.getByRole('link', { name: 'Foster care guide' }),
  ).toBeVisible()
  await staff
    .getByRole('link', { name: 'Greyhounds', exact: true })
    .click()
  await staff.getByRole('button', { name: 'Import', exact: true }).click()
  await staff.getByLabel('CSV or Excel file').setInputFiles({
    name: 'salesforce.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'id,name,age,sex,careInstructions\nE2E-1,Buddy,3,Male,Feed twice daily',
    ),
  })
  await staff.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(staff.getByText('Ready to import')).toBeVisible()
  await staff.getByRole('button', { name: 'Confirm import' }).click()
  await staff.getByRole('button', { name: 'Done', exact: true }).click()
  await staff.goto(reviewUrl)
  await staff
    .getByRole('button', { name: 'Assign Greyhound', exact: true })
    .click()
  await staff.getByRole('radio').check()
  await staff
    .getByRole('dialog')
    .getByRole('button', { name: 'Assign Greyhound', exact: true })
    .click()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Buddy', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Feed twice daily')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Foster care guide' }),
  ).toBeVisible()
  await page.screenshot({
    path: 'test-results/carer-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: 'test-results/carer-mobile.png',
    fullPage: true,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  expect(errors).toEqual([])
  await staffContext.close()
})
