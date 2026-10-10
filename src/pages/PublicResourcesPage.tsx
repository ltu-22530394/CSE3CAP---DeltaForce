import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ApplicantPortalShell } from '../applicant/features/applicant/components/ApplicantPortalShell'
import { apiRequest } from '../api/http'
import type { PublicSettings } from '../api/management'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import type { ReactNode } from 'react'

function usePublicPortal() {
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
  return useResource(load, 'public')
}

export function PublicApplicationGate({ children }: { children: ReactNode }) {
  const { data, error, retry } = usePublicPortal()
  if (error)
    return (
      <ApplicantPortalShell>
        <ErrorState error={error} retry={retry} />
      </ApplicantPortalShell>
    )
  if (!data)
    return (
      <ApplicantPortalShell>
        <Loading />
      </ApplicantPortalShell>
    )
  if (!data.settings.policyReady)
    return (
      <ApplicantPortalShell>
        <main className="account-action">
          <h1>Applications temporarily paused</h1>
          <p>
            GAP is finalising its privacy policy and terms of use. No personal
            information can be submitted until those documents are published.
          </p>
          <Link to="/privacy">View privacy and terms status</Link>
        </main>
      </ApplicantPortalShell>
    )
  return <>{children}</>
}

export function PublicResourcesPage() {
  const { data, error, retry } = usePublicPortal()
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
              {data.settings.policyReady ? (
                <Link className="button primary" to="/apply">
                  Start foster application
                </Link>
              ) : (
                <p role="status">
                  Applications are temporarily paused while GAP finalises its
                  privacy policy and terms of use.
                </p>
              )}
              <Link to="/privacy">Privacy and terms</Link>
            </div>
          </>
        )}
      </main>
    </ApplicantPortalShell>
  )
}
