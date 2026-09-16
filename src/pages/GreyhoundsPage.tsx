import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Greyhound } from '../api/model'
import { staffApi } from '../api/staffApi'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import { GreyhoundDialog } from '../components/GreyhoundDialog'
import { useFeedback } from '../components/Feedback'
import { Icon } from '../components/Icon'

const statusLabels = {
  available: 'Available',
  medical_hold: 'Medical hold',
  assigned: 'Assigned',
} as const

export function GreyhoundsPage({
  revision,
  changed,
}: {
  revision: number
  changed: () => void
}) {
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Greyhound | null | undefined>()
  const notify = useFeedback()
  const q = params.get('q') || ''
  const status = params.get('status') || ''
  const sort = params.get('sort') || 'name'
  const load = useCallback(
    () => staffApi.listGreyhounds({ q, status, sort }),
    [q, status, sort],
  )
  const { data, error, retry } = useResource(
    load,
    `${params.toString()}-${revision}`,
  )
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const activeFilters = Boolean(q || status)

  return (
    <div className="greyhounds-page">
      <header className="management-heading">
        <div>
          <h1>Greyhounds</h1>
          <p>Manage greyhounds available for placement.</p>
        </div>
        <button className="button primary" onClick={() => setEditing(null)}>
          Add Greyhound
        </button>
      </header>
      <form
        className="greyhound-filters"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="search-field">
          <span className="sr-only">Search greyhounds</span>
          <Icon name="search" />
          <input
            type="search"
            value={q}
            onChange={(event) => setFilter('q', event.target.value)}
            placeholder="Search name or reference"
          />
        </label>
        <label className="select-field">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => setFilter('status', event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="medical_hold">Medical hold</option>
          </select>
        </label>
        <label className="select-field">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => setFilter('sort', event.target.value)}
          >
            <option value="name">Name A–Z</option>
            <option value="youngest">Youngest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </form>
      <div className="list-summary">
        <span aria-live="polite">
          {data
            ? `${data.length} greyhound${data.length === 1 ? '' : 's'}`
            : 'Finding greyhounds…'}
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
        <Loading label="Loading greyhounds" />
      ) : data.length ? (
        <div className="greyhound-list">
          <div className="greyhound-list-head" aria-hidden="true">
            <span>Greyhound</span>
            <span>Age</span>
            <span>Sex</span>
            <span>Status</span>
            <span />
          </div>
          {data.map((greyhound) => (
            <div className="greyhound-row" key={greyhound.id}>
              <div className="greyhound-name">
                <strong>{greyhound.name}</strong>
                <span>{greyhound.id}</span>
              </div>
              <span data-label="Age">{greyhound.age} years</span>
              <span data-label="Sex">{greyhound.sex}</span>
              <span
                data-label="Status"
                className={`greyhound-status-text ${greyhound.status}`}
              >
                {statusLabels[greyhound.status]}
              </span>
              {greyhound.status === 'assigned' ? (
                <span className="assigned-note">Managed through assignment</span>
              ) : (
                <button
                  className="text-link greyhound-edit"
                  onClick={() => setEditing(greyhound)}
                >
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{activeFilters ? 'No matching greyhounds' : 'No greyhounds yet'}</h2>
          <p>
            {activeFilters
              ? 'Try another name or adjust the status filter.'
              : 'Add the first greyhound to begin managing placements.'}
          </p>
          {activeFilters && (
            <button className="button secondary" onClick={() => setParams({})}>
              Clear filters
            </button>
          )}
        </div>
      )}
      {editing !== undefined && (
        <GreyhoundDialog
          greyhound={editing ?? undefined}
          close={() => setEditing(undefined)}
          complete={(greyhound) => {
            const action = editing ? 'updated' : 'added'
            setEditing(undefined)
            changed()
            notify(`${greyhound.name} ${action}.`)
          }}
        />
      )}
    </div>
  )
}
