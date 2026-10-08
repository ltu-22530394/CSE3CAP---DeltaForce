import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { staffApi } from '../api/staffApi'
import { statusLabels } from '../api/model'
import { ApplicationRows } from '../components/ApplicationRows'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import { Icon } from '../components/Icon'
import { apiRequest } from '../api/http'
import type { StaffMember } from '../api/management'
const PAGE_SIZE = 10
export function ApplicationsPage({ revision }: { revision: number }) {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || '',
    status = params.get('status') || '',
    type = params.get('type') || '',
    sort = params.get('sort') || 'newest'
  const requestedPage = Math.max(1, Number(params.get('page')) || 1)
  const load = useCallback(
    () =>
      staffApi.list({
        q,
        status,
        type,
        sort,
        from: params.get('from') || '',
        to: params.get('to') || '',
        location: params.get('location') || '',
        staff: params.get('staff') || '',
        allocated: params.get('allocated') || '',
      }),
    [q, status, type, sort, params],
  )
  const { data, error, retry } = useResource(
    load,
    `${params.toString()}-${revision}`,
  )
  const directoryLoad = useCallback(
    () => apiRequest<{ staff: StaffMember[] }>('/portal/staff/directory'),
    [],
  )
  const directory = useResource(directoryLoad, 'staff-directory')
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(window.location.search)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }
  const pageCount = data ? Math.max(1, Math.ceil(data.length / PAGE_SIZE)) : 1
  const page = Math.min(requestedPage, pageCount)
  const start = (page - 1) * PAGE_SIZE
  const activeFilters = [...params.keys()].some(
    (key) => !['page', 'sort'].includes(key),
  )
  return (
    <div className="applications-page">
      <header className="page-heading">
        <h1>Applications</h1>
        <p>Foster applications</p>
      </header>
      <form
        className="filters"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="search-field">
          <span className="sr-only">Search applications</span>
          <Icon name="search" />
          <input
            type="search"
            value={q}
            onChange={(e) => setFilter('q', e.target.value)}
            placeholder="Name, email, ID or phone"
          />
        </label>
        <label className="select-field">
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => setFilter('status', e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="in_progress">In progress</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>Type</span>
          <select
            value={type}
            onChange={(e) => setFilter('type', e.target.value)}
          >
            <option value="">All types</option>
            <option>Foster</option>
          </select>
        </label>
        <label className="select-field">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => setFilter('sort', e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
        {['from', 'to'].map((key) => (
          <label className="select-field" key={key}>
            <span>{key === 'from' ? 'Submitted from' : 'Submitted to'}</span>
            <input
              type="date"
              value={params.get(key) || ''}
              onChange={(event) => setFilter(key, event.target.value)}
            />
          </label>
        ))}
        <label className="select-field">
          <span>Location</span>
          <input
            value={params.get('location') || ''}
            onChange={(event) => setFilter('location', event.target.value)}
          />
        </label>
        <label className="select-field">
          <span>Assigned staff</span>
          <select
            value={params.get('staff') || ''}
            onChange={(event) => setFilter('staff', event.target.value)}
          >
            <option value="">All staff</option>
            {directory.data?.staff.map((staff) => (
              <option value={staff.id} key={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>Allocation</span>
          <select
            value={params.get('allocated') || ''}
            onChange={(event) => setFilter('allocated', event.target.value)}
          >
            <option value="">All placements</option>
            <option value="yes">Allocated</option>
            <option value="no">Not allocated</option>
          </select>
        </label>
      </form>
      <div className="list-summary">
        <span aria-live="polite">
          {data
            ? `${data.length} application${data.length === 1 ? '' : 's'}`
            : 'Finding applications…'}
        </span>
        {activeFilters && (
          <button className="text-link" onClick={() => setParams({})}>
            Clear filters
          </button>
        )}
      </div>
      {error ? (
        <ErrorState error={error} retry={retry} />
      ) : !data ? (
        <Loading />
      ) : data.length ? (
        <>
          <div
            className="application-list-scroll"
            role="region"
            aria-label="Applications list"
            tabIndex={0}
          >
            <ApplicationRows
              applications={data.slice(start, start + PAGE_SIZE)}
              search={params.size ? `?${params}` : ''}
            />
          </div>
          <nav className="pagination" aria-label="Application pages">
            <span>
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, data.length)} of{' '}
              {data.length}
            </span>
            <div>
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setFilter('page', String(page - 1))}
              >
                <Icon name="back" />
                Previous
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                className="button secondary"
                disabled={page >= pageCount}
                onClick={() => setFilter('page', String(page + 1))}
              >
                Next
                <Icon name="back" className="forward" />
              </button>
            </div>
          </nav>
        </>
      ) : (
        <div className="empty-state">
          <h2>
            {activeFilters ? 'No matching applications' : 'No applications yet'}
          </h2>
          <p>
            {activeFilters
              ? 'Try another name or adjust your filters.'
              : 'Submitted applications will appear here.'}
          </p>
          {activeFilters && (
            <button className="button secondary" onClick={() => setParams({})}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
