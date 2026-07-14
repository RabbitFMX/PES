import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Never run compiled output: Vitest 4 dropped dist from its defaults, so
    // a stray `npm run build` would otherwise make it pick up dist/**/*.test.js.
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
})
