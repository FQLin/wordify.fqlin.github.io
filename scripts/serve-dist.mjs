import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(SCRIPT_DIR, '..', 'dist');
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function resolveFilePath(pathname) {
  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolve(DIST_DIR, `.${normalizedPath}`);

  if (!filePath.startsWith(DIST_DIR)) {
    return null;
  }

  if (!existsSync(filePath)) {
    return null;
  }

  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    const nestedIndex = join(filePath, 'index.html');
    if (!existsSync(nestedIndex)) {
      return null;
    }
    return nestedIndex;
  }

  return filePath;
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  const filePath = resolveFilePath(requestUrl.pathname);

  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
    return;
  }

  const extension = extname(filePath);
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';
  const content = readFileSync(filePath);

  response.writeHead(200, { 'Content-Type': contentType });
  response.end(content);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving dist at http://127.0.0.1:${PORT}`);
});

function closeServer() {
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', closeServer);
process.on('SIGTERM', closeServer);
