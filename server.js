import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const common = {
  '/auth.js': 'public/auth.js',
  '/style.css': 'public/style.css',
  '/data.js': 'public/data.js',
  '/vendor/keycloak.js': 'node_modules/keycloak-js/lib/keycloak.js',
  '/vendor/deprecations.js': 'node_modules/keycloak-js/lib/deprecations.js',
};
const types = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
};
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:8080; frame-src http://localhost:8080; frame-ancestors 'none'; base-uri 'none'; form-action 'self' http://localhost:8080",
};

function serve(port, label, routes) {
  const files = new Map(Object.entries({ ...common, ...routes }));
  const server = createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { ...headers, Allow: 'GET, HEAD' }).end();
      return;
    }

    const path = request.url.split('?')[0];
    const file = files.get(path);
    if (!file) {
      response.writeHead(404, headers).end();
      return;
    }

    try {
      const body = await readFile(new URL(file, import.meta.url));
      const type = types[file.split('.').at(-1)];
      response.writeHead(200, { ...headers, 'Content-Type': type, 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      console.error(file, error.message);
      response.writeHead(500, headers).end();
    }
  });

  server.on('error', (error) => {
    console.error(`서비스 ${label} 시작 실패 (포트 ${port}): ${error.message}`);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => console.log(`서비스 ${label}: http://localhost:${port}/`));
}

try {
  for (const file of [common['/vendor/keycloak.js'], common['/vendor/deprecations.js']]) {
    await readFile(new URL(file, import.meta.url));
  }
} catch {
  console.error('먼저 npm.cmd install 을 실행해 Keycloak 어댑터를 설치하세요.');
  process.exit(1);
}

serve(5173, 'A', { '/': 'public/service-a.html', '/tasks.js': 'public/tasks.js' });
serve(5174, 'B', { '/': 'public/service-b.html', '/notes.js': 'public/notes.js', '/crypto.js': 'public/crypto.js' });
