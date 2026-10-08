import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Greyhound } from '../api/model'
import { staffApi } from '../api/staffApi'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import { GreyhoundDialog } from '../components/GreyhoundDialog'
import { useFeedback } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { GreyhoundImportDialog } from '../components/GreyhoundImportDialog'
import { Upload } from 'lucide-react'
import { greyhoundStatusLabels } from '../api/model'
import { ImportHistory } from '../components/ImportHistory'

export function GreyhoundsPage({
  revision,
  changed,
}: {
  revision: number
  changed: () => void
}) {
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Greyhound | null | undefined>()
  const [importing, setImporting] = useState(false)
  const notify = useFeedback()
  const q = params.get('q') || ''
  const status = params.get('status') || ''
  const sort = params.get('sort') || 'name'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const load = useCallback(
    () =>
      staffApi.listGreyhounds({
        q,
        status,
        sort,
        location: params.get('location') || '',
        colour: params.get('colour') || '',
        minAge: params.get('minAge') || '',
        maxAge: params.get('maxAge') || '',
        compatibility: params.get('compatibility') || '',
        allocated: params.get('allocated') || '',
      }),
    [q, status, sort, params],
  )
  const { data, error, retry } = useResource(
    load,
    `${params.toString()}-${revision}`,
  )
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }
  const activeFilters = [...params.keys()].some(
    (key) => !['page', 'sort'].includes(key),
  )
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil((data?.length || 0) / 20)),
  )

  return (
    <div className="greyhounds-page">
      <header className="management-heading">
        <div>
          <h1>Greyhounds</h1>
          <p>Manage greyhounds available for placement.</p>
        </div>
        <div className="dialog-actions">
          <button
            className="button secondary"
            onClick={() => setImporting(true)}
          >
            <Upload size={16} />
            Import
          </button>
          <button className="button primary" onClick={() => setEditing(null)}>
            Add Greyhound
          </button>
        </div>
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
            {Object.entries(greyhoundStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
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
        {['location', 'colour', 'minAge', 'maxAge'].map((key) => (
          <label className="select-field" key={key}>
            <span>
              {
                {
                  location: 'Location',
                  colour: 'Colour',
                  minAge: 'Minimum age',
                  maxAge: 'Maximum age',
                }[key]
              }
            </span>
            <input
              type={key.endsWith('Age') ? 'number' : 'text'}
              min={0}
              max={20}
              value={params.get(key) || ''}
              onChange={(event) => setFilter(key, event.target.value)}
            />
          </label>
        ))}
        <label className="select-field">
          <span>Compatible with</span>
          <select
            value={params.get('compatibility') || ''}
            onChange={(event) => setFilter('compatibility', event.target.value)}
          >
            <option value="">Any / unknown</option>
            <option value="children">Children</option>
            <option value="cats">Cats</option>
            <option value="small_dogs">Small dogs</option>
            <option value="other_animals">Other animals</option>
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
          {data
            .slice((currentPage - 1) * 20, currentPage * 20)
            .map((greyhound) => (
              <div className="greyhound-row" key={greyhound.id}>
                <div className="greyhound-name">
                  <strong>{greyhound.name}</strong>
                  <span>{greyhound.identifier || greyhound.id}</span>
                  <span>
                    {greyhound.colour || 'Colour not recorded'} /{' '}
                    {greyhound.location || 'Location not recorded'}
                  </span>
                </div>
                <span data-label="Age">{greyhound.age} years</span>
                <span data-label="Sex">{greyhound.sex}</span>
                <span
                  data-label="Status"
                  className={`greyhound-status-text ${greyhound.status}`}
                >
                  {greyhoundStatusLabels[greyhound.status]}
                </span>
                <button
                  className="text-link greyhound-edit"
                  onClick={() => setEditing(greyhound)}
                >
                  Edit
                </button>
              </div>
            ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>
            {activeFilters ? 'No matching greyhounds' : 'No greyhounds yet'}
          </h2>
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
      {!!data?.length && (
        <nav
          className="pagination greyhound-pagination"
          aria-label="Greyhound pages"
        >
          <span>
            Page {currentPage} of {Math.max(1, Math.ceil(data.length / 20))}
          </span>
          <div>
            <button
              className="button secondary"
              disabled={currentPage <= 1}
              onClick={() => setFilter('page', String(currentPage - 1))}
            >
              <Icon name="back" />
              Previous
            </button>
            <button
              className="button secondary"
              disabled={currentPage * 20 >= data.length}
              onClick={() => setFilter('page', String(currentPage + 1))}
            >
              Next
              <Icon name="back" className="forward" />
            </button>
          </div>
        </nav>
      )}
      <ImportHistory revision={revision} />
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
      {importing && (
        <GreyhoundImportDialog
          close={() => setImporting(false)}
          complete={changed}
        />
      )}
    </div>
  )
}
