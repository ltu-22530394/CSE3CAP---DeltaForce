import { useCallback } from 'react'
import { Download } from 'lucide-react'
import { apiRequest, downloadApiFile } from '../api/http'
import { useResource, ErrorState } from './AsyncView'
interface Batch {
  id: string
  source_file_name: string
  successful_records: number
  failed_records: number
  duplicate_records: number
  created_at: string
  staffName: string
  import_status: string
}
export function ImportHistory({ revision }: { revision: number }) {
  const load = useCallback(
    () => apiRequest<{ batches: Batch[] }>('/portal/staff/import-history'),
    [],
  )
  const { data, error, retry } = useResource(load, String(revision))
  return (
    <section className="application-tools">
      <h2>Import History</h2>
      {error ? (
        <ErrorState error={error} retry={retry} />
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Import history"
        >
          <table className="management-table">
            <thead>
              <tr>
                <th>File / time</th>
                <th>Staff</th>
                <th>Successful</th>
                <th>Failed</th>
                <th>Duplicates</th>
                <th>Status / errors</th>
              </tr>
            </thead>
            <tbody>
              {data?.batches.map((batch) => (
                <tr key={batch.id}>
                  <td>
                    {batch.source_file_name}
                    <small>{batch.created_at} UTC</small>
                  </td>
                  <td>{batch.staffName}</td>
                  <td>{batch.successful_records}</td>
                  <td>{batch.failed_records}</td>
                  <td>{batch.duplicate_records}</td>
                  <td>
                    {batch.import_status.replaceAll('_', ' ')}
                    {batch.failed_records > 0 && (
                      <button
                        className="icon-button"
                        title="Download import errors"
                        aria-label={`Download errors for ${batch.source_file_name}`}
                        onClick={() =>
                          void downloadApiFile(
                            `/portal/staff/import/${batch.id}/errors.csv`,
                            'import-errors.csv',
                          )
                        }
                      >
                        <Download size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
