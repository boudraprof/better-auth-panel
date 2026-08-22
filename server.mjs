/**
 * Production HTTP server for the admin panel.
 *
 * Serves the built client assets from dist/client and forwards everything
 * else (SSR pages, /api/v1*, /_server/*) to the TanStack Start server entry.
 *
 * Usage:
 *   npm run build
 *   npm start
 */
import 'dotenv/config'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import entry from './dist/server/server.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = Number(process.env.PORT) || 8000
const clientDir = join(__dirname, 'dist/client')

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
}

// Security headers applied to every response. HSTS is only emitted when the
// request arrived over HTTPS (e.g. behind a TLS-terminating reverse proxy).
const securityHeadersFor = (req) => {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  }
  if ((req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https') {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains'
  }
  return headers
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // Serve static client assets when present; everything else (SSR pages,
  // /v1/api/*, server functions) goes to the TanStack Start entry.
  const filePath = join(clientDir, url.pathname === '/' ? 'index.html' : url.pathname)
  if (
    existsSync(filePath) &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/_')
  ) {
    const ext = extname(filePath) || '.html'
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const content = readFileSync(filePath)
    res.writeHead(200, {
      ...securityHeadersFor(req),
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    })
    res.end(content)
    return
  }

  try {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined

    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
    })

    const response = await entry.fetch(request)

    const responseHeaders = {
      ...Object.fromEntries(response.headers),
      ...securityHeadersFor(req),
    }

    res.writeHead(response.status, responseHeaders)

    if (response.body) {
      const reader = response.body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }
      } finally {
        reader.releaseLock()
      }
    }
    res.end()
  } catch (err) {
    console.error('Server error:', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
    }
    res.end('Internal Server Error')
  }
})

server.listen(PORT, () => {
  console.log(`Admin panel running at http://localhost:${PORT}`)
})
