// Корзина в стиле плагина Commerce (Evolution CMS):
// корзина = набор строк (row), строка = товар + выбранный вариант (meta) + количество.
// row — md5(id + meta), поэтому один и тот же товар с разной фасовкой — разные строки.
import { createHash } from 'node:crypto';
import { httpError } from '../http.js';

const md5 = (s) => createHash('md5').update(s).digest('hex');

export function rowHash(id, meta = {}) {
  const norm = Object.keys(meta).sort().reduce((o, k) => ((o[k] = String(meta[k])), o), {});
  return md5(`${id}|${JSON.stringify(norm)}`);
}

/** Выбранный вариант товара по meta: meta[addon]=1 или meta[variant]=0 */
export function resolveOption(product, meta = {}) {
  const options = product.options || [];
  if (!options.length) return null;
  const raw = meta[product.optionType] ?? meta.addon ?? meta.variant ?? 0;
  const idx = Number.parseInt(raw, 10);
  const opt = options.find((o) => o.index === idx);
  if (!opt) throw httpError(422, `Неизвестный вариант товара ${product.id}: ${raw}`);
  return opt;
}

export function createCartService(store) {
  function getCart(sid, instance = 'products') {
    const carts = (store.state.carts[sid] ||= {});
    return (carts[instance] ||= { instance, rows: {} });
  }

  function summarize(cart) {
    const items = Object.values(cart.rows);
    const total = items.reduce((s, r) => s + r.price * r.count, 0);
    return {
      instance: cart.instance,
      items: items.map((r) => ({ ...r, total: round2(r.price * r.count) })),
      count: items.reduce((s, r) => s + r.count, 0),
      positions: items.length,
      total: round2(total),
    };
  }

  function add(sid, { id, count = 1, meta = {}, instance = 'products' }) {
    const product = store.product(id);
    if (!product) throw httpError(404, `Товар ${id} не найден`);
    if (product.available === false) throw httpError(409, `Товар ${id} недоступен для заказа`);
    const qty = toCount(count);
    if (qty <= 0) throw httpError(422, 'count должен быть > 0');
    const option = resolveOption(product, meta);
    const cleanMeta = option ? { [product.optionType]: option.index } : {};
    const cart = getCart(sid, instance);
    const row = rowHash(product.id, cleanMeta);
    if (cart.rows[row]) {
      cart.rows[row].count += qty;
    } else {
      cart.rows[row] = {
        row,
        id: product.id,
        name: product.name,
        path: product.path,
        image: product.image?.thumb || null,
        option: option ? { index: option.index, name: option.name } : null,
        meta: cleanMeta,
        price: option ? option.price : product.price,
        count: qty,
      };
    }
    store.save();
    return cart.rows[row];
  }

  function update(sid, row, { count }, instance = 'products') {
    const cart = getCart(sid, instance);
    if (!cart.rows[row]) throw httpError(404, `Строка корзины ${row} не найдена`);
    const qty = toCount(count);
    if (qty <= 0) delete cart.rows[row];
    else cart.rows[row].count = qty;
    store.save();
  }

  function remove(sid, row, instance = 'products') {
    const cart = getCart(sid, instance);
    if (!cart.rows[row]) throw httpError(404, `Строка корзины ${row} не найдена`);
    delete cart.rows[row];
    store.save();
  }

  function clean(sid, instance = 'products') {
    getCart(sid, instance).rows = {};
    store.save();
  }

  return { getCart, summarize, add, update, remove, clean, view: (sid, instance) => summarize(getCart(sid, instance)) };
}

function toCount(v) {
  const n = Number.parseFloat(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) throw httpError(422, 'count должен быть числом');
  return Math.round(n);
}

export const round2 = (n) => Math.round(n * 100) / 100;
