import { Worker } from 'node:worker_threads'
import { ApiError } from '../utils/apiError.js'
import { parseGreyhoundCsv, normalizeHeaders } from './greyhoundImport.js'

let active = 0
export async function parseGreyhoundFile(input) {
  if (typeof input.fileName !== 'string' || input.fileName.length > 200)
    throw new ApiError(400, 'INVALID_FILE', 'Choose a CSV or XLSX file.')
  if (input.fileName.toLowerCase().endsWith('.csv'))
    return parseGreyhoundCsv(input.text, input.fileName)
  if (
    !input.fileName.toLowerCase().endsWith('.xlsx') ||
    typeof input.base64 !== 'string' ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64) ||
    input.base64.length > 1400000 ||
    !input.base64.length
  )
    throw new ApiError(
      400,
      'INVALID_FILE',
      'Choose a CSV or XLSX workbook of at most 1 MB. Legacy XLS and macro-enabled files are not accepted.',
    )
  const buffer = Buffer.from(input.base64, 'base64')
  if (
    buffer.length < 4 ||
    buffer.length > 1024 * 1024 ||
    buffer.readUInt32LE(0) !== 0x04034b50
  )
    throw new ApiError(
      400,
      'INVALID_FILE',
      'The file is not a valid XLSX workbook within the size limit.',
    )
  if (active >= 2)
    throw new ApiError(
      429,
      'IMPORT_BUSY',
      'Another workbook is processing. Try again shortly.',
    )
  active++
  try {
    const matrix = await new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./spreadsheetWorker.js', import.meta.url),
        {
          workerData: { base64: input.base64 },
          resourceLimits: {
            maxOldGenerationSizeMb: 128,
            maxYoungGenerationSizeMb: 16,
          },
        },
      )
      const timer = setTimeout(() => {
        void worker.terminate()
        reject(
          new ApiError(
            400,
            'INVALID_FILE',
            'The workbook exceeded the processing time limit. Use a smaller plain-data workbook.',
          ),
        )
      }, 10000)
      worker.once('message', (value) => {
        clearTimeout(timer)
        void worker.terminate()
        if (value.error) reject(new ApiError(400, 'INVALID_FILE', value.error))
        else resolve(value.rows)
      })
      worker.once('error', () => {
        clearTimeout(timer)
        reject(
          new ApiError(
            400,
            'INVALID_FILE',
            'Workbook processing exceeded its safe limits.',
          ),
        )
      })
      worker.once('exit', (code) => {
        clearTimeout(timer)
        if (code !== 0)
          reject(
            new ApiError(
              400,
              'INVALID_FILE',
              'The workbook could not be processed.',
            ),
          )
      })
    })
    const headers = normalizeHeaders(matrix.shift())
    return matrix.map((row) =>
      Object.fromEntries(headers.map((key, index) => [key, row[index] ?? ''])),
    )
  } finally {
    active--
  }
}
