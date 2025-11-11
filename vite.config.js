import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: "./",
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    define: {
      global: 'window',
    },

    // ✅ DEV SERVER FIX
    server: {
      host: true, // Allow access from LAN
      port: 5173, // or your preferred dev port
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL_LOCAL, // from .env
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api'), // keep /api prefix
        },
      },
    },

    // ✅ BUILD FIX
    build: {
      outDir: 'dist',
      assetsDir: 'static',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },

    // ✅ PREVIEW FIX
    preview: {
      host: true,
      port: 4173,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL_LOCAL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
