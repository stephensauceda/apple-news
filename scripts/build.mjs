import { mkdir } from 'node:fs/promises'
import { build } from 'esbuild'

await mkdir('dist', { recursive: true })

await build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  legalComments: 'none'
})

await build({
  entryPoints: ['src/helpers/index.js'],
  outfile: 'dist/helpers.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  legalComments: 'none'
})
