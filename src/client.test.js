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
    expect(() => new AppleNewsClient({ apiSecret: 'x' })).toThrow('apiId is required')
    expect(() => new AppleNewsClient({ apiId: 'x' })).toThrow('apiSecret is required')
  })

  it('readChannel calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({ data: { id: 'channel' } })

    const result = await client.readChannel({ channelId: 'abc' })

    expect(result).toEqual({ id: 'channel' })
    expect(fetchMock.mock.calls[0][0]).toBe('https://news-api.apple.com/channels/abc')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  it('listSections calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({ data: [{ id: 'sec1' }] })

    const result = await client.listSections({ channelId: 'abc' })

    expect(result).toEqual([{ id: 'sec1' }])
    expect(fetchMock.mock.calls[0][0]).toBe('https://news-api.apple.com/channels/abc/sections')
  })

  it('readSection calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({ data: { id: 'sec1' } })

    await client.readSection({ sectionId: 'sec1' })

    expect(fetchMock.mock.calls[0][0]).toBe('https://news-api.apple.com/sections/sec1')
  })

  it('readArticle calls correct endpoint', async () => {
    const { client, fetchMock } = createClientWithResponse({ data: { id: 'art1' } })

    await client.readArticle({ articleId: 'art1' })

    expect(fetchMock.mock.calls[0][0]).toBe('https://news-api.apple.com/articles/art1')
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
    const { client, fetchMock } = createClientWithResponse({ data: [{ id: 'art1' }] })

    await client.searchArticles({ channelId: 'abc', limit: 5 })

    expect(fetchMock.mock.calls[0][0]).toBe('https://news-api.apple.com/channels/abc/articles?limit=5')
  })

  it('searchArticles supports section scope', async () => {
    const { client, fetchMock } = createClientWithResponse({ data: [{ id: 'art1' }] })

    await client.searchArticles({ sectionId: 'sec1', offset: 10 })

    expect(fetchMock.mock.calls[0][0]).toBe('https://news-api.apple.com/sections/sec1/articles?offset=10')
  })

  it('searchArticles requires exactly one scope id', async () => {
    const { client } = createClientWithResponse()

    await expect(client.searchArticles({})).rejects.toThrow('requires either channelId or sectionId')
    await expect(client.searchArticles({ channelId: 'abc', sectionId: 'sec1' })).rejects.toThrow(
      'accepts either channelId or sectionId, not both'
    )
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

    expect(fetchMock.mock.calls[0][0]).toBe('https://localhost:8443/channels/abc')
  })

  it('createArticle and updateArticle are not implemented yet', async () => {
    const { client } = createClientWithResponse()

    await expect(client.createArticle({ channelId: 'abc' })).rejects.toThrow('not implemented yet')
    await expect(client.updateArticle({ articleId: 'art1' })).rejects.toThrow('not implemented yet')
  })
})
