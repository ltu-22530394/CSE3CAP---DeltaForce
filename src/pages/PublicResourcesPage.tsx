import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ApplicantPortalShell } from '../applicant/features/applicant/components/ApplicantPortalShell'
import { apiRequest } from '../api/http'
import type { PublicSettings } from '../api/management'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
export function PublicResourcesPage() {
  const load = useCallback(
    () =>
      apiRequest<{
        settings: PublicSettings
        resources: {
          id: string
          title: string
          description: string
          url: string
        }[]
      }>('/portal/public'),
    [],
  )
  const { data, error, retry } = useResource(load, 'public')
  return (
    <ApplicantPortalShell>
      <main className="account-action public-resources">
        <h1>Fostering With GAP</h1>
        {error ? (
          <ErrorState error={error} retry={retry} />
        ) : !data ? (
          <Loading />
        ) : (
          <>
            <p>{data.settings.fosteringInformation}</p>
            <h2>Foster care requirements</h2>
            <p>{data.settings.basicRequirements}</p>
            {!!data.resources.length && (
              <section>
                <h2>Public resources</h2>
                {data.resources.map((resource) => (
                  <article key={resource.id}>
                    <a href={resource.url} target="_blank" rel="noreferrer">
                      {resource.title}
                    </a>
                    <p>{resource.description}</p>
                  </article>
                ))}
              </section>
            )}
            {(data.settings.contactEmail || data.settings.contactPhone) && (
              <p>
                GAP contact: {data.settings.contactEmail}{' '}
                {data.settings.contactPhone}
              </p>
            )}
            <div className="dialog-actions">
              <Link className="button primary" to="/apply">
                Start foster application
              </Link>
              <Link to="/privacy">Privacy and terms</Link>
            </div>
          </>
        )}
      </main>
    </ApplicantPortalShell>
  )
}
