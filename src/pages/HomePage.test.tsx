import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'

describe('home portal selection', () => {
  it('provides distinct applicant and staff entry points', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(markup).toContain('Are you an applicant or a staff member?')
    expect(markup).toContain('href="/applicant/login"')
    expect(markup).toContain('href="/staff/login"')
    expect(markup).toContain('aria-label="Choose your portal"')
    expect(markup).toContain('/assets/gap-logo-blue.png')
    expect(markup).toContain('class="brand" aria-label="GAP home" href="/"')
  })
})
