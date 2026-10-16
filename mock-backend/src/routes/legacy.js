// Совместимость со старым фронтом сайта: эти маршруты дергают commerce.js и js/script.js.
//   POST /commerce/action           — cart/add | cart/addmultiple | cart/update | cart/remove | cart/clean
//   POST /commerce/cart/contents    — перерисовать корзины по хешам
//   POST /commerce/data/update      — смена доставки/оплаты в форме заказа
//   POST /commerce/currency/set
//   POST /ajax.php?q=cta|fb         — «Обратный звонок» и форма обратной связи; ответ 'ok' или HTML формы с ошибками
//   GET  /search?search=…           — страница результатов поиска
//   GET  /basket, POST /basket      — корзина + оформление заказа (обычный POST формы)
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sendJson, sendText } from '../http.js';
import * as R from '../render/legacy.js';
import { searchProducts } from './api.js';

export const BASKET_HASH = 'basket0000000000000000000000mock';
const PACKAGE_PRODUCT_ID = 611; // «Пакет-майка "Дом меда"» — предлагается в корзине

export function registerLegacy(router, { store, carts, orders, siteDir }) {
  const { settings } = store;

  function renderWidget(hash, cart) {
    switch (settings.cartWidgets?.[hash]) {
      case 'header-mobile':
        return R.headerCartMobile(hash, cart);
      case 'basket':
        return R.basketCart(hash, cart);
      default:
        return R.headerCart(hash, cart);
    }
  }

  function markupFor(sid, hashes = {}) {
    const cart = carts.view(sid);
    const markup = { carts: {} };
    const list = Array.isArray(hashes.carts) ? hashes.carts : Object.values(hashes.carts || {});
    for (const hash of list) if (hash) markup.carts[hash] = renderWidget(hash, cart);
    // markup.form (перерисовка блоков доставки/оплаты) не отдаём: в моке они не зависят от корзины,
    // а js/script.js вешает обработчик .delivery один раз — после замены радиокнопок он бы отвалился.
    return markup;
  }

  const failed = (ctx, e) => sendJson(ctx.res, 200, { status: 'failed', errors: [e.message] });

  // ------------------------------------------------------------- Commerce
  router.post('/commerce/action', (ctx) => {
    const { action, data = {}, hashes } = ctx.body;
    const instance = data.cart?.instance || 'products';
    try {
      switch (action) {
        case 'cart/add':
          carts.add(ctx.sid, { id: data.id, count: data.count ?? 1, meta: data.meta || {}, instance });
          break;
        case 'cart/addmultiple':
          for (const item of Object.values(data.batch || {})) {
            if (item?.id) carts.add(ctx.sid, { id: item.id, count: item.count ?? 1, meta: item.meta || {}, instance });
          }
          break;
        case 'cart/update':
          carts.update(ctx.sid, data.row, { count: data.attributes?.count }, instance);
          break;
        case 'cart/remove':
          carts.remove(ctx.sid, data.row, instance);
          break;
        case 'cart/clean':
          carts.clean(ctx.sid, instance);
          break;
        default:
          return sendJson(ctx.res, 200, { status: 'failed', errors: [`Unknown action ${action}`] });
      }
    } catch (e) {
      return failed(ctx, e);
    }
    sendJson(ctx.res, 200, { status: 'success', markup: markupFor(ctx.sid, hashes) });
  });

  router.post('/commerce/cart/contents', (ctx) => {
    sendJson(ctx.res, 200, { status: 'success', markup: markupFor(ctx.sid, ctx.body.hashes) });
  });

  router.post('/commerce/data/update', (ctx) => {
    const { hashes, ...fields } = ctx.body;
    const sess = (store.state.sessions[ctx.sid] ||= {});
    sess.orderData = { ...sess.orderData, ...fields };
    sendJson(ctx.res, 200, { status: 'success', markup: markupFor(ctx.sid, hashes) });
  });

  router.post('/commerce/currency/set', (ctx) => {
    const sess = (store.state.sessions[ctx.sid] ||= {});
    sess.currency = ctx.body.code || 'RUB';
    sendJson(ctx.res, 200, { status: 'success' });
  });

  // ------------------------------------------------------------- ajax.php (FormLister)
  router.post('/ajax.php', (ctx) => {
    const q = ctx.query.get('q');
    try {
      if (q === 'cta') orders.createCallback(ctx.body);
      else if (q === 'fb') orders.createFeedback(ctx.body);
      else return sendText(ctx.res, 404, 'unknown form');
    } catch (e) {
      if (e.status !== 422) throw e;
      const { values, errors } = e.details;
      return sendText(ctx.res, 200, q === 'cta' ? R.ctaFormWithErrors(values, errors) : R.fbFormWithErrors(values, errors));
    }
    sendText(ctx.res, 200, 'ok', 'text/html; charset=utf-8');
  });

  // ------------------------------------------------------------- страницы
  async function layout(name = 'basket.html') {
    return readFile(path.join(siteDir, name), 'utf8').catch(() =>
      readFile(path.join(siteDir, 'index.html'), 'utf8'),
    );
  }

  const crumbs = (title) => `<div class="breadcrumbs">
<span class="el"><a href="/"><span>Главная</span></a></span>
<span class="sep">&nbsp;&rsaquo; </span>
<span class="el"><span class="last">${R.esc(title)}</span></span></div>`;

  async function renderBasket(ctx, { values = {}, errors = {} } = {}) {
    const cart = carts.view(ctx.sid);
    const od = store.state.sessions[ctx.sid]?.orderData || {};
    const pkg = store.product(PACKAGE_PRODUCT_ID);
    const body = `${crumbs('Корзина')}
<div class="sotheader"><h1>Корзина</h1></div>
<h2>Ваш заказ</h2>
${R.basketCart(BASKET_HASH, cart)}
${cart.count && pkg ? `<hr><h2>Выбор пакета</h2><div><label class="radio">
<input data-commerce-action="add" data-id="${pkg.id}" data-count="1" type="radio" name="paket" value="${pkg.id}">
<span class="labelTitle">${R.esc(pkg.name)} - ${R.money(pkg.price)} руб.</span></label></div>` : ''}
${cart.count ? R.orderForm(settings, { values: { ...od, ...values }, errors }) : ''}`;
    const html = R.inLayout(await layout(), { title: 'Корзина', body });
    sendText(ctx.res, 200, ctx.transformHtml(html));
  }

  for (const p of ['/basket', '/basket.html']) {
    router.get(p, (ctx) => renderBasket(ctx));
    router.post(p, async (ctx) => {
      try {
        const order = orders.create(ctx.sid, ctx.body, { source: 'site' });
        const html = R.inLayout(await layout(), { title: `Заказ №${order.id}`, body: `${crumbs('Заказ оформлен')}${R.orderSuccess(order)}` });
        sendText(ctx.res, 200, ctx.transformHtml(html));
      } catch (e) {
        if (e.status !== 422) throw e;
        await renderBasket(ctx, e.details);
      }
    });
  }

  for (const p of ['/search', '/search.html']) {
    router.get(p, async (ctx) => {
      const q = (ctx.query.get('search') || '').trim();
      const found = q ? searchProducts(store, q).slice(0, 60) : [];
      const html = R.inLayout(await layout('contacts.html'), { title: `Поиск: ${q}`, body: `${crumbs('Поиск')}${R.searchResults(q, found)}` });
      sendText(ctx.res, 200, ctx.transformHtml(html));
    });
  }

  return { markupFor, renderWidget };
}
