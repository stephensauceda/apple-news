const CRLF = '\r\n'

/**
 * @typedef BundleFile
 * @property {Buffer|Uint8Array|string} data
 * @property {string} [mimeType]
 */

/**
 * @param {Buffer|Uint8Array|string} data
 * @returns {Buffer}
 */
function toBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return data
  }

  if (data instanceof Uint8Array) {
    return Buffer.from(data)
  }

  return Buffer.from(String(data), 'utf8')
}

/**
 * @param {string} boundary
 * @param {string} name
 * @param {Buffer} value
 * @param {string} contentType
 * @param {string} [filename]
 * @returns {Buffer}
 */
function buildPart(boundary, name, value, contentType, filename) {
  const lines = [`--${boundary}`]

  if (filename) {
    lines.push(
      `Content-Disposition: form-data; name="${name}"; filename="${filename}"`
    )
  } else {
    lines.push(`Content-Disposition: form-data; name="${name}"`)
  }

  lines.push(`Content-Type: ${contentType}`)
  lines.push('')

  return Buffer.concat([
    Buffer.from(lines.join(CRLF) + CRLF, 'utf8'),
    value,
    Buffer.from(CRLF, 'utf8')
  ])
}

/**
 * @param {Record<string, BundleFile>|undefined} bundleFiles
 */
function validateBundleFiles(bundleFiles) {
  if (!bundleFiles) {
    return
  }

  for (const name of Object.keys(bundleFiles)) {
    if (name === 'article.json' || name === 'metadata') {
      throw new TypeError(
        'bundleFiles cannot contain reserved names: article.json or metadata'
      )
    }
  }
}

/**
 * @param {{
 *  article: Record<string, unknown>,
 *  metadata?: Record<string, unknown>,
 *  bundleFiles?: Record<string, BundleFile>,
 *  boundary?: string
 * }} input
 * @returns {{ contentType: string, body: Buffer }}
 */
export function buildArticleMultipartBody(input) {
  if (!input.article || typeof input.article !== 'object') {
    throw new TypeError('article is required and must be an object')
  }

  validateBundleFiles(input.bundleFiles)

  const boundary = input.boundary ?? `apple-news-${Date.now().toString(16)}`
  const metadata = input.metadata ?? {}

  const parts = []
  parts.push(
    buildPart(
      boundary,
      'article.json',
      Buffer.from(JSON.stringify(input.article), 'utf8'),
      'application/json'
    )
  )

  parts.push(
    buildPart(
      boundary,
      'metadata',
      Buffer.from(JSON.stringify({ data: metadata }), 'utf8'),
      'application/json'
    )
  )

  if (input.bundleFiles) {
    let index = 0
    for (const [filename, file] of Object.entries(input.bundleFiles)) {
      const fieldName = `file${index}`
      index += 1
      parts.push(
        buildPart(
          boundary,
          fieldName,
          toBuffer(file.data),
          file.mimeType ?? 'application/octet-stream',
          filename
        )
      )
    }
  }

  parts.push(Buffer.from(`--${boundary}--${CRLF}`, 'utf8'))

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(parts)
  }
}
