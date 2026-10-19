import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    base: './',

    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },

    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },

    // Only keep if you really need it
    // define: {
    //   global: 'window',
    // },

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,

      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },

      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL_LOCAL,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      outDir: 'dist',
      assetsDir: 'static',
      emptyOutDir: true,

      rollupOptions: {
        output: {
          // Use hashed filenames for cache busting
          entryFileNames: 'static/[name]-[hash].js',
          chunkFileNames: 'static/[name]-[hash].js',
          assetFileNames: 'static/[name]-[hash].[ext]',
          // If you need to separate CSS, you can keep a custom function
          // but still use [hash] to ensure uniqueness
        },
      },
    },

    preview: {
      host: '0.0.0.0',
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