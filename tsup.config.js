import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.js',
    helpers: 'src/helpers/index.js'
  },
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'node20',
  dts: false
})
