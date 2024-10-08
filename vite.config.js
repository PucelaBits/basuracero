import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import dotenv from 'dotenv'
import { copyFileSync } from 'fs'

// Cargar las variables de entorno desde el archivo .env
dotenv.config()

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'copy-pwa-assets',
      closeBundle() {
        const publicDir = path.resolve(__dirname, 'public')
        const outDir = path.resolve(__dirname, 'dist')
        
        const filesToCopy = ['manifest.json', 'sw.js', 'favicon.png']
        
        filesToCopy.forEach(file => {
          copyFileSync(path.join(publicDir, file), path.join(outDir, file))
        })
      }
    }
  ],
  root: path.resolve(__dirname, 'src/client'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/client/index.html')
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    proxy: {
      '/api': 'http://localhost:5050',
      '/uploads': 'http://localhost:5050'
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
  },
  define: {
    'import.meta.env.VITE_CIUDAD_LAT_MIN': JSON.stringify(process.env.CIUDAD_LAT_MIN),
    'import.meta.env.VITE_CIUDAD_LAT_MAX': JSON.stringify(process.env.CIUDAD_LAT_MAX),
    'import.meta.env.VITE_CIUDAD_LON_MIN': JSON.stringify(process.env.CIUDAD_LON_MIN),
    'import.meta.env.VITE_CIUDAD_LON_MAX': JSON.stringify(process.env.CIUDAD_LON_MAX),
  }
})
