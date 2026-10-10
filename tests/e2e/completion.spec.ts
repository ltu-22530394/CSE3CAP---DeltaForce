import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import ExcelJS from 'exceljs'
test.use({ actionTimeout: 15000 })

test('profile, case management, administration, Excel, reports and maintenance on desktop and mobile', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(180000)
  const stamp = Date.now(),
    email = 'completion-' + stamp + '@example.com'
  const form = {
    fullName: 'Completion Foster',
    email,
    dateOfBirth: '1990-04-12',
    phone: '0412345678',
    address: '10 Sample Street',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    residenceType: 'house',
    housingStatus: 'owner',
    adultsInHome: '2',
    childrenInHome: '0',
    secureYard: 'yes',
    applicationType: 'foster',
    dogExperience: 'Five years caring for dogs',
    greyhoundExperience: 'no',
    hasCurrentPets: 'no',
    preferredFosteringPeriod: 'Four weeks',
    availability: 'Weekdays',
    transportAvailability: 'yes',
    reasonForApplying: 'Provide a calm home',
    emergencyContactName: 'Sam Foster',
    emergencyContactPhone: '0412345679',
    confirmAccurate: true,
    termsAccepted: true,
    privacyConsent: true,
  }
  const appliedResponse = await request.post('/api/portal/apply', {
    data: { form, password: 'FosterPassword123!' },
  })
  expect(appliedResponse.status()).toBe(201)
  const applied = await appliedResponse.json()
  expect(applied.verificationUrl).toBeUndefined()
  const errors: string[] = []
  async function signIn(p: Page, user: string, password: string) {
    p.on('pageerror', (error) => errors.push(error.message))
    await p.goto('/login')
    await p.getByLabel('Email', { exact: true }).fill(user)
    await p.getByLabel('Password', { exact: true }).fill(password)
    await p.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(p).toHaveURL(/\/(applicant|staff)(\/|$)/)
  }
  await signIn(page, email, 'FosterPassword123!')
  await page.goto('/applicant/profile')
  await expect(
    page.getByRole('heading', { name: 'My Profile' }),
  ).toBeVisible()
  await page.getByLabel('Phone number', { exact: true }).fill('0499999999')
  await page.getByLabel('Suburb', { exact: true }).fill('Newcastle')
  await page.getByRole('button', { name: 'Save contact details' }).click()
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Contact information updated' }),
  ).toContainText('Contact information updated')
  const staffContext = await browser.newContext({
    baseURL: 'http://localhost:5174',
    viewport: { width: 1440, height: 1000 },
  })
  const staff = await staffContext.newPage()
  await signIn(staff, 'jamie@gap.example', 'Greyhound2026!')
  await staff.goto('/staff/applications/' + applied.applicationId)
  await expect(
    staff.getByText('0499999999', { exact: true }),
  ).toBeVisible()
  await staff
    .getByLabel('Assigned staff member')
    .selectOption({ label: 'Jamie Parker' })
  await staff
    .getByRole('button', { name: 'Assign staff', exact: true })
    .click()
  await expect(staff.getByLabel('Assigned staff member')).toHaveValue(/.+/)
  await staff
    .getByLabel('New case note')
    .fill('Private assessment for staff only')
  await staff
    .getByRole('button', { name: 'Add note', exact: true })
    .click()
  await expect(
    staff.getByText('Private assessment for staff only', { exact: true }),
  ).toBeVisible()
  await staff
    .getByRole('button', { name: 'Permit application correction' })
    .click()
  await expect(
    staff.getByRole('button', { name: 'Corrections permitted' }),
  ).toBeDisabled()
  await page.goto('/applicant')
  await expect(
    page.getByText('Private assessment for staff only'),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: /correct|edit/i }).first(),
  ).toBeVisible()
  await staff.getByRole('button', { name: 'Approve', exact: true }).click()
  await staff
    .getByRole('button', { name: 'Approve application', exact: true })
    .click()
  await expect(
    staff.getByRole('button', { name: 'Assign Greyhound' }),
  ).toBeVisible()

  const workbook = new ExcelJS.Workbook(),
    sheet = workbook.addWorksheet('Greyhounds')
  const dogName = 'Excel Buddy ' + stamp
  sheet.addRows([
    [
      'id',
      'name',
      'age',
      'sex',
      'feedingInformation',
      'compatibleWithChildren',
    ],
    ['EXCEL-' + stamp, dogName, 3, 'Male', 'Two meals daily', true],
  ])
  const bytes = Buffer.from(await workbook.xlsx.writeBuffer())
  await staff.goto('/staff/greyhounds')
  await staff.getByRole('button', { name: 'Import', exact: true }).click()
  await staff.getByLabel('CSV or Excel file').setInputFiles({
    name: 'greyhounds.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: bytes,
  })
  await staff.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(staff.getByText('Ready to import')).toBeVisible()
  await staff.getByRole('button', { name: 'Confirm import' }).click()
  await staff.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(
    staff.getByRole('cell').filter({ hasText: 'greyhounds.xlsx' }).first(),
  ).toBeVisible()
  await staff.goto('/staff/applications/' + applied.applicationId)
  await staff
    .getByRole('button', { name: 'Assign Greyhound', exact: true })
    .click()
  await staff.getByRole('radio', { name: new RegExp(dogName) }).check()
  await staff
    .getByLabel('Internal placement notes')
    .fill('Staff-only transport notes')
  await staff
    .getByRole('dialog')
    .getByRole('button', { name: 'Assign Greyhound', exact: true })
    .click()
  await expect(
    staff.getByRole('button', { name: 'Update placement' }),
  ).toBeVisible()
  await staff
    .getByLabel('Expected end date', { exact: true })
    .fill('2099-02-01')
  await staff.getByRole('button', { name: 'Update placement' }).click()
  await expect(
    staff.getByText('2099-02-01', { exact: false }).first(),
  ).toBeVisible()
  await page.goto('/applicant')
  await expect(
    page.getByRole('heading', { name: dogName, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Two meals daily', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Staff-only transport notes')).toHaveCount(0)

  await staff.goto('/staff/administration')
  await expect(
    staff.getByRole('tab', { name: 'Accounts', exact: true }),
  ).toBeVisible()
  await staff.getByRole('button', { name: 'Add staff account' }).click()
  await staff.getByLabel('Staff name', { exact: true }).fill('New Staff')
  await staff
    .getByLabel('Staff email', { exact: true })
    .fill('staff-' + stamp + '@example.com')
  await staff.getByLabel('Staff password').fill('StaffPassword123!')
  await staff.getByRole('button', { name: 'Create staff account' }).click()
  await expect(
    staff.getByText('staff-' + stamp + '@example.com', { exact: true }),
  ).toBeVisible()
  await staff.getByRole('tab', { name: 'Email templates' }).click()
  await staff
    .getByLabel('Notification template')
    .selectOption('withdrawal')
  await staff
    .getByLabel('Subject', { exact: true })
    .fill('Withdrawal update {{name}}')
  await staff.getByRole('button', { name: 'Save template' }).click()
  await expect(staff.getByLabel('Subject', { exact: true })).toHaveValue(
    'Withdrawal update {{name}}',
  )
  await staff
    .getByRole('tab', { name: 'System settings', exact: true })
    .click()
  await staff.getByLabel('GAP contact email').fill('contact@example.com')
  await expect(staff.getByLabel('Enable Monday report')).toBeDisabled()
  await staff
    .getByRole('button', { name: 'Save settings', exact: true })
    .click()
  await expect(staff.getByLabel('GAP contact email')).toHaveValue(
    'contact@example.com',
  )
  await staff.getByRole('tab', { name: 'Backups & Reports' }).click()
  await staff
    .getByRole('button', { name: 'Create backup', exact: true })
    .click()
  await expect(
    staff.getByText('Backup created and integrity verified.'),
  ).toBeVisible()
  await expect(
    staff.getByRole('button', { name: 'Queue weekly report' }),
  ).toBeDisabled()
  await staff.getByRole('tab', { name: 'Audit log' }).click()
  await staff
    .getByLabel('Search action or record ID')
    .fill('backup.completed')
  await expect(
    staff.getByRole('cell').filter({ hasText: 'backup.completed' }),
  ).toBeVisible()
  await staff.goto('/staff/reports')
  await expect(
    staff.getByRole('table', { name: 'Application status records' }),
  ).toBeVisible()
  await staff.getByLabel('File format').selectOption('xlsx')
  const downloaded = staff.waitForEvent('download')
  await staff.getByRole('button', { name: 'Export report' }).click()
  expect((await downloaded).suggestedFilename()).toBe(
    'application-status.xlsx',
  )

  async function checkView(p: Page, name: string, width: number) {
    await p.setViewportSize({ width, height: 900 })
    await expect(p.getByRole('main')).toBeVisible()
    await p.screenshot({
      path: 'test-results/' + name + '.png',
      fullPage: true,
    })
    const overflow = await p.evaluate(() =>
      Array.from(document.querySelectorAll('body *'))
        .filter(
          (el) =>
            el.getBoundingClientRect().right > window.innerWidth + 1 &&
            !el.closest('.table-scroll'),
        )
        .slice(0, 15)
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          right: el.getBoundingClientRect().right,
          width: el.getBoundingClientRect().width,
        })),
    )
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      name + ' overflow ' + JSON.stringify(overflow),
    ).toBe(true)
    const audit = await new AxeBuilder({ page: p })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      name + ' accessibility',
    ).toEqual([])
    await p.screenshot({
      path: 'test-results/' + name + '.png',
      fullPage: true,
    })
  }
  await checkView(staff, 'reports-desktop', 1440)
  await checkView(staff, 'reports-mobile', 390)
  await staff.goto('/staff/administration')
  for (const tab of [
    'Accounts',
    'Email templates',
    'System settings',
    'Audit log',
    'Backups & Reports',
  ]) {
    await staff.getByRole('tab', { name: tab, exact: true }).click()
    await expect(staff.getByRole('tabpanel')).toBeVisible()
    await checkView(
      staff,
      'admin-' + tab.toLowerCase().replaceAll(' ', '-') + '-mobile',
      390,
    )
  }
  await staff.goto('/staff/applications/' + applied.applicationId)
  await expect(
    staff.getByRole('button', { name: 'Update placement' }),
  ).toBeVisible()
  await checkView(staff, 'placement-mobile', 390)
  await staff
    .getByRole('button', { name: 'End placement', exact: true })
    .click()
  await expect(
    staff.getByRole('button', { name: 'Make carer inactive' }),
  ).toBeVisible()
  await staff.getByRole('button', { name: 'Make carer inactive' }).click()
  await expect(
    staff.getByText('Inactive', { exact: true }).first(),
  ).toBeVisible()
  await page.goto('/applicant/profile')
  await expect(
    page.getByRole('heading', { name: 'My Profile' }),
  ).toBeVisible()
  await checkView(page, 'profile-mobile', 390)
  await page.goto('/fostering')
  await expect(
    page.getByRole('heading', { name: 'Fostering With GAP' }),
  ).toBeVisible()
  await checkView(page, 'fostering-tablet', 768)
  await staff.goto('/staff/greyhounds')
  await staff
    .locator('.greyhound-row')
    .filter({ hasText: dogName })
    .getByRole('button', { name: 'Edit', exact: true })
    .click()
  await expect(staff.getByRole('dialog')).toBeVisible()
  await staff
    .getByLabel('Name', { exact: true })
    .fill(dogName + ' Updated')
  await staff.getByLabel('Age', { exact: true }).fill('4')
  await staff
    .getByRole('dialog')
    .getByLabel('Feeding information')
    .fill('Updated two meals daily')
  await staff
    .getByRole('dialog')
    .getByLabel('Compatible with cats')
    .selectOption('0')
  await staff
    .getByRole('dialog')
    .screenshot({ path: 'test-results/greyhound-edit-mobile.png' })
  const dogAudit = await new AxeBuilder({ page: staff })
    .include('dialog')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(dogAudit.violations.map((v) => v.id)).toEqual([])
  await staff
    .getByRole('button', { name: 'Save Greyhound', exact: true })
    .click()
  await expect(staff.getByRole('dialog')).toHaveCount(0)
  await expect(
    staff.getByText(dogName + ' Updated', { exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
  await staffContext.close()
})
