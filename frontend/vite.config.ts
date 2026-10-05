import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/contractor/',
  resolve: {
    alias: {
      'svelte-routing-raw': path.resolve(__dirname, 'node_modules/svelte-routing/src/index.js'),
      'svelte-routing': path.resolve(__dirname, 'src/lib/router.ts')
    }
  },
  plugins: [svelte()],
  build: {
    sourcemap: false
  },
  preview: {
    port: 5173,
    strictPort: true
  }
})
