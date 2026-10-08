import { config } from '../config.js'
import { ApiError } from '../utils/apiError.js'

export function salesforceConfigured() {
  return Boolean(
    config.salesforceLoginUrl &&
    config.salesforceClientId &&
    config.salesforceClientSecret &&
    config.salesforceObject &&
    config.salesforceFieldMap,
  )
}

function salesforceUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.salesforce.com'))
    throw new ApiError(
      503,
      'SALESFORCE_CONFIG',
      'Configure a Salesforce HTTPS My Domain URL.',
    )
  return url
}

export async function fetchSalesforceGreyhounds() {
  if (!salesforceConfigured())
    throw new ApiError(
      503,
      'SALESFORCE_NOT_CONFIGURED',
      'Salesforce credentials and greyhound field mapping have not been configured.',
    )
  let fields
  try {
    fields = JSON.parse(config.salesforceFieldMap)
  } catch {
    throw new ApiError(
      503,
      'SALESFORCE_CONFIG',
      'Salesforce field mapping must be valid JSON.',
    )
  }
  if (
    !fields ||
    ['id', 'name', 'age', 'sex'].some((key) => !fields[key]) ||
    !/^[A-Za-z][A-Za-z0-9_]*$/.test(config.salesforceObject) ||
    Object.values(fields).some(
      (field) =>
        typeof field !== 'string' || !/^[A-Za-z][A-Za-z0-9_.]*$/.test(field),
    ) ||
    !/^v\d+\.\d+$/.test(config.salesforceApiVersion)
  )
    throw new ApiError(
      503,
      'SALESFORCE_CONFIG',
      'Check the Salesforce object and required id/name/age/sex field mappings.',
    )
  const login = salesforceUrl(config.salesforceLoginUrl)
  try {
    const response = await fetch(new URL('/services/oauth2/token', login), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.salesforceClientId,
        client_secret: config.salesforceClientSecret,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error('Salesforce authentication failed')
    const token = await response.json()
    const instance = salesforceUrl(token.instance_url)
    const query = `SELECT ${[...new Set(['Id', ...Object.values(fields)])].join(',')} FROM ${config.salesforceObject} LIMIT 5000`
    let next = new URL(
      `/services/data/${config.salesforceApiVersion}/query`,
      instance,
    )
    next.searchParams.set('q', query)
    const rows = []
    while (next) {
      if (
        next.origin !== instance.origin ||
        !next.pathname.startsWith('/services/data/')
      )
        throw new Error('Invalid Salesforce pagination URL')
      const result = await fetch(next, {
        headers: { authorization: 'Bearer ' + token.access_token },
        signal: AbortSignal.timeout(15000),
      })
      if (!result.ok) throw new Error('Salesforce query failed')
      const page = await result.json()
      for (const record of page.records) {
        const row = { salesforceId: record.Id }
        for (const [local, remote] of Object.entries(fields))
          row[local] =
            remote.split('.').reduce((value, key) => value?.[key], record) ?? ''
        rows.push(row)
      }
      if (rows.length > 5000) throw new Error('Too many Salesforce records')
      next = page.nextRecordsUrl ? new URL(page.nextRecordsUrl, instance) : null
    }
    return rows
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(
      502,
      'SALESFORCE_UNAVAILABLE',
      'Salesforce could not be reached. Check the connection settings and integration-user permissions.',
    )
  }
}
