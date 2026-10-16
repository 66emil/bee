import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { phpNest } from '../src/http.js';

let server, base, store;

before(async () => {
  ({ server, store } = createApp({ persist: false }));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

/** Клиент с cookie-сессией, как браузер */
function client() {
  let cookie = '';
  return async function req(path, { method = 'GET', json, form, body, headers = {} } = {}) {
    const h = { ...headers };
    if (cookie) h.cookie = cookie;
    let payload = body;
    if (json !== undefined) {
      h['content-type'] = 'application/json';
      payload = JSON.stringify(json);
    } else if (form) {
      payload = form; // FormData или URLSearchParams
    }
    const res = await fetch(base + path, { method, headers: h, body: payload, redirect: 'manual' });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  };
}

/** FormData так же, как её собирает objectToFormData() в commerce.js */
function commerceForm(obj, fd = new FormData(), prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v !== null && typeof v === 'object') commerceForm(v, fd, key);
    else fd.append(key, String(v));
  }
  return fd;
}

const HEADER_HASH = '618d6fa904a3231e7a50bc6c80c2b30b';
const MOBILE_HASH = 'fd719af6d03de06a109a106ad39c0cbe';

function honeyWithOptions() {
  return store.catalog.products.find((p) => p.optionType && p.options.length > 1);
}

describe('http helpers', () => {
  test('phpNest разбирает ключи в стиле PHP', () => {
    assert.deepEqual(
      phpNest([['action', 'cart/add'], ['data[meta][addon]', '1'], ['data[cart][instance]', 'products'], ['hashes[carts][0]', 'a'], ['hashes[carts][1]', 'b'], ['x[]', '1'], ['x[]', '2']]),
      { action: 'cart/add', data: { meta: { addon: '1' }, cart: { instance: 'products' } }, hashes: { carts: { 0: 'a', 1: 'b' } }, x: ['1', '2'] },
    );
  });
});

describe('статика ./site', () => {
  test('главная отдаётся, виджет корзины на месте', async () => {
    const r = await client()('/');
    assert.equal(r.status, 200);
    assert.match(r.data, /data-commerce-cart="618d6fa904a3231e7a50bc6c80c2b30b"/);
  });
  test('чистые URL: /katalog-meda -> katalog-meda.html', async () => {
    const r = await client()('/katalog-meda');
    assert.equal(r.status, 200);
    assert.match(r.data, /catalog_list/);
  });
  test('пагинация: /katalog-meda?start=20', async () => {
    const r = await client()('/katalog-meda?start=20');
    assert.equal(r.status, 200);
  });
  test('нет файла -> 404 с шаблоном сайта', async () => {
    const r = await client()('/no/such/page');
    assert.equal(r.status, 404);
    assert.match(r.data, /data-commerce-cart=/);
  });
  test('старые URL -> 301 как на живом сайте', async () => {
    const r = await client()('/catalog/honey-11/');
    assert.equal(r.status, 301);
    assert.equal(r.headers.get('location'), '/katalog-meda');
  });
  test('path traversal не проходит', async () => {
    assert.equal((await client()('/..%2f..%2fpackage.json')).status, 404);
  });
});

describe('легаси: Commerce', () => {
  test('cart/add -> success + разметка виджетов по хешам; виджеты в страницах обновляются', async () => {
    const req = client();
    const p = honeyWithOptions();
    const r = await req('/commerce/action', {
      method: 'POST',
      form: commerceForm({
        action: 'cart/add',
        data: { id: p.id, count: 2, meta: { [p.optionType]: 1 }, cart: { instance: 'products' } },
        hashes: { carts: [HEADER_HASH, MOBILE_HASH] },
      }),
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.status, 'success');
    assert.match(r.data.markup.carts[HEADER_HASH], /<span class="cnt">2<\/span>/);
    assert.match(r.data.markup.carts[MOBILE_HASH], /id="top_basket2"/);

    const page = await req('/contacts');
    assert.match(page.data, /<span class="cnt">2<\/span>/, 'серверная подстановка виджета в статику');

    const contents = await req('/commerce/cart/contents', { method: 'POST', form: commerceForm({ hashes: { carts: [HEADER_HASH] } }) });
    assert.equal(contents.data.status, 'success');
    assert.match(contents.data.markup.carts[HEADER_HASH], /на [\d\s,]+ р\./);
  });

  test('cart/add несуществующего товара -> failed', async () => {
    const r = await client()('/commerce/action', { method: 'POST', form: commerceForm({ action: 'cart/add', data: { id: 99999999 }, hashes: { carts: [HEADER_HASH] } }) });
    assert.equal(r.data.status, 'failed');
  });

  test('update / remove / clean', async () => {
    const req = client();
    const p = honeyWithOptions();
    await req('/commerce/action', { method: 'POST', form: commerceForm({ action: 'cart/add', data: { id: p.id, meta: { [p.optionType]: 0 } }, hashes: { carts: [HEADER_HASH] } }) });
    const cart = (await req('/api/v1/cart')).data;
    const row = cart.items[0].row;
    await req('/commerce/action', { method: 'POST', form: commerceForm({ action: 'cart/update', data: { row, attributes: { count: 5 } } }) });
    assert.equal((await req('/api/v1/cart')).data.count, 5);
    await req('/commerce/action', { method: 'POST', form: commerceForm({ action: 'cart/remove', data: { row } }) });
    assert.equal((await req('/api/v1/cart')).data.count, 0);
    await req('/commerce/action', { method: 'POST', form: commerceForm({ action: 'cart/add', data: { id: p.id } }) });
    await req('/commerce/action', { method: 'POST', form: commerceForm({ action: 'cart/clean', data: { cart: { instance: 'products' } } }) });
    assert.equal((await req('/api/v1/cart')).data.count, 0);
  });
});

describe('легаси: ajax.php и /basket', () => {
  test('cta: пусто -> HTML с ошибками; заполнено -> ok', async () => {
    const req = client();
    const bad = await req('/ajax.php?q=cta', { method: 'POST', form: new URLSearchParams({ formid: 'cta_form', name: '', phone: '' }) });
    assert.equal(bad.status, 200);
    assert.match(bad.data, /Введите имя/);
    const ok = await req('/ajax.php?q=cta', { method: 'POST', form: new URLSearchParams({ formid: 'cta_form', name: 'Тест', phone: '+7 900 000-00-00' }) });
    assert.equal(ok.data, 'ok');
  });

  test('fb: сообщение обязательно', async () => {
    const req = client();
    const bad = await req('/ajax.php?q=fb', { method: 'POST', form: new URLSearchParams({ name: 'Тест', message: '' }) });
    assert.match(bad.data, /Введите сообщение/);
    const ok = await req('/ajax.php?q=fb', { method: 'POST', form: new URLSearchParams({ name: 'Тест', email: 'a@b.ru', message: 'Привет' }) });
    assert.equal(ok.data, 'ok');
  });

  test('оформление заказа через форму на /basket', async () => {
    const req = client();
    const p = honeyWithOptions();
    const empty = await req('/basket');
    assert.match(empty.data, /Корзина пуста/);

    await req('/commerce/action', { method: 'POST', form: commerceForm({ action: 'cart/add', data: { id: p.id, count: 1, meta: { [p.optionType]: 0 } } }) });
    const basket = await req('/basket');
    assert.match(basket.data, /id="order_form"/);
    assert.match(basket.data, /data-commerce-row="[a-f0-9]{32}"/);

    const invalid = await req('/basket', { method: 'POST', form: new URLSearchParams({ formid: 'order', name: 'Тест', phone: '', delivery_method: 'courier' }) });
    assert.match(invalid.data, /Введите телефон/);
    assert.match(invalid.data, /Укажите адрес доставки/);

    const done = await req('/basket', { method: 'POST', form: new URLSearchParams({ formid: 'order', name: 'Тест', phone: '+7 900 000-00-00', delivery_method: 'pickup' }) });
    assert.match(done.data, /Заказ №\d+ оформлен/);
    assert.equal((await req('/api/v1/cart')).data.count, 0);
  });

  test('поиск /search?search= (ё = е)', async () => {
    const r = await client()('/search?search=' + encodeURIComponent('липовый мед'));
    assert.equal(r.status, 200);
    assert.match(r.data, /Найдено: \d+/);
  });
});

describe('REST API v1', () => {
  test('GET /api/v1/site', async () => {
    const r = await client()('/api/v1/site');
    assert.equal(r.status, 200);
    assert.equal(r.data.siteName, 'Дом мёда');
    assert.ok(!('cartWidgets' in r.data));
  });

  test('категории: список, дерево, по пути', async () => {
    const req = client();
    const list = await req('/api/v1/categories');
    assert.ok(list.data.items.length > 0);
    const tree = await req('/api/v1/categories?tree=1');
    assert.ok(tree.data.items.some((c) => c.path === '/katalog-meda' && c.children.length > 0));
    const one = await req('/api/v1/categories/katalog-meda/lipovyj-myod');
    assert.equal(one.status, 200);
    assert.deepEqual(one.data.breadcrumbs.map((b) => b.path), ['/katalog-meda', '/katalog-meda/lipovyj-myod']);
  });

  test('товары: фильтр по категории (с подкатегориями), сортировка, пагинация', async () => {
    const req = client();
    const r = await req('/api/v1/products?category=/katalog-meda&sort=price&limit=5');
    assert.equal(r.status, 200);
    assert.equal(r.data.items.length, Math.min(5, r.data.total));
    const prices = r.data.items.map((x) => x.price).filter((x) => x != null);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
    assert.equal((await req('/api/v1/products?sort=bogus')).status, 400);
    assert.equal((await req('/api/v1/products?limit=1000')).status, 400);
  });

  test('товар: по id и по пути, с вариантами и похожими', async () => {
    const req = client();
    const p = honeyWithOptions();
    const byId = await req(`/api/v1/products/${p.id}`);
    assert.equal(byId.data.id, p.id);
    assert.ok(byId.data.options.length > 1);
    assert.ok(Array.isArray(byId.data.related));
    const byPath = await req(`/api/v1/products/by-path${p.path}`);
    assert.equal(byPath.data.id, p.id);
    assert.equal((await req('/api/v1/products/0')).status, 404);
  });

  test('корзина и заказ через API', async () => {
    const req = client();
    const p = honeyWithOptions();
    const add = await req('/api/v1/cart/items', { method: 'POST', json: { productId: p.id, optionIndex: 1, count: 2 } });
    assert.equal(add.status, 201);
    assert.equal(add.data.cart.items[0].price, p.options.find((o) => o.index === 1).price);
    assert.equal(add.data.cart.total, add.data.cart.items[0].price * 2);

    const badOpt = await req('/api/v1/cart/items', { method: 'POST', json: { productId: p.id, optionIndex: 99 } });
    assert.equal(badOpt.status, 422);

    const patched = await req(`/api/v1/cart/items/${add.data.row}`, { method: 'PATCH', json: { count: 3 } });
    assert.equal(patched.data.count, 3);

    const invalid = await req('/api/v1/orders', { method: 'POST', json: { customer: { name: 'Т' }, delivery: { method: 'courier' } } });
    assert.equal(invalid.status, 422);
    assert.ok(invalid.data.error.fields.phone);
    assert.ok(invalid.data.error.fields.address);
    assert.ok(invalid.data.error.fields.payment_method);

    const order = await req('/api/v1/orders', {
      method: 'POST',
      json: { customer: { name: 'Тест', phone: '+7 900 000-00-00' }, delivery: { method: 'courier', address: 'Москва' }, payment: { method: 'cash' } },
    });
    assert.equal(order.status, 201);
    assert.equal(order.data.total, order.data.subtotal + 350);
    assert.equal((await req(`/api/v1/orders/${order.data.id}`)).data.id, order.data.id);
    assert.equal((await req('/api/v1/cart')).data.count, 0);
  });

  test('онлайн-оплата недоступна для доставки за МКАД', async () => {
    const req = client();
    await req('/api/v1/cart/items', { method: 'POST', json: { productId: honeyWithOptions().id } });
    const r = await req('/api/v1/orders', {
      method: 'POST',
      json: { customer: { name: 'Т', phone: '+7 900 000-00-00' }, delivery: { method: 'courier_outside', address: 'МО' }, payment: { method: 'online' } },
    });
    assert.equal(r.status, 422);
    assert.ok(r.data.error.fields.payment_method);
  });

  test('заявки: callback и feedback', async () => {
    const req = client();
    assert.equal((await req('/api/v1/callback-requests', { method: 'POST', json: { name: 'Т', phone: '+7 900 000-00-00' } })).status, 201);
    assert.equal((await req('/api/v1/callback-requests', { method: 'POST', json: { name: 'Т' } })).status, 422);
    assert.equal((await req('/api/v1/feedback', { method: 'POST', json: { name: 'Т', message: 'м' } })).status, 201);
  });

  test('поиск', async () => {
    const r = await client()('/api/v1/search?q=' + encodeURIComponent('мёд'));
    assert.equal(r.status, 200);
    assert.ok(r.data.total > 0);
    assert.equal((await client()('/api/v1/search?q=a')).status, 400);
  });

  test('CORS preflight для dev-сервера фронта', async () => {
    const r = await fetch(base + '/api/v1/cart', { method: 'OPTIONS', headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST' } });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  test('неизвестный маршрут API -> 404 JSON, неверный метод -> 405', async () => {
    assert.equal((await client()('/api/v1/nope')).status, 404);
    assert.equal((await client()('/api/v1/cart', { method: 'PUT' })).status, 405);
  });
});
