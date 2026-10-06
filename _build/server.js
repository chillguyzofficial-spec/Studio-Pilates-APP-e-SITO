// server statico minimo per provare in locale: node _build/server.js [porta]
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), PORT = +process.argv[2] || 8993;
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml' };
http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end('404'); }
  r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(r);
}).listen(PORT, () => console.log('http://localhost:' + PORT + '/'));
