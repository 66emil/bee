// Сборка мок-бэкенда: API v1 + легаси-эндпоинты сайта + раздача ./site.
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBody, parseCookies, sendJson, sendText, setCookie } from './http.js';
import { Router } from './router.js';
import { createStore } from './store.js';
import { createStatic } from './static.js';
import { createCartService } from './services/cart.js';
import { createOrderService } from './services/orders.js';
import { registerApi } from './routes/api.js';
import { registerLegacy } from './routes/legacy.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SID_COOKIE = 'mock_sid';

export function createApp({
  dataDir = path.join(here, '..', 'data'),
  siteDir = path.join(here, '..', '..', 'site'),
  persist = process.env.PERSIST === '1',
  log = false,
} = {}) {
  const store = createStore({ dataDir, persist });
  const carts = createCartService(store);
  const orders = createOrderService(store, carts);
  const router = new Router();
  const serveStatic = createStatic(siteDir);

  registerApi(router, { store, carts, orders });
  const legacy = registerLegacy(router, { store, carts, orders, siteDir });

  // служебные маршруты мока
  router.get('/__mock/state', (ctx) => {
    const { carts: c, sessions, ...rest } = store.state;
    sendJson(ctx.res, 200, { ...rest, activeCarts: Object.keys(c).length });
  });
  router.post('/__mock/reset', (ctx) => {
    store.reset();
    sendJson(ctx.res, 200, { ok: true });
  });
  router.get('/__mock/routes', (ctx) => sendJson(ctx.res, 200, router.list()));

  // 301 со старых URL, как на живом сайте (data/redirects.json, собрано из logs/wget.log)
  const redirects = new Map();
  for (const r of store.redirects) {
    redirects.set(r.from, r);
    if (r.from.endsWith('/')) redirects.set(r.from + 'index.html', r);
  }

  const WIDGET_RE = /<(div|a)\b[^>]*\bdata-commerce-cart="([0-9a-z]+)"[^>]*>[\s\S]*?<\/\1>/g;

  async function handle(req, res) {
    const started = Date.now();
    const url = new URL(req.url, 'http://localhost');
    const isApi = url.pathname.startsWith('/api/');

    if (isApi) {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'content-type',
          'Access-Control-Max-Age': '600',
        });
        return res.end();
      }
    }

    let sid = parseCookies(req)[SID_COOKIE];
    if (!sid || !/^[a-f0-9]{32}$/.test(sid)) {
      sid = randomBytes(16).toString('hex');
      setCookie(res, SID_COOKIE, sid, { httpOnly: true });
    }

    const ctx = {
      req, res, url, sid,
      query: url.searchParams,
      params: {},
      body: {},
      transformHtml: (html) => html.replace(WIDGET_RE, (m, _tag, hash) =>
        store.settings.cartWidgets?.[hash] ? legacy.renderWidget(hash, carts.view(sid)) : m),
    };

    try {
      const found = router.match(req.method, url.pathname);
      const redirect = redirects.get(url.pathname);
      if (redirect && (req.method === 'GET' || req.method === 'HEAD')) {
        res.writeHead(redirect.status || 301, { Location: redirect.to + url.search });
        res.end();
      } else if (found?.route) {
        ctx.params = found.params;
        ctx.body = await parseBody(req);
        await found.route.handler(ctx);
      } else if ((req.method === 'GET' || req.method === 'HEAD') && !isApi && (await serveStatic(req, res, url, ctx.transformHtml))) {
        // отдано из ./site
      } else if (found?.methodNotAllowed) {
        isApi ? sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } }) : sendText(res, 405, 'Method not allowed');
      } else if (isApi) {
        sendJson(res, 404, { error: { code: 'not_found', message: 'Not found' } });
      } else {
        const page = await readFile(path.join(siteDir, '404.html'), 'utf8').catch(() => '<h1>404</h1><p>Нет в локальной копии</p>');
        sendText(res, 404, ctx.transformHtml(page));
      }
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error(e);
      if (!res.headersSent) {
        if (isApi) {
          sendJson(res, status, {
            error: {
              code: status === 422 ? 'validation_error' : status === 404 ? 'not_found' : status === 400 ? 'bad_request' : status === 409 ? 'conflict' : 'internal_error',
              message: e.message,
              ...(e.details?.errors ? { fields: e.details.errors } : {}),
            },
          });
        } else if (url.pathname.startsWith('/commerce/')) {
          sendJson(res, 200, { status: 'failed', errors: [e.message] });
        } else {
          sendText(res, status, e.message, 'text/plain; charset=utf-8');
        }
      }
    } finally {
      if (log) console.log(`${req.method} ${url.pathname}${url.search} -> ${res.statusCode} ${Date.now() - started}ms`);
    }
  }

  const server = http.createServer(handle);
  return { server, store, router };
}
