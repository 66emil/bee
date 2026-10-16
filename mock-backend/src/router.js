// Минимальный роутер: router.get('/api/v1/products/:id', handler)
// handler(ctx) где ctx = { req, res, params, query, body, cookies, session, url }

export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const keys = [];
    const rx = new RegExp(
      '^' +
        pattern.replace(/\/:([a-zA-Z_]+)(\*)?/g, (_, key, star) => {
          keys.push(key);
          return star ? '/(.+)' : '/([^/]+)';
        }) +
        '/?$',
    );
    this.routes.push({ method, pattern, rx, keys, handler });
    return this;
  }

  get(p, h) { return this.add('GET', p, h); }
  post(p, h) { return this.add('POST', p, h); }
  patch(p, h) { return this.add('PATCH', p, h); }
  put(p, h) { return this.add('PUT', p, h); }
  delete(p, h) { return this.add('DELETE', p, h); }
  all(p, h) { return this.add('*', p, h); }

  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = pathname.match(r.rx);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== '*' && r.method !== method && !(method === 'HEAD' && r.method === 'GET')) continue;
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { route: r, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  }

  list() {
    return this.routes.map((r) => `${r.method.padEnd(6)} ${r.pattern}`);
  }
}
