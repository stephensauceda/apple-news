import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  buildAuthorizationHeader,
  buildCanonicalRequest,
  createSignedHeaders,
  formatAppleDate,
  signCanonicalRequest
} from '../src/auth.js'

describe('formatAppleDate', () => {
  it('drops milliseconds to match Apple date format', () => {
    const value = formatAppleDate(new Date('2026-04-03T11:22:33.444Z'))
    expect(value).toBe('2026-04-03T11:22:33Z')
  })
})

describe('buildCanonicalRequest', () => {
  it('builds canonical payload for GET requests', () => {
    const payload = buildCanonicalRequest({
      method: 'get',
      url: 'https://news-api.apple.com/channels/abc',
      date: '2026-04-03T11:22:33Z'
    })

    expect(payload.toString('utf8')).toBe('GEThttps://news-api.apple.com/channels/abc2026-04-03T11:22:33Z')
  })

  it('includes content type and body for POST requests', () => {
    const payload = buildCanonicalRequest({
      method: 'POST',
      url: 'https://news-api.apple.com/channels/abc/articles',
      date: '2026-04-03T11:22:33Z',
      contentType: 'application/json',
      body: '{"x":1}'
    })

    expect(payload.toString('utf8')).toBe('POSThttps://news-api.apple.com/channels/abc/articles2026-04-03T11:22:33Zapplication/json{"x":1}')
  })

  it('accepts Uint8Array bodies', () => {
    const payload = buildCanonicalRequest({
      method: 'POST',
      url: 'https://news-api.apple.com/channels/abc/articles',
      date: '2026-04-03T11:22:33Z',
      contentType: 'application/octet-stream',
      body: new Uint8Array([65, 66, 67])
    })

    expect(payload.toString('utf8')).toBe('POSThttps://news-api.apple.com/channels/abc/articles2026-04-03T11:22:33Zapplication/octet-streamABC')
  })
})

describe('signCanonicalRequest', () => {
  it('matches Node HMAC sha256 base64 output', () => {
    const secret = Buffer.from('top-secret').toString('base64')
    const payload = Buffer.from('canonical-payload', 'utf8')

    const expected = createHmac('sha256', Buffer.from(secret, 'base64')).update(payload).digest('base64')
    const actual = signCanonicalRequest(secret, payload)

    expect(actual).toBe(expected)
  })
})

describe('buildAuthorizationHeader', () => {
  it('returns HHMAC formatted header', () => {
    const header = buildAuthorizationHeader({
      apiId: 'my-key-id',
      signature: 'abc123',
      date: '2026-04-03T11:22:33Z'
    })

    expect(header).toBe('HHMAC; key="my-key-id"; signature="abc123"; date="2026-04-03T11:22:33Z"')
  })
})

describe('createSignedHeaders', () => {
  it('creates authorization and accept headers for GET', () => {
    const result = createSignedHeaders({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret-value').toString('base64'),
      method: 'GET',
      url: 'https://news-api.apple.com/channels/abc',
      date: '2026-04-03T11:22:33Z'
    })

    expect(result.headers.Accept).toBe('application/json')
    expect(result.headers.Authorization.startsWith('HHMAC; key="key-id"; signature="')).toBe(true)
    expect(result.headers['Content-Type']).toBeUndefined()
  })

  it('includes content type when provided', () => {
    const result = createSignedHeaders({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret-value').toString('base64'),
      method: 'POST',
      url: 'https://news-api.apple.com/channels/abc/articles',
      date: '2026-04-03T11:22:33Z',
      contentType: 'multipart/form-data; boundary=test',
      body: Buffer.from('payload')
    })

    expect(result.headers['Content-Type']).toBe('multipart/form-data; boundary=test')
    expect(result.canonicalPayload.toString('utf8')).toContain('multipart/form-data; boundary=test')
  })
})
