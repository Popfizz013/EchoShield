const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Proxy API requests to middleware
  if (pathname.startsWith('/api')) {
    const middlewareUrl = `http://middleware:3001${pathname}`;
    
    try {
      const options = {
        method: req.method,
        headers: {
          ...req.headers,
          host: 'middleware:3001',
        },
      };

      const proxyReq = http.request(middlewareUrl, options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API service unavailable' }));
      });

      if (req.method === 'POST' || req.method === 'PUT') {
        req.pipe(proxyReq);
      } else {
        proxyReq.end();
      }
      return;
    } catch (err) {
      console.error('Proxy error:', err);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API service unavailable' }));
      return;
    }
  }

  // Serve static files from dist
  let filePath = path.join(DIST_DIR, pathname);
  
  // If path is a directory or doesn't exist, serve index.html (SPA routing)
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  // Security check: ensure file is within DIST_DIR
  if (!path.resolve(filePath).startsWith(DIST_DIR)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.json') contentType = 'application/json';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.ico') contentType = 'image/x-icon';
    else if (ext === '.woff') contentType = 'font/woff';
    else if (ext === '.woff2') contentType = 'font/woff2';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend proxy server running on port ${PORT}`);
});
