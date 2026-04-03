/**
 * @typedef BundleFetchResult
 * @property {Buffer} data
 * @property {string} mimeType
 */

/**
 * @param {Record<string, string>} urlMap
 * @param {{ fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<Record<string, BundleFetchResult>>}
 */
export async function fetchBundleFiles(urlMap, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const result = {}

  for (const [filename, url] of Object.entries(urlMap)) {
    const response = await fetchImpl(url)

    if (!response.ok) {
      throw new Error(
        `Failed to fetch bundle file ${filename} from ${url}: ${response.status}`
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const data = Buffer.from(arrayBuffer)
    const mimeType =
      response.headers.get('content-type') ?? 'application/octet-stream'

    result[filename] = {
      data,
      mimeType
    }
  }

  return result
}
