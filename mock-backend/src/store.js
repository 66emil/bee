// In-memory хранилище мок-бэкенда.
// Каталог/страницы — из data/*.json (генерируются tools/extract_catalog.py из ./site),
// заказы/заявки/корзины — в памяти; при PERSIST=1 сохраняются в data/runtime/state.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function createStore({ dataDir, persist = false } = {}) {
  const catalog = readJson(path.join(dataDir, 'catalog.json'), { categories: [], products: [] });
  const content = readJson(path.join(dataDir, 'content.json'), { pages: [], recipes: [] });
  const settings = readJson(path.join(dataDir, 'settings.json'), {});
  const fixtures = readJson(path.join(dataDir, 'fixtures.json'), { orders: [], callbackRequests: [], feedback: [] });
  const redirects = readJson(path.join(dataDir, 'redirects.json'), []);
  const runtimeFile = path.join(dataDir, 'runtime', 'state.json');

  // служебные товары (пакет в корзине и т.п.) — заказываются, но не видны в каталоге
  const hiddenProducts = (fixtures.extraProducts || []).filter((p) => !catalog.products.some((x) => x.id === p.id));
  const allProducts = [...catalog.products, ...hiddenProducts];

  const initialState = () => ({
    orders: structuredClone(fixtures.orders || []),
    callbackRequests: structuredClone(fixtures.callbackRequests || []),
    feedback: structuredClone(fixtures.feedback || []),
    carts: {}, // sessionId -> { instance -> cart }
    sessions: {}, // sessionId -> { currency, orderData }
    seq: { order: Math.max(1000, ...(fixtures.orders || []).map((o) => o.id)) },
  });

  let state = persist ? readJson(runtimeFile, null) || initialState() : initialState();

  const productsById = new Map(allProducts.map((p) => [String(p.id), p]));
  const productsByPath = new Map(allProducts.map((p) => [p.path, p]));
  const categoriesById = new Map(catalog.categories.map((c) => [String(c.id), c]));
  const categoriesByPath = new Map(catalog.categories.map((c) => [c.path, c]));

  function save() {
    if (!persist) return;
    mkdirSync(path.dirname(runtimeFile), { recursive: true });
    writeFileSync(runtimeFile, JSON.stringify(state, null, 2));
  }

  return {
    catalog,
    content,
    settings,
    redirects,
    get state() {
      return state;
    },
    save,
    reset() {
      state = initialState();
      save();
    },

    product(idOrPath) {
      const key = String(idOrPath);
      return productsById.get(key) || productsByPath.get(key.startsWith('/') ? key : '/' + key) || null;
    },
    category(idOrPath) {
      const key = String(idOrPath);
      return categoriesById.get(key) || categoriesByPath.get(key.startsWith('/') ? key : '/' + key) || null;
    },
    /** Все категории-потомки (включая саму) */
    categorySubtree(cat) {
      const out = [cat];
      for (let i = 0; i < out.length; i++) {
        for (const c of catalog.categories) if (c.parentId === out[i].id) out.push(c);
      }
      return out;
    },
    page(p) {
      const key = '/' + String(p).replace(/^\/+|\/+$/g, '');
      return content.pages.find((x) => x.path === key) || null;
    },
    recipe(slug) {
      return content.recipes.find((r) => r.slug === slug || String(r.id) === String(slug)) || null;
    },

    nextOrderId() {
      state.seq.order += 1;
      return state.seq.order;
    },
  };
}
