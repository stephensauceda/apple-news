/**
 * live-api dry-run
 *
 * What it does:
 *   Calls readChannel and readChannelQuota against the live Apple News API
 *   using real credentials to validate end-to-end signing and transport.
 *
 * When to use:
 *   Before publishing a new version, or after changes to auth/request modules.
 *
 * How to run:
 *   APPLE_NEWS_API_ID=<key-id> \
 *   APPLE_NEWS_API_SECRET=<base64-secret> \
 *   APPLE_NEWS_CHANNEL_ID=<channel-uuid> \
 *   node local/scripts/dry-run.mjs
 *
 * Required environment variables:
 *   APPLE_NEWS_API_ID      — Your Apple News API key ID
 *   APPLE_NEWS_API_SECRET  — Your Apple News API secret (base64-encoded)
 *   APPLE_NEWS_CHANNEL_ID  — The UUID of the channel to read
 */

import { AppleNewsClient } from '../../src/index.js'

const { APPLE_NEWS_API_ID, APPLE_NEWS_API_SECRET, APPLE_NEWS_CHANNEL_ID } =
  process.env

if (!APPLE_NEWS_API_ID || !APPLE_NEWS_API_SECRET || !APPLE_NEWS_CHANNEL_ID) {
  console.error(
    'Error: APPLE_NEWS_API_ID, APPLE_NEWS_API_SECRET, and APPLE_NEWS_CHANNEL_ID must be set'
  )
  process.exit(1)
}

const client = new AppleNewsClient({
  apiId: APPLE_NEWS_API_ID,
  apiSecret: APPLE_NEWS_API_SECRET
})

console.log('Running dry-run against live Apple News API...\n')

try {
  console.log('→ readChannel')
  const channel = await client.readChannel({ channelId: APPLE_NEWS_CHANNEL_ID })
  console.log('  id:      ', channel.id)
  console.log('  name:    ', channel.name)
  console.log('  website: ', channel.website)
  console.log()

  console.log('→ readChannelQuota')
  const quota = await client.readChannelQuota({
    channelId: APPLE_NEWS_CHANNEL_ID
  })
  console.log('  quota:    ', JSON.stringify(quota))
  console.log()

  console.log(
    '✓ Dry-run complete — signing and transport are working correctly'
  )
} catch (err) {
  console.error('✗ Dry-run failed:', err.message)
  if (err.status) console.error('  HTTP status:', err.status)
  if (err.apiErrors?.length)
    console.error('  API errors: ', JSON.stringify(err.apiErrors, null, 2))
  process.exit(1)
}
