import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  root: path.resolve(__dirname, 'src/client'),
  build: {
    outDir: path.resolve(__dirname, 'dist')
  },
  server: {
    proxy: {
      '/api': process.env.NODE_ENV === 'production' ? 'http://localhost:5050' : 'http://localhost:5050',
      '/uploads': process.env.NODE_ENV === 'production' ? 'http://localhost:5050' : 'http://localhost:5050'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/client'),
      'vue': 'vue/dist/vue.esm-bundler.js'
    }
  },
  optimizeDeps: {
    include: ['vue']
  }
})