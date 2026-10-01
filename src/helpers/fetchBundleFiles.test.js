import { afterEach, suite, expect, test, vi } from 'vitest'
import { fetchBundleFiles } from './fetchBundleFiles.js'

suite('fetchBundleFiles', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('downloads files and returns buffer + mimeType map', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
      headers: {
        get: () => 'image/jpeg'
      }
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchBundleFiles({
      'image.jpg': 'https://example.com/image.jpg'
    })

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/image.jpg')
    expect(result['image.jpg'].data.equals(Buffer.from([1, 2, 3]))).toBe(true)
    expect(result['image.jpg'].mimeType).toBe('image/jpeg')
  })

  test('falls back to octet-stream when content-type is missing', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => Uint8Array.from([1]).buffer,
      headers: {
        get: () => null
      }
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchBundleFiles({
      'blob.bin': 'https://example.com/blob.bin'
    })

    expect(result['blob.bin'].mimeType).toBe('application/octet-stream')
  })

  test('throws when a remote fetch fails', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0),
      headers: {
        get: () => null
      }
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchBundleFiles({
        'missing.jpg': 'https://example.com/missing.jpg'
      })
    ).rejects.toThrow('Failed to fetch bundle file')
  })
})
