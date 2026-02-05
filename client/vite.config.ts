import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { ServerResponse } from 'http'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from parent directory (project root)
  const env = loadEnv(mode, resolve(__dirname, '..'), '')
  console.log('[Vite Config] USE_HTTPS:', env.USE_HTTPS || process.env.USE_HTTPS);
  console.log('[Vite Config] SERVER_PORT:', env.SERVER_PORT || process.env.SERVER_PORT);

  return {
    plugins: [
      react(),
      {
        name: 'request-logger',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            console.log(`[Vite Request] ${req.method} ${req.url}`);
            next();
          });
        }
      }
    ],
    server: {
      https: (env.USE_HTTPS === 'true' || process.env.USE_HTTPS === 'true') ? {
        key: resolve(__dirname, '../server/certs/key.pem'),
        cert: resolve(__dirname, '../server/certs/cert.pem'),
      } : undefined,
      host: env.CLIENT_HOST === '0.0.0.0' || process.env.CLIENT_HOST === '0.0.0.0' ? true : (env.CLIENT_HOST || process.env.CLIENT_HOST || true), // Use true for all interfaces
      port: parseInt(env.CLIENT_PORT || process.env.CLIENT_PORT || '5173', 10),
      strictPort: false, // Allow fallback if port is in use
      allowedHosts: ['localhost', '127.0.0.1', '48.214.144.154', 'qbrainlabs.com', 'qbitzai.com'], // Explicitly allow Public IP and domains
      cors: { origin: '*', credentials: true }, // Allow all origins for the dev server itself
      proxy: {
        '/api': {
          target: (env.USE_HTTPS === 'true' || process.env.USE_HTTPS === 'true')
            ? `https://localhost:${env.SERVER_PORT || process.env.SERVER_PORT || 8000}`
            : `http://localhost:${env.SERVER_PORT || process.env.SERVER_PORT || 8000}`,
          changeOrigin: true,
          secure: false, // Allow self-signed certs for backend
          timeout: 60000,
          proxyTimeout: 60000,
          rewrite: (path) => {
            console.log('[Proxy] Rewriting path:', path);
            return path;
          },
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              console.log('proxy error', err);
              // Prevent fallback to SPA index.html
              if (res instanceof ServerResponse && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy Error', details: err.message }));
              }
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/ws': {
          target: (env.USE_HTTPS === 'true' || process.env.USE_HTTPS === 'true')
            ? `https://127.0.0.1:${env.SERVER_PORT || process.env.SERVER_PORT || 8000}`
            : `http://127.0.0.1:${env.SERVER_PORT || process.env.SERVER_PORT || 8000}`,
          changeOrigin: true,
          secure: false, // Allow self-signed certs
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
          }
        },
      },
    },
  }
})
