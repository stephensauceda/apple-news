import { describe, expect, it } from 'vitest'
import { buildArticleMultipartBody } from './multipart.js'

describe('buildArticleMultipartBody', () => {
  it('includes article.json and metadata parts', () => {
    const result = buildArticleMultipartBody({
      article: { identifier: 'abc', title: 'Title' },
      metadata: { isPreview: true },
      boundary: 'test-boundary'
    })

    const text = result.body.toString('utf8')

    expect(result.contentType).toBe(
      'multipart/form-data; boundary=test-boundary'
    )
    expect(text).toContain('name="article.json"')
    expect(text).toContain('name="metadata"')
    expect(text).toContain('{"identifier":"abc","title":"Title"}')
    expect(text).toContain('{"data":{"isPreview":true}}')
  })

  it('adds bundle files as fileN parts with filenames', () => {
    const result = buildArticleMultipartBody({
      article: { identifier: 'abc' },
      bundleFiles: {
        'image.jpg': { data: Buffer.from([1, 2, 3]), mimeType: 'image/jpeg' },
        'font.otf': { data: Buffer.from([4, 5]), mimeType: 'font/otf' }
      },
      boundary: 'test-boundary'
    })

    const text = result.body.toString('utf8')

    expect(text).toContain('name="file0"; filename="image.jpg"')
    expect(text).toContain('name="file1"; filename="font.otf"')
    expect(text).toContain('Content-Type: image/jpeg')
    expect(text).toContain('Content-Type: font/otf')
  })

  it('rejects reserved bundle filenames', () => {
    expect(() =>
      buildArticleMultipartBody({
        article: { identifier: 'abc' },
        bundleFiles: {
          'article.json': { data: 'bad' }
        }
      })
    ).toThrow('reserved names')
  })

  it('requires article object', () => {
    expect(() => buildArticleMultipartBody({ article: null })).toThrow(
      'article is required'
    )
  })
})
