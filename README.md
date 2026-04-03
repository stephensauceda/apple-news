# @stephensauceda/apple-news

[![codecov](https://codecov.io/github/stephensauceda/apple-news/graph/badge.svg?token=CWIFXDRP77)](https://codecov.io/github/stephensauceda/apple-news)

Modern Node.js client for the Apple News API.

- ESM-first package
- Native fetch transport
- Promise-based API
- Apple HHMAC request signing
- Co-located Vitest test suite with high coverage thresholds

## Installation

```bash
npm install @stephensauceda/apple-news
```

## Requirements

- Node.js 22+
- Apple News API key ID and secret from Apple News Publisher

## Quick Start

```js
import { AppleNewsClient } from '@stephensauceda/apple-news'

const client = new AppleNewsClient({
  apiId: process.env.APPLE_NEWS_API_ID,
  apiSecret: process.env.APPLE_NEWS_API_SECRET
})

const channel = await client.readChannel({ channelId: 'your-channel-id' })
console.log(channel)
```

## API

The client supports the milestone-one method scope from micnews/apple-news:

- readChannel
- listSections
- readSection
- createArticle
- readArticle
- updateArticle
- deleteArticle
- searchArticles

### Constructor

```js
const client = new AppleNewsClient({
  apiId: 'your-api-key-id',
  apiSecret: 'your-base64-secret',
  host: 'news-api.apple.com' // optional
})
```

### readChannel

```js
await client.readChannel({ channelId: 'channel-id' })
```

### listSections

```js
await client.listSections({ channelId: 'channel-id' })
```

### readSection

```js
await client.readSection({ sectionId: 'section-id' })
```

### readArticle

```js
await client.readArticle({ articleId: 'article-id' })
```

### deleteArticle

```js
await client.deleteArticle({ articleId: 'article-id' })
```

### searchArticles

Provide exactly one of channelId or sectionId.

```js
await client.searchArticles({ channelId: 'channel-id', limit: 25 })
await client.searchArticles({ sectionId: 'section-id', offset: 50 })
```

### createArticle

```js
await client.createArticle({
  channelId: 'channel-id',
  article: {
    identifier: 'article-id',
    title: 'Title'
  },
  sections: ['section-id'],
  isPreview: true,
  isSponsored: false,
  maturityRating: 'GENERAL',
  bundleFiles: {
    'image.jpg': {
      data: Buffer.from([
        /* bytes */
      ]),
      mimeType: 'image/jpeg'
    }
  }
})
```

### updateArticle

revision is required.

```js
await client.updateArticle({
  articleId: 'article-id',
  revision: 'current-revision',
  article: {
    identifier: 'article-id',
    title: 'Updated title'
  },
  bundleFiles: {
    'image.jpg': {
      data: Buffer.from([
        /* bytes */
      ]),
      mimeType: 'image/jpeg'
    }
  }
})
```

## Optional Helper: Fetch Bundle Files From URLs

Core upload behavior expects buffer/file payloads for deterministic multipart signing.
If you want convenience URL downloading, use the helper:

```js
import { fetchBundleFiles } from '@stephensauceda/apple-news'

const bundleFiles = await fetchBundleFiles({
  'image.jpg': 'https://example.com/image.jpg',
  'font.otf': 'https://example.com/font.otf'
})
```

## Error Handling

Non-2xx responses throw AppleNewsApiError with:

- status
- method
- url
- apiErrors (when present in Apple response)
- responseBody

```js
import { AppleNewsApiError } from '@stephensauceda/apple-news'

try {
  await client.readChannel({ channelId: 'channel-id' })
} catch (error) {
  if (error instanceof AppleNewsApiError) {
    console.error(error.status, error.apiErrors)
  }
  throw error
}
```

## Development

```bash
npm install
npm run lint
npm run test
npm run coverage
npm run build
```
