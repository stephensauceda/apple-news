import { createSignedHeaders } from './auth.js'

/**
 * @typedef RequestOptions
 * @property {string} apiId
 * @property {string} apiSecret
 * @property {string} method
 * @property {string} endpoint
 * @property {string} [host]
 * @property {Record<string, string | number | boolean | undefined>} [query]
 * @property {string} [contentType]
 * @property {string|Buffer|Uint8Array|null} [body]
 * @property {string|Date} [date]
 * @property {typeof fetch} [fetchImpl]
 */

export class AppleNewsApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status: number, method: string, url: string, apiErrors?: unknown[], responseBody?: unknown }} details
   */
  constructor(message, details) {
    super(message)
    this.name = 'AppleNewsApiError'
    this.status = details.status
    this.method = details.method
    this.url = details.url
    this.apiErrors = details.apiErrors
    this.responseBody = details.responseBody
  }
}

/**
 * @param {string} host
 * @param {string} endpoint
 * @param {Record<string, string | number | boolean | undefined>} [query]
 * @returns {string}
 */
export function buildRequestUrl(host, endpoint, query) {
  const url = new URL(`https://${host}${endpoint}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) {
        continue
      }

      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
  return value !== null && typeof value === 'object'
}

/**
 * @param {unknown} parsed
 * @returns {unknown[]|undefined}
 */
function getApiErrors(parsed) {
  if (!isObject(parsed)) {
    return undefined
  }

  const maybeErrors = parsed.errors
  if (!Array.isArray(maybeErrors)) {
    return undefined
  }

  return maybeErrors
}

/**
 * @param {unknown} parsed
 * @returns {unknown}
 */
function unwrapData(parsed) {
  if (!isObject(parsed)) {
    return parsed
  }

  if ('data' in parsed) {
    return parsed.data
  }

  return parsed
}

/**
 * Execute one signed Apple News API request.
 *
 * @param {RequestOptions} options
 * @returns {Promise<unknown>}
 */
export async function requestSigned(options) {
  const host = options.host ?? 'news-api.apple.com'
  const fetchImpl = options.fetchImpl ?? fetch

  const url = buildRequestUrl(host, options.endpoint, options.query)
  const signed = createSignedHeaders({
    apiId: options.apiId,
    apiSecret: options.apiSecret,
    method: options.method,
    url,
    date: options.date,
    contentType: options.contentType,
    body: options.body
  })

  const response = await fetchImpl(url, {
    method: options.method,
    headers: signed.headers,
    body: options.body ?? undefined
  })

  const rawBody = await response.text()
  let parsedBody = null

  if (rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {
      parsedBody = rawBody
    }
  }

  if (!response.ok) {
    const apiErrors = getApiErrors(parsedBody)
    throw new AppleNewsApiError(
      `${options.method.toUpperCase()} ${options.endpoint} failed with status ${response.status}`,
      {
        status: response.status,
        method: options.method.toUpperCase(),
        url,
        apiErrors,
        responseBody: parsedBody
      }
    )
  }

  if (parsedBody === null) {
    return null
  }

  return unwrapData(parsedBody)
}
