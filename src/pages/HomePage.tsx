import { BriefcaseBusiness, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../applicant/components/AppHeader'

export function HomePage() {
  return (
    <div className="public-page public-page--auth">
      <AppHeader access="home" />
      <main className="auth-page auth-page--overlay portal-entry">
        <section
          className="auth-card auth-panel"
          aria-labelledby="entry-heading"
        >
          <h1 id="entry-heading">Greyhound Adoption Program</h1>
          <p>Are you an applicant or a staff member?</p>
          <nav
            className="portal-entry__choices"
            aria-label="Choose your portal"
          >
            <Link className="primary-button" to="/applicant/login">
              <UserRound aria-hidden="true" />
              <span>Applicant</span>
            </Link>
            <Link className="secondary-button" to="/staff/login">
              <BriefcaseBusiness aria-hidden="true" />
              <span>Staff</span>
            </Link>
          </nav>
        </section>
      </main>
    </div>
  )
}
