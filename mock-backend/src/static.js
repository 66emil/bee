// Раздача локальной копии сайта (../site) с «чистыми» URL как у Evolution CMS:
//   /katalog-meda              -> katalog-meda.html
//   /pchelovodam?start=20      -> pchelovodam@start=20.html   (так wget сохраняет query)
//   /about/                    -> about/index.html | about.html
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
};

async function isFile(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (MIME[ext]) return MIME[ext];
  // commerce.js@0.12.1 и т.п. — смотрим на «внутреннее» расширение
  const inner = path.extname(file.split('@')[0]).toLowerCase();
  return MIME[inner] || 'application/octet-stream';
}

export function createStatic(siteDir) {
  const root = path.resolve(siteDir);

  async function resolveFile(url) {
    let p = decodeURIComponent(url.pathname);
    if (p.includes('\0')) return null;
    const q = url.search ? '@' + url.search.slice(1) : '';
    const rel = p.replace(/^\/+/, '');
    const candidates = [];
    if (rel === '' || rel.endsWith('/')) {
      candidates.push(rel + 'index' + q + '.html', rel.replace(/\/$/, '') + q + '.html');
    } else {
      candidates.push(rel + q, rel + q + '.html', rel, rel + '.html', rel + '/index.html');
    }
    for (const c of candidates) {
      if (!c) continue;
      const full = path.resolve(root, c);
      if (!full.startsWith(root + path.sep) && full !== root) continue; // path traversal
      if (await isFile(full)) return full;
    }
    return null;
  }

  /** transformHtml(html) — подменить в HTML-страницах сессионные куски (виджеты корзины) */
  return async function serveStatic(req, res, url, transformHtml) {
    const file = await resolveFile(url);
    if (!file) return false;
    const type = mimeFor(file);
    if (transformHtml && type.startsWith('text/html')) {
      const html = transformHtml(await readFile(file, 'utf8'));
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(html), 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : html);
      return true;
    }
    const st = await stat(file);
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end(), true;
    createReadStream(file).pipe(res);
    return true;
  };
}
