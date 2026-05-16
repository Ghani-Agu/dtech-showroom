import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParseResult {
  ok: true
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
}

export interface ParseError {
  ok: false
  error: string
}

const MAX_ROWS = 1000
const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function parseFile(
  file: File
): Promise<ParseResult | ParseError> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    }
  }

  const ext = file.name.toLowerCase().split('.').pop()

  if (ext === 'csv' || ext === 'tsv') {
    return parseCsv(file, ext === 'tsv' ? '\t' : ',')
  }

  if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsx(file)
  }

  return {
    ok: false,
    error: 'Unsupported file format. Use CSV, TSV, XLS, or XLSX.',
  }
}

function parseCsv(
  file: File,
  delimiter: string
): Promise<ParseResult | ParseError> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      delimiter,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      transform: (v) => (typeof v === 'string' ? v.trim() : v),
      complete: (results) => {
        if (results.errors.length > 0) {
          const firstError = results.errors[0]
          resolve({
            ok: false,
            error: firstError
              ? `Parse error at row ${firstError.row}: ${firstError.message}`
              : 'Unknown parse error',
          })
          return
        }

        const headers = results.meta.fields ?? []
        const rows = results.data

        if (rows.length === 0) {
          resolve({ ok: false, error: 'No data rows found' })
          return
        }

        if (rows.length > MAX_ROWS) {
          resolve({
            ok: false,
            error: `Too many rows (max ${MAX_ROWS}). Got ${rows.length}.`,
          })
          return
        }

        resolve({
          ok: true,
          headers,
          rows: rows as Record<string, string>[],
          rowCount: rows.length,
        })
      },
      error: (err) => {
        resolve({ ok: false, error: err.message })
      },
    })
  })
}

async function parseXlsx(
  file: File
): Promise<ParseResult | ParseError> {
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return { ok: false, error: 'No sheets found in workbook' }
    }

    const sheet = workbook.Sheets[firstSheetName]
    if (!sheet) {
      return { ok: false, error: 'Could not read first sheet' }
    }

    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    })

    if (rawRows.length < 2) {
      return {
        ok: false,
        error: 'File has no data rows (only header or empty)',
      }
    }

    const headerRow = rawRows[0]
    if (!headerRow) {
      return { ok: false, error: 'Missing header row' }
    }

    const headers = headerRow.map((h) => String(h).trim())
    const dataRows = rawRows.slice(1)

    if (dataRows.length > MAX_ROWS) {
      return {
        ok: false,
        error: `Too many rows (max ${MAX_ROWS}). Got ${dataRows.length}.`,
      }
    }

    const rows: Record<string, string>[] = dataRows.map((rowArray) => {
      const row: Record<string, string> = {}
      headers.forEach((header, i) => {
        const cell = rowArray[i]
        row[header] =
          cell === null || cell === undefined ? '' : String(cell).trim()
      })
      return row
    })

    return {
      ok: true,
      headers,
      rows,
      rowCount: rows.length,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to parse XLSX',
    }
  }
}
