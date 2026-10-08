import { parentPort, workerData } from 'node:worker_threads'
import ExcelJS from 'exceljs'
import yauzl from 'yauzl'

async function validateZip(buffer) {
  await new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true },
      (error, zip) => {
        if (error) return reject(error)
        let entries = 0,
          total = 0,
          inflated = 0
        const fail = (error) => {
          zip.close()
          reject(error)
        }
        zip.on('error', fail)
        zip.on('end', resolve)
        zip.on('entry', (entry) => {
          entries++
          total += entry.uncompressedSize
          if (
            entries > 500 ||
            total > 20 * 1024 * 1024 ||
            entry.generalPurposeBitFlag & 1
          )
            return fail(
              new Error('Workbook exceeds safe limits or is encrypted.'),
            )
          if (entry.fileName.endsWith('/')) return zip.readEntry()
          zip.openReadStream(entry, (error, stream) => {
            if (error) return fail(error)
            stream.on('error', fail)
            stream.on('data', (chunk) => {
              inflated += chunk.length
              if (inflated > 20 * 1024 * 1024) {
                stream.destroy()
                fail(new Error('Workbook exceeds decompression limits.'))
              }
            })
            stream.on('end', () => zip.readEntry())
          })
        })
        zip.readEntry()
      },
    )
  })
}
try {
  const buffer = Buffer.from(workerData.base64, 'base64')
  await validateZip(buffer)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer, {
    ignoreNodes: ['drawing', 'conditionalFormatting', 'extLst'],
  })
  const sheet = workbook.worksheets[0]
  if (
    !sheet ||
    sheet.rowCount < 2 ||
    sheet.rowCount > 5001 ||
    sheet.columnCount > 50 ||
    workbook.worksheets.length !== 1
  )
    throw new Error(
      'Use one worksheet with a header and 1-5,000 records, up to 50 columns.',
    )
  const rows = []
  sheet.eachRow((row) => {
    const values = []
    for (let column = 1; column <= sheet.columnCount; column++) {
      const value = row.getCell(column).value
      if (value && typeof value === 'object' && !(value instanceof Date))
        throw new Error(
          'Use plain cells, not formulas, hyperlinks or rich text.',
        )
      values.push(
        value instanceof Date
          ? value.toISOString().slice(0, 10)
          : String(value ?? ''),
      )
    }
    rows.push(values)
  })
  parentPort.postMessage({ rows })
} catch (error) {
  parentPort.postMessage({
    error: error.message || 'The workbook could not be read.',
  })
}
