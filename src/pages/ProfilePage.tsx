import { Link } from 'react-router-dom'
import type { StaffUser } from '../api/model'
import { initials } from '../api/model'
import { Icon } from '../components/Icon'
export function ProfilePage({ user }: { user: StaffUser }) {
  return (
    <div className="profile-page">
      <Link to="/staff" className="back-link">
        <Icon name="back" />
        Back to dashboard
      </Link>
      <header className="page-heading">
        <h1>My profile</h1>
      </header>
      <section className="profile-details">
        <span className="avatar review-avatar">{initials(user.name)}</span>
        <dl>
          <div className="detail">
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="detail">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="detail">
            <dt>Role</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
