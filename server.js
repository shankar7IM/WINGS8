const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

// Load environment variables from .env.local or .env if present
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// Route mapping for serverless handlers
const apiRoutes = {
  '/api/create-order': require('./api/create-order'),
  '/api/verify-payment': require('./api/verify-payment'),
  '/api/webhook': require('./api/webhook'),
  '/api/order-status': require('./api/order-status'),
  '/api/admin/orders': require('./api/admin-orders'),
  '/api/admin-orders': require('./api/admin-orders')
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2e6) { // 2MB limit
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve(data);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enhance res with helper methods
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  // API routing
  if (apiRoutes[pathname]) {
    try {
      req.query = parsedUrl.query;
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        req.body = await parseBody(req);
      }
      await apiRoutes[pathname](req, res);
      return;
    } catch (err) {
      console.error(`Error handling ${pathname}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
      }
      return;
    }
  }

  // Static file serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Security check: stay within workspace
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Access denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    // Strict no-cache headers to ensure browser always loads latest changes during development and review
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`WINGS8 server running at http://localhost:${PORT}`);
  });
}

module.exports = { server, app: server };
