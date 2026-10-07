import { afterEach, suite, expect, test, vi } from 'vitest'
import { createSignedHeaders } from './auth.js'
import {
  AppleNewsApiError,
  AppleNewsAuthError,
  AppleNewsBadRequestError,
  AppleNewsConflictError,
  AppleNewsNotFoundError,
  AppleNewsRateLimitError,
  AppleNewsServiceError
} from './errors.js'
import { buildRequestUrl, requestSigned } from './request.js'
import * as packageExports from './index.js'

function createJsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  }
}

afterEach(() => vi.unstubAllGlobals())

suite('buildRequestUrl', () => {
  test('builds a URL with query string values', () => {
    const url = buildRequestUrl(
      'news-api.apple.com',
      '/channels/abc/articles',
      {
        limit: 10,
        includeDeleted: false,
        cursor: undefined
      }
    )

    expect(url).toBe(
      'https://news-api.apple.com/channels/abc/articles?limit=10&includeDeleted=false'
    )
  })
})

suite('requestSigned', () => {
  test('sends a signed request and unwraps data payload', async () => {
    const fetchMock = vi.fn(async () =>
      createJsonResponse(200, { data: { id: '123' } })
    )
    vi.stubGlobal('fetch', fetchMock)
    const apiSecret = Buffer.from('secret-value').toString('base64')

    const result = await requestSigned({
      apiId: 'key-id',
      apiSecret,
      method: 'GET',
      endpoint: '/channels/abc',
      date: '2026-04-03T11:22:33Z'
    })

    expect(result).toEqual({ id: '123' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [calledUrl, calledOptions] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe('https://news-api.apple.com/channels/abc')
    expect(calledOptions.method).toBe('GET')
    expect(calledOptions.headers.Accept).toBe('application/json')
    expect(calledOptions.headers.Authorization).toContain(
      'HHMAC; key="key-id"; signature="'
    )
  })

  test('returns null for successful empty responses', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 204,
      text: async () => ''
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await requestSigned({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret-value').toString('base64'),
      method: 'DELETE',
      endpoint: '/articles/abc',
      date: '2026-04-03T11:22:33Z'
    })

    expect(result).toBeNull()
  })

  test('uses full URL including query in signing', async () => {
    const fetchMock = vi.fn(async () => createJsonResponse(200, { data: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const apiSecret = Buffer.from('secret-value').toString('base64')

    await requestSigned({
      apiId: 'key-id',
      apiSecret,
      method: 'GET',
      endpoint: '/channels/abc/articles',
      query: { limit: 5 },
      date: '2026-04-03T11:22:33Z'
    })

    const expected = createSignedHeaders({
      apiId: 'key-id',
      apiSecret,
      method: 'GET',
      url: 'https://news-api.apple.com/channels/abc/articles?limit=5',
      date: '2026-04-03T11:22:33Z'
    })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.Authorization).toBe(expected.headers.Authorization)
  })

  test.each([
    [400, AppleNewsBadRequestError],
    [401, AppleNewsAuthError],
    [403, AppleNewsAuthError],
    [404, AppleNewsNotFoundError],
    [409, AppleNewsConflictError],
    [429, AppleNewsRateLimitError],
    [500, AppleNewsServiceError],
    [599, AppleNewsServiceError],
    [418, AppleNewsApiError]
  ])('classifies status %i as %s', async (status, ErrorClass) => {
    const responseBody = {
      errors: [
        {
          code: 'API_ERROR',
          message: 'Sensitive response message',
          keyPath: 'article.title',
          value: 'Sensitive value'
        },
        {
          code: 'SECOND_ERROR',
          message: 'Another response message',
          keyPath: 'article.body',
          value: 'Another sensitive value'
        }
      ]
    }
    const fetchMock = vi.fn(async () =>
      createJsonResponse(status, responseBody)
    )
    vi.stubGlobal('fetch', fetchMock)

    const error = await requestSigned({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret-value').toString('base64'),
      method: 'GET',
      endpoint: '/channels/abc',
      date: '2026-04-03T11:22:33Z'
    }).catch((caughtError) => caughtError)

    expect(error).toBeInstanceOf(ErrorClass)
    expect(error).toBeInstanceOf(AppleNewsApiError)
    expect(error.name).toBe(ErrorClass.name)
    expect(error.status).toBe(status)
    expect(error.apiErrors).toEqual(responseBody.errors)
    expect(error.responseBody).toEqual(responseBody)
    expect(error.message).toBe(
      `GET /channels/abc failed with status ${status}: API_ERROR`
    )
  })

  test.each([42, '   '])(
    'omits a missing or invalid API error code from the message',
    async (code) => {
      const fetchMock = vi.fn(async () =>
        createJsonResponse(400, {
          errors: [
            {
              code,
              message: 'Sensitive response message',
              keyPath: 'article.title',
              value: 'Sensitive value'
            }
          ]
        })
      )
      vi.stubGlobal('fetch', fetchMock)

      const error = await requestSigned({
        apiId: 'key-id',
        apiSecret: Buffer.from('secret-value').toString('base64'),
        method: 'POST',
        endpoint: '/articles',
        date: '2026-04-03T11:22:33Z'
      }).catch((caughtError) => caughtError)

      expect(error.message).toBe('POST /articles failed with status 400')
      expect(error.message).not.toContain('Sensitive')
      expect(error.message).not.toContain('article.title')
    }
  )

  test('exports categorized errors from the package entry point', () => {
    expect(packageExports.AppleNewsBadRequestError).toBe(
      AppleNewsBadRequestError
    )
    expect(packageExports).not.toHaveProperty('AppleNewsValidationError')
    expect(packageExports.AppleNewsAuthError).toBe(AppleNewsAuthError)
    expect(packageExports.AppleNewsNotFoundError).toBe(AppleNewsNotFoundError)
    expect(packageExports.AppleNewsConflictError).toBe(AppleNewsConflictError)
    expect(packageExports.AppleNewsRateLimitError).toBe(AppleNewsRateLimitError)
    expect(packageExports.AppleNewsServiceError).toBe(AppleNewsServiceError)
  })

  test('passes content type and body for POST requests', async () => {
    const fetchMock = vi.fn(async () =>
      createJsonResponse(200, { data: { ok: true } })
    )
    vi.stubGlobal('fetch', fetchMock)
    const body = JSON.stringify({ headline: 'hello' })

    await requestSigned({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret-value').toString('base64'),
      method: 'POST',
      endpoint: '/channels/abc/articles',
      date: '2026-04-03T11:22:33Z',
      contentType: 'application/json',
      body
    })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.body).toBe(body)
  })

  test('exports an error class suitable for instanceof checks', () => {
    const error = new AppleNewsApiError('test', {
      status: 400,
      method: 'GET',
      url: 'https://news-api.apple.com/channels/abc'
    })

    expect(error instanceof AppleNewsApiError).toBe(true)
  })

  test('handles non-JSON error response body gracefully', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => '<html>Service Unavailable</html>'
    }))
    vi.stubGlobal('fetch', fetchMock)

    const error = await requestSigned({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret-value').toString('base64'),
      method: 'GET',
      endpoint: '/channels/abc',
      date: '2026-04-03T11:22:33Z'
    }).catch((e) => e)

    expect(error).toBeInstanceOf(AppleNewsApiError)
    expect(error.status).toBe(503)
    expect(error.responseBody).toBe('<html>Service Unavailable</html>')
    expect(error.apiErrors).toBeUndefined()
  })

  test('returns object as-is when response has no data wrapper', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ throttling: { quota: 5 } })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await requestSigned({
      apiId: 'key-id',
      apiSecret: Buffer.from('secret-value').toString('base64'),
      method: 'GET',
      endpoint: '/channels/abc/quota',
      date: '2026-04-03T11:22:33Z'
    })

    expect(result).toEqual({ throttling: { quota: 5 } })
  })
})
