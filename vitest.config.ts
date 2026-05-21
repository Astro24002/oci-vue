import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
    globals: true,
    setupFiles: ['./src/test/setup.ts']
  }
})
