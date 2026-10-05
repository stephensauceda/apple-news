import { requestSigned } from './request.js'
import { buildArticleMultipartBody } from './multipart.js'

/**
 * @typedef AppleNewsClientConfig
 * @property {string} apiId
 * @property {string} apiSecret
 * @property {string} [host]
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
 * @typedef {Object} ArticleBundleFile
 * @property {Buffer|Uint8Array|string} data
 * @property {string} [mimeType]
 */

/**
 * @param {Object} options
 * @param {boolean} [options.isPreview=true]
 * @param {boolean} [options.isSponsored=false]
 * @param {boolean} [options.isPaid=false]
 * @param {string[]} [options.sections]
 * @param {'KIDS'|'MATURE'|'GENERAL'} [options.maturityRating]
 * @param {string} [options.revision]
 * @param {string} host
 * @param {boolean} includeRevision
 */
function buildMetadata(options, host, includeRevision = false) {
  const metadata = includeRevision
    ? {}
    : {
        isPreview: options.isPreview ?? true,
        isSponsored: options.isSponsored ?? false,
        isPaid: options.isPaid ?? false
      }

  if (includeRevision) {
    if (options.isPreview !== undefined) {
      metadata.isPreview = options.isPreview
    }

    if (options.isSponsored !== undefined) {
      metadata.isSponsored = options.isSponsored
    }

    if (options.isPaid !== undefined) {
      metadata.isPaid = options.isPaid
    }
  }

  if (options.sections !== undefined) {
    metadata.links = {
      sections: options.sections.map(
        (sectionId) =>
          `https://${host}/sections/${encodeURIComponent(sectionId)}`
      )
    }
  }

  if (options.maturityRating !== undefined) {
    metadata.maturityRating = options.maturityRating
  }

  if (includeRevision) {
    metadata.revision = options.revision
  }

  return metadata
}

/**
 * @typedef {Object} SharedOptions
 * @property {string|Date} [date]
 */

/**
 * @param {Record<string, unknown>|undefined} options
 * @returns {SharedOptions}
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
  }

  /**
   * @param {Object} options
   * @param {string} options.channelId
   * @param {string|Date} [options.date]
   */
  async readChannel(options) {
    assertId(options?.channelId, 'channelId')
    return this.#request(
      'GET',
      `/channels/${options.channelId}`,
      getSharedOptions(options)
    )
  }

  /**
   * @param {Object} options
   * @param {string} options.channelId
   * @param {string|Date} [options.date]
   */
  async listSections(options) {
    assertId(options?.channelId, 'channelId')
    return this.#request(
      'GET',
      `/channels/${options.channelId}/sections`,
      getSharedOptions(options)
    )
  }

  /**
   * @param {Object} options
   * @param {string} options.sectionId
   * @param {string|Date} [options.date]
   */
  async readSection(options) {
    assertId(options?.sectionId, 'sectionId')
    return this.#request(
      'GET',
      `/sections/${options.sectionId}`,
      getSharedOptions(options)
    )
  }

  /**
   * @param {Object} options
   * @param {string} options.articleId
   * @param {string|Date} [options.date]
   */
  async readArticle(options) {
    assertId(options?.articleId, 'articleId')
    return this.#request(
      'GET',
      `/articles/${options.articleId}`,
      getSharedOptions(options)
    )
  }

  /**
   * @param {Object} options
   * @param {string} options.articleId
   * @param {string|Date} [options.date]
   */
  async deleteArticle(options) {
    assertId(options?.articleId, 'articleId')
    return this.#request(
      'DELETE',
      `/articles/${options.articleId}`,
      getSharedOptions(options)
    )
  }

  /**
   * @param {Record<string, unknown>} options
   * @param {string} [options.channelId]
   * @param {string} [options.sectionId]
   * @param {number} [options.pageSize] An integer from 1 to 100
   * @param {string} [options.pageToken] Opaque token from a previous response
   * @param {string} [options.fromDate] ISO 8601 lower bound
   * @param {string} [options.toDate] ISO 8601 upper bound
   * @param {'ASC'|'DESC'} [options.sortDir]
   * @param {string|Date} [options.date] HHMAC signing timestamp, not a filter
   * @returns {Promise<Record<string, unknown>>} Search data, including metadata
   */
  async searchArticles(options) {
    if (!options?.channelId && !options?.sectionId) {
      throw new TypeError(
        'searchArticles requires either channelId or sectionId'
      )
    }

    if (options.channelId && options.sectionId) {
      throw new TypeError(
        'searchArticles accepts either channelId or sectionId, not both'
      )
    }

    if (
      options.pageSize !== undefined &&
      (!Number.isInteger(options.pageSize) ||
        options.pageSize < 1 ||
        options.pageSize > 100)
    ) {
      throw new TypeError('pageSize must be an integer between 1 and 100')
    }

    if (
      options.sortDir !== undefined &&
      options.sortDir !== 'ASC' &&
      options.sortDir !== 'DESC'
    ) {
      throw new TypeError('sortDir must be either ASC or DESC')
    }

    const endpoint = options.channelId
      ? `/channels/${options.channelId}/articles`
      : `/sections/${options.sectionId}/articles`

    const query = { ...options }
    const date = query.date
    delete query.channelId
    delete query.sectionId
    delete query.date

    return this.#request('GET', endpoint, {
      date,
      query,
      returnFullResponse: true
    })
  }

  /**
   * @param {Object} options
   * @param {string} options.channelId
   * @param {Record<string, unknown>} options.article
   * @param {Record<string, ArticleBundleFile>} [options.bundleFiles]
   * @param {boolean} [options.isPreview=true]
   * @param {boolean} [options.isSponsored=false]
   * @param {boolean} [options.isPaid=false]
   * @param {string[]} [options.sections]
   * @param {'KIDS'|'MATURE'|'GENERAL'} [options.maturityRating]
   * @param {string|Date} [options.date]
   */
  async createArticle(options) {
    assertId(options?.channelId, 'channelId')

    const multipart = buildArticleMultipartBody({
      article: options.article,
      metadata: buildMetadata(options, this.host),
      bundleFiles: options.bundleFiles
    })

    return this.#request('POST', `/channels/${options.channelId}/articles`, {
      date: options.date,
      contentType: multipart.contentType,
      body: multipart.body
    })
  }

  /**
   * @param {Object} options
   * @param {string} options.articleId
   * @param {string} options.revision
   * @param {Record<string, unknown>} options.article
   * @param {Record<string, ArticleBundleFile>} [options.bundleFiles]
   * @param {boolean} [options.isPreview]
   * @param {boolean} [options.isSponsored]
   * @param {boolean} [options.isPaid]
   * @param {string[]} [options.sections]
   * @param {'KIDS'|'MATURE'|'GENERAL'} [options.maturityRating]
   * @param {string|Date} [options.date]
   */
  async updateArticle(options) {
    assertId(options?.articleId, 'articleId')
    assertId(options?.revision, 'revision')

    const multipart = buildArticleMultipartBody({
      article: options.article,
      metadata: buildMetadata(options, this.host, true),
      bundleFiles: options.bundleFiles
    })

    return this.#request('POST', `/articles/${options.articleId}`, {
      date: options.date,
      contentType: multipart.contentType,
      body: multipart.body
    })
  }

  /**
   * @param {Object} options
   * @param {string} options.channelId
   * @param {string|Date} [options.date]
   */
  async readChannelQuota(options) {
    assertId(options?.channelId, 'channelId')
    return this.#request(
      'GET',
      `/channels/${options.channelId}/quota`,
      getSharedOptions(options)
    )
  }

  /**
   * @param {Object} options
   * @param {string} options.sectionId
   * @param {string[]} options.articleIds
   * @param {string|Date} [options.date]
   */
  async promoteArticles(options) {
    assertId(options?.sectionId, 'sectionId')

    if (!Array.isArray(options?.articleIds)) {
      throw new TypeError('articleIds is required and must be an array')
    }

    const body = JSON.stringify({
      data: { promotedArticles: options.articleIds }
    })

    return this.#request(
      'POST',
      `/sections/${options.sectionId}/promotedArticles`,
      {
        date: options.date,
        contentType: 'application/json',
        body
      }
    )
  }

  /**
   * @param {string} method
   * @param {string} endpoint
   * @param {Object} [options={}]
   * @param {string|Date} [options.date]
   * @param {Record<string, string|number|boolean|undefined>} [options.query]
   * @param {string} [options.contentType]
   * @param {string|Buffer|Uint8Array|null} [options.body]
   * @param {boolean} [options.returnFullResponse]
   */
  async #request(method, endpoint, options = {}) {
    return requestSigned({
      apiId: this.apiId,
      apiSecret: this.apiSecret,
      host: this.host,
      method,
      endpoint,
      date: options.date,
      query: options.query,
      contentType: options.contentType,
      body: options.body,
      returnFullResponse: options.returnFullResponse
    })
  }
}
