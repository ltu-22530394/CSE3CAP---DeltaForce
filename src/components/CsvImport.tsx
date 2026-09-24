import { useState } from 'react'
import { staffApi } from '../api/staffApi'
import type { ImportResult } from '../api/staffApi'

export function CsvImport({ changed }: { changed: () => void }) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null),
    [error, setError] = useState('')
  async function upload() {
    if (!file) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      if (file.size > 500000) throw new Error('Choose a CSV file under 500 KB.')
      setResult(await staffApi.importCsv(await file.text(), file.name))
      changed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="csv-import">
      <summary>Import greyhounds from CSV</summary>
      <p>
        Columns: identifier, name, age, sex, status. Sex: Male or Female.
        Status: available or medical_hold. Valid rows are imported; duplicate
        identifiers are skipped without changing existing records.
      </p>
      <p>
        <a
          href={`${import.meta.env.BASE_URL}greyhound-import-template.csv`}
          download
        >
          Download CSV template
        </a>
      </p>
      <label>
        CSV file (up to 500 KB, 1,000 rows)
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => {
            setFile(e.target.files?.[0] || null)
            setResult(null)
            setError('')
          }}
        />
      </label>
      <button
        className="button primary"
        type="button"
        disabled={!file || busy}
        onClick={upload}
      >
        {busy ? 'Importing…' : 'Import CSV'}
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div role="status">
          <p>
            {result.inserted} imported; {result.duplicates} duplicates;{' '}
            {result.errors.length - result.duplicates} errors.
          </p>
          <ul>
            {result.errors.map((item, index) => (
              <li key={index}>
                {item.row ? `Row ${item.row}: ` : ''}
                {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  )
}
