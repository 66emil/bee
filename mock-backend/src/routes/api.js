// REST API v1 для нового фронта (редизайн). JSON, ошибки: { error: { code, message, fields? } }.
// Описание: docs/API.md.
import { httpError, sendJson } from '../http.js';

const norm = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е').replace(/<[^>]+>/g, ' ');

const SORTS = {
  menuindex: (a, b) => a.menuIndex - b.menuIndex || a.id - b.id,
  price: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  '-price': (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity),
  name: (a, b) => a.name.localeCompare(b.name, 'ru'),
  '-name': (a, b) => b.name.localeCompare(a.name, 'ru'),
};

export function productSummary(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    path: p.path,
    categoryId: p.categoryId,
    price: p.price,
    priceUnit: p.listUnit ?? null,
    image: p.image?.thumb ?? p.image?.medium ?? null,
    attributes: p.attributes ?? {},
    hasOptions: (p.options || []).length > 1,
    available: p.available !== false,
  };
}

export function searchProducts(store, q) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return store.catalog.products
    .map((p) => {
      const name = norm(p.name);
      const hay = `${name} ${norm(p.shortDescriptionHtml)} ${norm(p.descriptionHtml)} ${(p.properties || []).map((x) => norm(x.value)).join(' ')}`;
      if (!terms.every((t) => hay.includes(t))) return null;
      return { p, score: terms.filter((t) => name.includes(t)).length };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || SORTS.menuindex(a.p, b.p))
    .map((x) => x.p);
}

function intParam(query, name, def, { min = 0, max = Infinity } = {}) {
  const raw = query.get(name);
  if (raw == null || raw === '') return def;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) throw httpError(400, `Параметр ${name} должен быть целым в диапазоне [${min}, ${max}]`);
  return n;
}

export function registerApi(router, { store, carts, orders }) {
  const base = '/api/v1';
  const { settings } = store;

  // ------------------------------------------------------------- справочники
  router.get(`${base}/site`, (ctx) => {
    const { cartWidgets, ...pub } = settings;
    for (const k of Object.keys(pub)) if (k.startsWith('_')) delete pub[k];
    sendJson(ctx.res, 200, pub);
  });

  router.get(`${base}/categories`, (ctx) => {
    const parent = ctx.query.get('parent');
    let list = store.catalog.categories.map((c) => ({
      ...c,
      productCount: store.catalog.products.filter((p) => p.categoryIds?.includes(c.id)).length,
    }));
    if (ctx.query.get('tree') === '1') {
      const byParent = new Map();
      for (const c of list) byParent.set(c.parentId ?? null, [...(byParent.get(c.parentId ?? null) || []), c]);
      const build = (pid) => (byParent.get(pid) || []).map(({ descriptionHtml, ...c }) => ({ ...c, children: build(c.id) }));
      return sendJson(ctx.res, 200, { items: build(null) });
    }
    if (parent !== null) list = list.filter((c) => String(c.parentId ?? 'root') === parent);
    sendJson(ctx.res, 200, { items: list.map(({ descriptionHtml, ...c }) => c), total: list.length });
  });

  router.get(`${base}/categories/:id*`, (ctx) => {
    const cat = store.category(ctx.params.id);
    if (!cat) throw httpError(404, 'Категория не найдена');
    const children = store.catalog.categories.filter((c) => c.parentId === cat.id).map(({ descriptionHtml, ...c }) => c);
    const breadcrumbs = [];
    for (let c = cat; c; c = c.parentId ? store.category(c.parentId) : null) breadcrumbs.unshift({ id: c.id, title: c.title, path: c.path });
    sendJson(ctx.res, 200, { ...cat, children, breadcrumbs });
  });

  // ------------------------------------------------------------- товары
  router.get(`${base}/products`, (ctx) => {
    const q = ctx.query;
    let list = store.catalog.products;
    const catKey = q.get('category');
    if (catKey) {
      const cat = store.category(catKey);
      if (!cat) throw httpError(404, 'Категория не найдена');
      const ids = new Set(
        (q.get('deep') === '0' ? [cat] : store.categorySubtree(cat)).map((c) => c.id),
      );
      list = list.filter((p) => (p.categoryIds || [p.categoryId]).some((id) => ids.has(id)));
    }
    if (q.get('q')) {
      const found = new Set(searchProducts(store, q.get('q')));
      list = list.filter((p) => found.has(p));
    }
    if (q.get('ids')) {
      const ids = new Set(q.get('ids').split(',').map(Number));
      list = list.filter((p) => ids.has(p.id));
    }
    if (q.get('available') === '1') list = list.filter((p) => p.available !== false);
    const minPrice = q.get('minPrice'), maxPrice = q.get('maxPrice');
    if (minPrice) list = list.filter((p) => p.price != null && p.price >= Number(minPrice));
    if (maxPrice) list = list.filter((p) => p.price != null && p.price <= Number(maxPrice));

    const sort = q.get('sort') || 'menuindex';
    if (!SORTS[sort]) throw httpError(400, `sort: одно из ${Object.keys(SORTS).join(', ')}`);
    list = [...list].sort(SORTS[sort]);

    const offset = intParam(q, 'offset', 0);
    const limit = intParam(q, 'limit', 20, { min: 1, max: 100 });
    sendJson(ctx.res, 200, {
      items: list.slice(offset, offset + limit).map(productSummary),
      total: list.length,
      offset,
      limit,
    });
  });

  router.get(`${base}/products/by-path/:path*`, (ctx) => {
    const p = store.product('/' + ctx.params.path.replace(/^\/+|\/+$/g, ''));
    if (!p) throw httpError(404, 'Товар не найден');
    sendJson(ctx.res, 200, productDetail(p));
  });

  router.get(`${base}/products/:id`, (ctx) => {
    const p = store.product(ctx.params.id);
    if (!p) throw httpError(404, 'Товар не найден');
    sendJson(ctx.res, 200, productDetail(p));
  });

  function productDetail(p) {
    return {
      ...p,
      related: (p.relatedIds || []).map((id) => store.product(id)).filter(Boolean).map(productSummary),
    };
  }

  router.get(`${base}/search`, (ctx) => {
    const q = (ctx.query.get('q') || '').trim();
    if (q.length < 2) throw httpError(400, 'q: минимум 2 символа');
    const items = searchProducts(store, q);
    const limit = intParam(ctx.query, 'limit', 20, { min: 1, max: 100 });
    sendJson(ctx.res, 200, { query: q, items: items.slice(0, limit).map(productSummary), total: items.length });
  });

  // ------------------------------------------------------------- контент
  router.get(`${base}/pages`, (ctx) => {
    sendJson(ctx.res, 200, { items: store.content.pages.map(({ html, ...p }) => p) });
  });
  router.get(`${base}/pages/:path*`, (ctx) => {
    const page = store.page(ctx.params.path);
    if (!page) throw httpError(404, 'Страница не найдена');
    sendJson(ctx.res, 200, page);
  });
  router.get(`${base}/recipes`, (ctx) => {
    sendJson(ctx.res, 200, { items: store.content.recipes.map(({ html, ...r }) => r) });
  });
  router.get(`${base}/recipes/:slug`, (ctx) => {
    const r = store.recipe(ctx.params.slug);
    if (!r) throw httpError(404, 'Рецепт не найден');
    sendJson(ctx.res, 200, r);
  });

  // ------------------------------------------------------------- корзина (сессия по cookie)
  router.get(`${base}/cart`, (ctx) => sendJson(ctx.res, 200, carts.view(ctx.sid)));

  router.post(`${base}/cart/items`, (ctx) => {
    const { productId, optionIndex, count = 1 } = ctx.body;
    if (productId == null) throw httpError(422, 'productId обязателен', { errors: { productId: 'required' } });
    const product = store.product(productId);
    if (!product) throw httpError(404, 'Товар не найден');
    const meta = product.optionType && optionIndex != null ? { [product.optionType]: optionIndex } : {};
    const row = carts.add(ctx.sid, { id: productId, count, meta });
    sendJson(ctx.res, 201, { row: row.row, cart: carts.view(ctx.sid) });
  });

  router.patch(`${base}/cart/items/:row`, (ctx) => {
    if (ctx.body.count == null) throw httpError(422, 'count обязателен', { errors: { count: 'required' } });
    carts.update(ctx.sid, ctx.params.row, { count: ctx.body.count });
    sendJson(ctx.res, 200, carts.view(ctx.sid));
  });

  router.delete(`${base}/cart/items/:row`, (ctx) => {
    carts.remove(ctx.sid, ctx.params.row);
    sendJson(ctx.res, 200, carts.view(ctx.sid));
  });

  router.delete(`${base}/cart`, (ctx) => {
    carts.clean(ctx.sid);
    sendJson(ctx.res, 200, carts.view(ctx.sid));
  });

  // ------------------------------------------------------------- оформление заказа
  router.get(`${base}/checkout/options`, (ctx) => {
    sendJson(ctx.res, 200, { deliveryMethods: settings.deliveryMethods, paymentMethods: settings.paymentMethods });
  });

  router.post(`${base}/orders`, (ctx) => {
    const order = orders.create(ctx.sid, ctx.body, { source: 'api' });
    sendJson(ctx.res, 201, order);
  });

  router.get(`${base}/orders/:id`, (ctx) => {
    const order = store.state.orders.find((o) => String(o.id) === ctx.params.id);
    if (!order) throw httpError(404, 'Заказ не найден');
    sendJson(ctx.res, 200, order);
  });

  // ------------------------------------------------------------- заявки
  router.post(`${base}/callback-requests`, (ctx) => {
    sendJson(ctx.res, 201, orders.createCallback(ctx.body, 'api'));
  });
  router.post(`${base}/feedback`, (ctx) => {
    sendJson(ctx.res, 201, orders.createFeedback(ctx.body, 'api'));
  });
}
