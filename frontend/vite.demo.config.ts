import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Demo: bitta mustaqil HTML fayl (JS, CSS, rasmlar ichida). Backend shart emas — src/demo/entry.ts.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2019',
    outDir: 'dist-demo',
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: 'demo.html' },
  },
})
