import { createHmac } from 'node:crypto'

/**
 * @param {Date} date
 * @returns {string}
 */
export function formatAppleDate(date) {
  const iso = date.toISOString()
  return iso.replace(/\.\d{3}Z$/, 'Z')
}

/**
 * @param {string|Uint8Array|Buffer|undefined|null} value
 * @returns {Buffer}
 */
function toBuffer(value) {
  if (value == null) {
    return Buffer.alloc(0)
  }

  if (Buffer.isBuffer(value)) {
    return value
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value)
  }

  return Buffer.from(String(value), 'utf8')
}

/**
 * @typedef BuildCanonicalRequestInput
 * @property {string} method
 * @property {string} url
 * @property {string} date
 * @property {string} [contentType]
 * @property {string|Uint8Array|Buffer|undefined|null} [body]
 */

/**
 * Build canonical payload for Apple HHMAC signing.
 *
 * @param {BuildCanonicalRequestInput} input
 * @returns {Buffer}
 */
export function buildCanonicalRequest(input) {
  const method = input.method.toUpperCase()
  const contentType = input.contentType ?? ''
  const prefix = `${method}${input.url}${input.date}${contentType}`
  const prefixBuffer = Buffer.from(prefix, 'utf8')
  const bodyBuffer = toBuffer(input.body)

  if (bodyBuffer.length === 0) {
    return prefixBuffer
  }

  return Buffer.concat([prefixBuffer, bodyBuffer])
}

/**
 * @param {string} apiSecret Base64 encoded Apple News API secret
 * @param {Buffer} canonicalPayload
 * @returns {string}
 */
export function signCanonicalRequest(apiSecret, canonicalPayload) {
  const key = Buffer.from(apiSecret, 'base64')

  return createHmac('sha256', key).update(canonicalPayload).digest('base64')
}

/**
 * @param {{ apiId: string, signature: string, date: string }} input
 * @returns {string}
 */
export function buildAuthorizationHeader(input) {
  return `HHMAC; key="${input.apiId}"; signature="${input.signature}"; date="${input.date}"`
}

/**
 * @typedef CreateSignedHeadersInput
 * @property {string} apiId
 * @property {string} apiSecret
 * @property {string} method
 * @property {string} url
 * @property {string|Date} [date]
 * @property {string} [contentType]
 * @property {string|Uint8Array|Buffer|undefined|null} [body]
 */

/**
 * @param {CreateSignedHeadersInput} input
 * @returns {{ headers: Record<string, string>, date: string, signature: string, canonicalPayload: Buffer }}
 */
export function createSignedHeaders(input) {
  const date =
    typeof input.date === 'string'
      ? input.date
      : formatAppleDate(input.date ?? new Date())
  const contentType = input.contentType ?? ''

  const canonicalPayload = buildCanonicalRequest({
    method: input.method,
    url: input.url,
    date,
    contentType,
    body: input.body
  })

  const signature = signCanonicalRequest(input.apiSecret, canonicalPayload)
  const authorization = buildAuthorizationHeader({
    apiId: input.apiId,
    signature,
    date
  })

  const headers = {
    Accept: 'application/json',
    Authorization: authorization
  }

  if (contentType) {
    headers['Content-Type'] = contentType
  }

  return {
    headers,
    date,
    signature,
    canonicalPayload
  }
}
