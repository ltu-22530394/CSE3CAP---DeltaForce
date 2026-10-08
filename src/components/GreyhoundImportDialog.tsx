import { useEffect, useRef, useState } from 'react'
import { Upload, X, Download, RefreshCw } from 'lucide-react'
import { apiRequest, downloadApiFile } from '../api/http'

interface ImportSummary {
  total: number
  successful: number
  failed: number
  duplicates: number
  skipped: number
  errors: { row: number; message: string }[]
  preview: boolean
  importedAt: string
  importedBy: string
  batchId?: string
}
export function GreyhoundImportDialog({
  close,
  complete,
}: {
  close: () => void
  complete: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const uploadVersion = useRef(0)
  const [source, setSource] = useState('csv')
  const [text, setText] = useState('')
  const [base64, setBase64] = useState('')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<unknown[]>([])
  const [overwrite, setOverwrite] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement
    element?.showModal()
    return () => {
      element?.close()
      previous?.focus()
    }
  }, [])
  async function upload(file?: File) {
    const version = ++uploadVersion.current
    setSummary(null)
    setError('')
    setText('')
    setBase64('')
    setFileName('')
    if (!file || !/\.(csv|xlsx)$/i.test(file.name) || file.size > 1024 * 1024) {
      setText('')
      setBase64('')
      setFileName('')
      setError('Choose a CSV or XLSX file of at most 1 MB.')
      return
    }
    setFileName(file.name)
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        const content = await file.text()
        if (version === uploadVersion.current) setText(content)
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          if (version === uploadVersion.current)
            setBase64(String(reader.result).split(',')[1] || '')
        }
        reader.onerror = () => {
          if (version === uploadVersion.current)
            setError('The selected file could not be read.')
        }
        reader.readAsDataURL(file)
      }
    } catch {
      if (version === uploadVersion.current)
        setError('The selected file could not be read.')
    }
  }
  async function run(confirm = false) {
    setBusy(true)
    setError('')
    try {
      if (source === 'salesforce' && !confirm) {
        const result = await apiRequest<{
          rows: unknown[]
          summary: ImportSummary
        }>('/portal/staff/salesforce/preview', { overwrite })
        setRows(result.rows)
        setSummary(result.summary)
      } else
        setSummary(
          await apiRequest<ImportSummary>(
            source === 'csv'
              ? '/portal/staff/import'
              : '/portal/staff/salesforce/import',
            source === 'csv'
              ? { text, base64, fileName, overwrite, confirm }
              : { rows, overwrite },
          ),
        )
      if (confirm) complete()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className="decision-dialog import-dialog"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) close()
      }}
      aria-labelledby="import-title"
    >
      <button
        className="icon-button dialog-close"
        title="Close"
        aria-label="Close"
        onClick={close}
        disabled={busy}
      >
        <X size={20} />
      </button>
      <h2 id="import-title">Import greyhounds</h2>
      <fieldset className="source-options" disabled={busy}>
        <legend>Data source</legend>
        <label>
          <input
            type="radio"
            name="import-source"
            checked={source === 'csv'}
            onChange={() => {
              setSource('csv')
              setSummary(null)
            }}
          />
          CSV / Excel export
        </label>
        <label>
          <input
            type="radio"
            name="import-source"
            checked={source === 'salesforce'}
            onChange={() => {
              setSource('salesforce')
              setSummary(null)
            }}
          />
          Salesforce connection
        </label>
      </fieldset>
      {source === 'csv' && (
        <label className="field">
          <span>CSV or Excel file</span>
          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
      )}
      <label className="confirmation-field">
        <input
          type="checkbox"
          checked={overwrite}
          disabled={busy}
          onChange={(event) => {
            setOverwrite(event.target.checked)
            setSummary(null)
          }}
        />
        <span>Update matching existing records</span>
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {summary && (
        <div aria-live="polite">
          <p>
            {summary.preview ? 'Preview' : 'Import'}:{' '}
            {new Date(summary.importedAt).toLocaleString('en-AU')} /{' '}
            {summary.importedBy}
          </p>
          <dl className="import-summary">
            <div>
              <dt>Records</dt>
              <dd>{summary.total}</dd>
            </div>
            <div>
              <dt>{summary.preview ? 'Ready to import' : 'Imported'}</dt>
              <dd>{summary.successful}</dd>
            </div>
            <div>
              <dt>Invalid</dt>
              <dd>{summary.failed}</dd>
            </div>
            <div>
              <dt>Duplicates</dt>
              <dd>{summary.duplicates}</dd>
            </div>
            <div>
              <dt>Skipped</dt>
              <dd>{summary.skipped}</dd>
            </div>
          </dl>
          {summary.errors.length > 0 && (
            <ul className="import-errors">
              {summary.errors.slice(0, 20).map((item) => (
                <li key={item.row}>
                  Row {item.row}: {item.message}
                </li>
              ))}
            </ul>
          )}
          {summary.batchId && summary.failed > 0 && (
            <button
              className="button secondary"
              onClick={() =>
                void downloadApiFile(
                  `/portal/staff/import/${summary.batchId}/errors.csv`,
                  'import-errors.csv',
                )
              }
            >
              <Download size={16} />
              Error report
            </button>
          )}
        </div>
      )}
      <div className="dialog-actions">
        <button className="button secondary" onClick={close} disabled={busy}>
          {summary && !summary.preview ? 'Done' : 'Cancel'}
        </button>
        {(!summary || summary.preview) && (
          <button
            className="button secondary"
            disabled={busy || (source === 'csv' && !text && !base64)}
            onClick={() => void run()}
          >
            <RefreshCw size={16} />
            {busy ? 'Processing...' : 'Preview'}
          </button>
        )}
        {summary?.preview && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void run(true)}
          >
            <Upload size={16} />
            {summary.successful ? 'Confirm import' : 'Record failed import'}
          </button>
        )}
      </div>
    </dialog>
  )
}
