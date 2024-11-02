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
        
        // Copiar manifest.json y sw.js
        const baseFiles = ['manifest.json', 'sw.js']
        baseFiles.forEach(file => {
          if (fs.existsSync(path.join(publicDir, file))) {
            copyFileSync(path.join(publicDir, file), path.join(outDir, file))
          }
        })

        // Copiar favicon usando la ruta del .env
        const faviconPath = process.env.APP_FAVICON_PATH || '/img/default/favicon.png'
        const sourcePath = path.join(publicDir, faviconPath.replace(/^\//, ''))
        const targetPath = path.join(outDir, 'favicon.png')
        
        if (fs.existsSync(sourcePath)) {
          copyFileSync(sourcePath, targetPath)
        } else {
          console.warn(`Advertencia: No se encontró el favicon en ${sourcePath}`)
        }
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
    'import.meta.env.VITE_BASE_URL': JSON.stringify(process.env.BASE_URL),
    'import.meta.env.VITE_CIUDAD_LAT_MIN': JSON.stringify(process.env.CIUDAD_LAT_MIN),
    'import.meta.env.VITE_CIUDAD_LAT_MAX': JSON.stringify(process.env.CIUDAD_LAT_MAX),
    'import.meta.env.VITE_CIUDAD_LON_MIN': JSON.stringify(process.env.CIUDAD_LON_MIN),
    'import.meta.env.VITE_CIUDAD_LON_MAX': JSON.stringify(process.env.CIUDAD_LON_MAX),
    'import.meta.env.VITE_APP_NAME': JSON.stringify(process.env.APP_NAME),
    'import.meta.env.VITE_APP_SUBTITLE': JSON.stringify(process.env.APP_SUBTITLE),
    'import.meta.env.VITE_APP_DESCRIPTION': JSON.stringify(process.env.APP_DESCRIPTION),
    'import.meta.env.VITE_APP_PRIMARY_COLOR': JSON.stringify(process.env.APP_PRIMARY_COLOR),
    'import.meta.env.VITE_APP_SECONDARY_COLOR': JSON.stringify(process.env.APP_SECONDARY_COLOR),
    'import.meta.env.VITE_APP_SUCCESS_COLOR': JSON.stringify(process.env.APP_SUCCESS_COLOR),
    'import.meta.env.VITE_APP_ERROR_COLOR': JSON.stringify(process.env.APP_ERROR_COLOR),
    'import.meta.env.VITE_APP_WARNING_COLOR': JSON.stringify(process.env.APP_WARNING_COLOR),
    'import.meta.env.VITE_APP_INFO_COLOR': JSON.stringify(process.env.APP_INFO_COLOR),
    'import.meta.env.VITE_APP_BACKGROUND_COLOR': JSON.stringify(process.env.APP_BACKGROUND_COLOR),
    'import.meta.env.VITE_APP_SOCIAL_LINKS': JSON.stringify(process.env.APP_SOCIAL_LINKS),
    'import.meta.env.VITE_APP_FAVICON_PATH': JSON.stringify(process.env.APP_FAVICON_PATH),
    'import.meta.env.VITE_APP_LOGO_PATH': JSON.stringify(process.env.APP_LOGO_PATH),
  }
})
