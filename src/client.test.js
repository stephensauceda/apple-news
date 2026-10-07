import { afterEach, suite, expect, test, vi } from 'vitest'
import { AppleNewsClient } from './client.js'

function createClientWithResponse(responseBody = { data: { ok: true } }) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(responseBody)
  }))
  vi.stubGlobal('fetch', fetchMock)

  const client = new AppleNewsClient({
    apiId: 'key-id',
    apiSecret: Buffer.from('secret').toString('base64')
  })

  return { client, fetchMock }
}

suite('AppleNewsClient', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('requires apiId and apiSecret', () => {
    expect(() => new AppleNewsClient({ apiSecret: 'x' })).toThrow(
      'apiId is required'
    )
    expect(() => new AppleNewsClient({ apiId: 'x' })).toThrow(
      'apiSecret is required'
    )
  })

  test('readChannel calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { id: 'channel' }
    })

    const result = await client.readChannel({ channelId: 'abc' })

    expect(result).toEqual({ id: 'channel' })
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/channels/abc'
    )
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  test('listSections calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: [{ id: 'sec1' }]
    })

    const result = await client.listSections({ channelId: 'abc' })

    expect(result).toEqual([{ id: 'sec1' }])
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/channels/abc/sections'
    )
  })

  test('readSection calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { id: 'sec1' }
    })

    await client.readSection({ sectionId: 'sec1' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/sections/sec1'
    )
  })

  test('readArticle calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { id: 'art1' }
    })

    await client.readArticle({ articleId: 'art1' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/articles/art1'
    )
  })

  test('deleteArticle sends DELETE request', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 204,
      text: async () => ''
    }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new AppleNewsClient({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret').toString('base64')
    })

    const result = await client.deleteArticle({ articleId: 'art1' })

    expect(result).toBeNull()
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  test('searchArticles supports channel scope', async () => {
    const responseBody = {
      articles: [{ id: 'art1' }],
      links: {
        self: '/articles?pageSize=5',
        next: '/articles?pageToken=next'
      },
      meta: 'next-page metadata'
    }
    const { client, fetchMock } = createClientWithResponse({
      ...responseBody
    })

    const result = await client.searchArticles({
      channelId: 'abc',
      pageSize: 5,
      fromDate: '2026-01-01T00:00:00Z',
      toDate: '2026-02-01T00:00:00Z',
      sortDir: 'ASC'
    })

    expect(result).toEqual(responseBody)

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/channels/abc/articles')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      pageSize: '5',
      fromDate: '2026-01-01T00:00:00Z',
      toDate: '2026-02-01T00:00:00Z',
      sortDir: 'ASC'
    })
  })

  test('searchArticles preserves pagination links and metadata', async () => {
    const response = {
      data: { articles: [{ id: 'art1' }] },
      links: {
        next: 'https://news-api.apple.com/channels/abc/articles?pageToken=next'
      },
      meta: { pageToken: 'next' }
    }
    const { client } = createClientWithResponse(response)

    const result = await client.searchArticles({ channelId: 'abc' })

    expect(result).toEqual(response)
  })

  test('searchArticles supports section scope', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: [{ id: 'art1' }]
    })

    await client.searchArticles({ sectionId: 'sec1', pageToken: 'next-page' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/sections/sec1/articles?pageToken=next-page'
    )
  })

  test('searchArticles omits absent query options and does not apply defaults', async () => {
    const { client, fetchMock } = createClientWithResponse()

    await client.searchArticles({ sectionId: 'sec1' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/sections/sec1/articles'
    )
  })

  test('searchArticles forwards future query options and uses date only for signing', async () => {
    const { client, fetchMock } = createClientWithResponse()

    await client.searchArticles({
      channelId: 'abc',
      futureFilter: 'enabled',
      date: '2026-04-03T12:00:00Z'
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://news-api.apple.com/channels/abc/articles?futureFilter=enabled'
    )
    expect(options.headers.Authorization).toContain(
      'date="2026-04-03T12:00:00Z"'
    )
  })

  test('searchArticles validates pageSize and sortDir', async () => {
    const { client, fetchMock } = createClientWithResponse()

    await expect(
      client.searchArticles({ channelId: 'abc', pageSize: 0 })
    ).rejects.toThrow('pageSize must be an integer between 1 and 100')
    await expect(
      client.searchArticles({ channelId: 'abc', pageSize: 101 })
    ).rejects.toThrow('pageSize must be an integer between 1 and 100')
    await expect(
      client.searchArticles({ channelId: 'abc', pageSize: 1.5 })
    ).rejects.toThrow('pageSize must be an integer between 1 and 100')
    await expect(
      client.searchArticles({ channelId: 'abc', sortDir: 'asc' })
    ).rejects.toThrow('sortDir must be either ASC or DESC')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('searchArticles requires exactly one scope id', async () => {
    const { client } = createClientWithResponse()

    await expect(client.searchArticles({})).rejects.toThrow(
      'requires either channelId or sectionId'
    )
    await expect(
      client.searchArticles({ channelId: '', sectionId: '' })
    ).rejects.toThrow('requires either channelId or sectionId')
    await expect(
      client.searchArticles({ channelId: 'abc', sectionId: 'sec1' })
    ).rejects.toThrow('accepts either channelId or sectionId, not both')
  })

  test('preserves host override', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { id: 'ok' } })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new AppleNewsClient({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret').toString('base64'),
      host: 'localhost:8443'
    })

    await client.readChannel({ channelId: 'abc' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://localhost:8443/channels/abc'
    )
  })

  test('createArticle posts multipart payload to channel articles endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { id: 'art1' }
    })

    const result = await client.createArticle({
      channelId: 'abc',
      article: { identifier: 'art1', title: 'Title' },
      sections: ['sec1'],
      isPreview: null,
      isSponsored: null,
      isPaid: null
    })

    expect(result).toEqual({ id: 'art1' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://news-api.apple.com/channels/abc/articles')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toContain(
      'multipart/form-data; boundary='
    )
    expect(Buffer.isBuffer(options.body)).toBe(true)

    const bodyText = options.body.toString('utf8')
    expect(bodyText).toContain(
      'Content-Disposition: form-data; name="article.json"; filename="article.json"'
    )
    expect(bodyText).toContain('name="metadata"')
    expect(bodyText).toContain('{"identifier":"art1","title":"Title"}')
    expect(bodyText).toContain(
      '{"data":{"isPreview":true,"isSponsored":false,"isPaid":false,"links":{"sections":["https://news-api.apple.com/sections/sec1"]}}}'
    )
  })

  test('updateArticle requires revision and includes it in metadata', async () => {
    const { client } = createClientWithResponse()

    await expect(
      client.updateArticle({
        articleId: 'art1',
        article: { identifier: 'art1' }
      })
    ).rejects.toThrow('revision is required')
  })

  test('updateArticle posts multipart payload to article endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { id: 'art1', revision: 'r2' }
    })

    await client.updateArticle({
      articleId: 'art1',
      revision: 'r1',
      article: { identifier: 'art1', title: 'Updated' },
      isPreview: false,
      isSponsored: false,
      isPaid: true,
      maturityRating: 'GENERAL'
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://news-api.apple.com/articles/art1')
    expect(options.method).toBe('POST')

    const bodyText = options.body.toString('utf8')
    expect(bodyText).toContain(
      'Content-Disposition: form-data; name="article.json"; filename="article.json"'
    )
    expect(bodyText).toContain('"revision":"r1"')
    expect(bodyText).toContain('"isPreview":false')
    expect(bodyText).toContain('"isSponsored":false')
    expect(bodyText).toContain('"isPaid":true')
    expect(bodyText).toContain('"maturityRating":"GENERAL"')
    expect(bodyText).not.toContain('"sections"')
  })

  test('updateArticle omits optional metadata that was not provided', async () => {
    const { client, fetchMock } = createClientWithResponse()

    await client.updateArticle({
      articleId: 'art1',
      revision: 'r1',
      article: { identifier: 'art1', title: 'Updated' }
    })

    const bodyText = fetchMock.mock.calls[0][1].body.toString('utf8')
    expect(bodyText).toContain('{"data":{"revision":"r1"}}')
    expect(bodyText).not.toContain('"isPreview"')
    expect(bodyText).not.toContain('"isSponsored"')
    expect(bodyText).not.toContain('"isPaid"')
  })

  test('createArticle and updateArticle require ids and article payloads', async () => {
    const { client } = createClientWithResponse()

    await expect(
      client.createArticle({ article: { identifier: 'art1' } })
    ).rejects.toThrow('channelId is required')
    await expect(client.createArticle({ channelId: 'abc' })).rejects.toThrow(
      'article is required'
    )
    await expect(
      client.updateArticle({ revision: 'r1', article: { identifier: 'art1' } })
    ).rejects.toThrow('articleId is required')
  })

  test('readChannelQuota calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { quota: 100 }
    })

    const result = await client.readChannelQuota({ channelId: 'abc' })

    expect(result).toEqual({ quota: 100 })
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/channels/abc/quota'
    )
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  test('readChannelQuota requires channelId', async () => {
    const { client } = createClientWithResponse()

    await expect(client.readChannelQuota({})).rejects.toThrow(
      'channelId is required'
    )
  })

  test('promoteArticles posts correct JSON body to section endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { promotedArticles: ['id1', 'id2'] }
    })

    const result = await client.promoteArticles({
      sectionId: 'sec1',
      articleIds: ['id1', 'id2']
    })

    expect(result).toEqual({ promotedArticles: ['id1', 'id2'] })

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://news-api.apple.com/sections/sec1/promotedArticles'
    )
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(opts.body)
    expect(body).toEqual({ data: { promotedArticles: ['id1', 'id2'] } })
  })

  test('promoteArticles accepts an empty array to clear promotions', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { promotedArticles: [] }
    })

    await client.promoteArticles({ sectionId: 'sec1', articleIds: [] })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ data: { promotedArticles: [] } })
  })

  test('promoteArticles requires sectionId and articleIds array', async () => {
    const { client } = createClientWithResponse()

    await expect(
      client.promoteArticles({ articleIds: ['id1'] })
    ).rejects.toThrow('sectionId is required')
    await expect(client.promoteArticles({ sectionId: 'sec1' })).rejects.toThrow(
      'articleIds is required and must be an array'
    )
  })

  test('propagates AppleNewsApiError from failed API responses', async () => {
    const { AppleNewsApiError } = await import('./errors.js')

    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 403,
      text: async () =>
        JSON.stringify({
          errors: [{ code: 'FORBIDDEN', message: 'Not allowed' }]
        })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new AppleNewsClient({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret').toString('base64')
    })

    const error = await client.readChannel({ channelId: 'abc' }).catch((e) => e)

    expect(error).toBeInstanceOf(AppleNewsApiError)
    expect(error.status).toBe(403)
    expect(error.apiErrors).toEqual([
      { code: 'FORBIDDEN', message: 'Not allowed' }
    ])
  })
})
