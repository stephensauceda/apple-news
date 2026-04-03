import { describe, expect, it, vi } from 'vitest'
import { AppleNewsClient } from './client.js'

function createClientWithResponse(responseBody = { data: { ok: true } }) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(responseBody)
  }))

  const client = new AppleNewsClient({
    apiId: 'key-id',
    apiSecret: Buffer.from('secret').toString('base64'),
    fetchImpl: fetchMock
  })

  return { client, fetchMock }
}

describe('AppleNewsClient', () => {
  it('requires apiId and apiSecret', () => {
    expect(() => new AppleNewsClient({ apiSecret: 'x' })).toThrow(
      'apiId is required'
    )
    expect(() => new AppleNewsClient({ apiId: 'x' })).toThrow(
      'apiSecret is required'
    )
  })

  it('readChannel calls correct endpoint', async () => {
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

  it('listSections calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: [{ id: 'sec1' }]
    })

    const result = await client.listSections({ channelId: 'abc' })

    expect(result).toEqual([{ id: 'sec1' }])
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/channels/abc/sections'
    )
  })

  it('readSection calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { id: 'sec1' }
    })

    await client.readSection({ sectionId: 'sec1' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/sections/sec1'
    )
  })

  it('readArticle calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { id: 'art1' }
    })

    await client.readArticle({ articleId: 'art1' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/articles/art1'
    )
  })

  it('deleteArticle sends DELETE request', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 204,
      text: async () => ''
    }))
    const client = new AppleNewsClient({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret').toString('base64'),
      fetchImpl: fetchMock
    })

    const result = await client.deleteArticle({ articleId: 'art1' })

    expect(result).toBeNull()
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('searchArticles supports channel scope', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: [{ id: 'art1' }]
    })

    await client.searchArticles({ channelId: 'abc', limit: 5 })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/channels/abc/articles?limit=5'
    )
  })

  it('searchArticles supports section scope', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: [{ id: 'art1' }]
    })

    await client.searchArticles({ sectionId: 'sec1', offset: 10 })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://news-api.apple.com/sections/sec1/articles?offset=10'
    )
  })

  it('searchArticles requires exactly one scope id', async () => {
    const { client } = createClientWithResponse()

    await expect(client.searchArticles({})).rejects.toThrow(
      'requires either channelId or sectionId'
    )
    await expect(
      client.searchArticles({ channelId: 'abc', sectionId: 'sec1' })
    ).rejects.toThrow('accepts either channelId or sectionId, not both')
  })

  it('preserves host override', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { id: 'ok' } })
    }))

    const client = new AppleNewsClient({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret').toString('base64'),
      host: 'localhost:8443',
      fetchImpl: fetchMock
    })

    await client.readChannel({ channelId: 'abc' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://localhost:8443/channels/abc'
    )
  })

  it('createArticle posts multipart payload to channel articles endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { id: 'art1' }
    })

    const result = await client.createArticle({
      channelId: 'abc',
      article: { identifier: 'art1', title: 'Title' },
      sections: ['sec1']
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
    expect(bodyText).toContain('name="article.json"')
    expect(bodyText).toContain('name="metadata"')
    expect(bodyText).toContain('{"identifier":"art1","title":"Title"}')
    expect(bodyText).toContain(
      '{"data":{"isPreview":true,"isSponsored":false,"sections":["sec1"]}}'
    )
  })

  it('updateArticle requires revision and includes it in metadata', async () => {
    const { client } = createClientWithResponse()

    await expect(
      client.updateArticle({
        articleId: 'art1',
        article: { identifier: 'art1' }
      })
    ).rejects.toThrow('revision is required')
  })

  it('updateArticle posts multipart payload to article endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { id: 'art1', revision: 'r2' }
    })

    await client.updateArticle({
      articleId: 'art1',
      revision: 'r1',
      article: { identifier: 'art1', title: 'Updated' },
      maturityRating: 'GENERAL'
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://news-api.apple.com/articles/art1')
    expect(options.method).toBe('POST')

    const bodyText = options.body.toString('utf8')
    expect(bodyText).toContain('"revision":"r1"')
    expect(bodyText).toContain('"maturityRating":"GENERAL"')
  })

  it('createArticle and updateArticle require ids and article payloads', async () => {
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

  it('readChannelQuota calls correct endpoint', async () => {
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

  it('readChannelQuota requires channelId', async () => {
    const { client } = createClientWithResponse()

    await expect(client.readChannelQuota({})).rejects.toThrow(
      'channelId is required'
    )
  })

  it('promoteArticles posts correct JSON body to section endpoint', async () => {
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

  it('promoteArticles accepts an empty array to clear promotions', async () => {
    const { client, fetchMock } = createClientWithResponse({
      data: { promotedArticles: [] }
    })

    await client.promoteArticles({ sectionId: 'sec1', articleIds: [] })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ data: { promotedArticles: [] } })
  })

  it('promoteArticles requires sectionId and articleIds array', async () => {
    const { client } = createClientWithResponse()

    await expect(
      client.promoteArticles({ articleIds: ['id1'] })
    ).rejects.toThrow('sectionId is required')
    await expect(
      client.promoteArticles({ sectionId: 'sec1' })
    ).rejects.toThrow('articleIds is required and must be an array')
  })
})

