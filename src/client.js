import { requestSigned } from './request.js'

/**
 * @typedef AppleNewsClientConfig
 * @property {string} apiId
 * @property {string} apiSecret
 * @property {string} [host]
 * @property {typeof fetch} [fetchImpl]
 */

function assertRequired(value, name) {
  if (!value || typeof value !== 'string') {
    throw new TypeError(`${name} is required and must be a non-empty string`)
  }
}

function assertId(value, name) {
  if (!value || typeof value !== 'string') {
    throw new TypeError(`${name} is required and must be a non-empty string`)
  }
}

/**
 * @param {Record<string, unknown>|undefined} options
 * @returns {{ date?: string|Date }}
 */
function getSharedOptions(options) {
  return {
    date: options?.date
  }
}

export class AppleNewsClient {
  /**
   * @param {AppleNewsClientConfig} config
   */
  constructor(config) {
    assertRequired(config?.apiId, 'apiId')
    assertRequired(config?.apiSecret, 'apiSecret')

    this.apiId = config.apiId
    this.apiSecret = config.apiSecret
    this.host = config.host ?? 'news-api.apple.com'
    this.fetchImpl = config.fetchImpl
  }

  /**
   * @param {{ channelId: string, date?: string|Date }} options
   */
  async readChannel(options) {
    assertId(options?.channelId, 'channelId')
    return this.#request('GET', `/channels/${options.channelId}`, getSharedOptions(options))
  }

  /**
   * @param {{ channelId: string, date?: string|Date }} options
   */
  async listSections(options) {
    assertId(options?.channelId, 'channelId')
    return this.#request('GET', `/channels/${options.channelId}/sections`, getSharedOptions(options))
  }

  /**
   * @param {{ sectionId: string, date?: string|Date }} options
   */
  async readSection(options) {
    assertId(options?.sectionId, 'sectionId')
    return this.#request('GET', `/sections/${options.sectionId}`, getSharedOptions(options))
  }

  /**
   * @param {{ articleId: string, date?: string|Date }} options
   */
  async readArticle(options) {
    assertId(options?.articleId, 'articleId')
    return this.#request('GET', `/articles/${options.articleId}`, getSharedOptions(options))
  }

  /**
   * @param {{ articleId: string, date?: string|Date }} options
   */
  async deleteArticle(options) {
    assertId(options?.articleId, 'articleId')
    return this.#request('DELETE', `/articles/${options.articleId}`, getSharedOptions(options))
  }

  /**
   * @param {{ channelId?: string, sectionId?: string, date?: string|Date, [key: string]: unknown }} options
   */
  async searchArticles(options) {
    const hasChannelId = typeof options?.channelId === 'string' && options.channelId.length > 0
    const hasSectionId = typeof options?.sectionId === 'string' && options.sectionId.length > 0

    if (!hasChannelId && !hasSectionId) {
      throw new TypeError('searchArticles requires either channelId or sectionId')
    }

    if (hasChannelId && hasSectionId) {
      throw new TypeError('searchArticles accepts either channelId or sectionId, not both')
    }

    const endpoint = hasChannelId
      ? `/channels/${options.channelId}/articles`
      : `/sections/${options.sectionId}/articles`

    const query = { ...options }
    const date = query.date
    delete query.channelId
    delete query.sectionId
    delete query.date

    return this.#request('GET', endpoint, {
      date,
      query
    })
  }

  /**
   * @param {{ channelId: string }} _options
   */
  async createArticle(options) {
    void options
    throw new Error('createArticle is not implemented yet')
  }

  /**
   * @param {{ articleId: string }} _options
   */
  async updateArticle(options) {
    void options
    throw new Error('updateArticle is not implemented yet')
  }

  /**
   * @param {string} method
   * @param {string} endpoint
   * @param {{ date?: string|Date, query?: Record<string, string|number|boolean|undefined>, contentType?: string, body?: string|Buffer|Uint8Array|null }} [options]
   */
  async #request(method, endpoint, options = {}) {
    return requestSigned({
      apiId: this.apiId,
      apiSecret: this.apiSecret,
      host: this.host,
      fetchImpl: this.fetchImpl,
      method,
      endpoint,
      date: options.date,
      query: options.query,
      contentType: options.contentType,
      body: options.body
    })
  }
}
