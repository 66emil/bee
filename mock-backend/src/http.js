// Мелкие HTTP-утилиты: разбор тела запроса (json / urlencoded / multipart),
// PHP-подобный разбор ключей вида data[cart][instance], cookies, ответы.

const MAX_BODY = 5 * 1024 * 1024;

export async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw httpError(413, 'Payload too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Разбирает тело запроса в объект. Ключи form-data / urlencoded в PHP-стиле
 * (a[b][c]=1, a[]=1) превращаются во вложенные объекты/массивы — так же, как их видит
 * Evolution CMS через $_POST.
 */
export async function parseBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const type = (req.headers['content-type'] || '').toLowerCase();
  const buf = await readBody(req);
  if (!buf.length) return {};

  if (type.includes('application/json')) {
    try {
      return JSON.parse(buf.toString('utf8'));
    } catch {
      throw httpError(400, 'Invalid JSON');
    }
  }
  if (type.includes('multipart/form-data')) {
    // undici (встроен в Node 18+) умеет разбирать multipart через Web Request API
    const r = new Request('http://local/', { method: 'POST', headers: { 'content-type': req.headers['content-type'] }, body: buf });
    const fd = await r.formData();
    const pairs = [];
    for (const [k, v] of fd.entries()) pairs.push([k, typeof v === 'string' ? v : v.name]);
    return phpNest(pairs);
  }
  // application/x-www-form-urlencoded и всё остальное
  return phpNest([...new URLSearchParams(buf.toString('utf8')).entries()]);
}

/** [['data[cart][instance]', 'products'], ['a[]', '1']] -> { data: { cart: { instance: 'products' } }, a: ['1'] } */
export function phpNest(pairs) {
  const out = {};
  for (const [rawKey, value] of pairs) {
    const m = rawKey.match(/^([^[\]]+)((?:\[[^[\]]*\])*)$/);
    if (!m) {
      out[rawKey] = value;
      continue;
    }
    const keys = [m[1], ...[...m[2].matchAll(/\[([^[\]]*)\]/g)].map((x) => x[1])];
    let node = out;
    keys.forEach((key, i) => {
      const last = i === keys.length - 1;
      const nextIsPush = keys[i + 1] === '';
      if (key === '') key = Array.isArray(node) ? node.length : Object.keys(node).length;
      if (last) {
        node[key] = value;
      } else {
        if (node[key] === undefined || typeof node[key] !== 'object') node[key] = nextIsPush ? [] : {};
        node = node[key];
      }
    });
  }
  return out;
}

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function setCookie(res, name, value, { maxAge = 60 * 60 * 24 * 30, httpOnly = true } = {}) {
  const prev = res.getHeader('Set-Cookie');
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${httpOnly ? '; HttpOnly' : ''}`;
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
}

export function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

export function sendText(res, status, text, type = 'text/html; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

export function httpError(status, message, details) {
  const e = new Error(message);
  e.status = status;
  e.details = details;
  return e;
}
