// HTML-фрагменты, которые старый фронт (commerce.js, js/script.js) получает от сервера.
// Пустые состояния скопированы со страниц сайта 1:1; непустые состояния, корзина и форма
// заказа ВОССТАНОВЛЕНЫ по CSS/JS сайта — сверить с HAR (см. docs/API.md, «Что проверить по HAR»).

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** 3155 -> "3 155"; 803.5 -> "803,50" (формат как Commerce.params.currency, но без копеек у целых) */
export function money(n) {
  const neg = n < 0 ? '-' : '';
  const v = Math.abs(n);
  const int = Math.trunc(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const frac = Math.round((v - Math.trunc(v)) * 100);
  return neg + int + (frac ? ',' + String(frac).padStart(2, '0') : '');
}

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

// ---------------------------------------------------------------- виджеты корзины в шапке
export function headerCart(hash, cart) {
  if (!cart.count) {
    return `<div class="basket" id="top_basket" data-commerce-cart="${hash}">
	<span class="cnt">0</span>
	<a href="javascript:;" >Корзина пуста</a>
</div>`;
  }
  return `<div class="basket" id="top_basket" data-commerce-cart="${hash}">
	<span class="cnt">${cart.count}</span>
	<a href="/basket">${cart.count} ${plural(cart.count, 'товар', 'товара', 'товаров')} на ${money(cart.total)} р.</a>
</div>`;
}

export function headerCartMobile(hash, cart) {
  return `<a class="basket" id="top_basket2" href="${cart.count ? '/basket' : 'javascript:;'}" data-commerce-cart="${hash}">
	<span class="cnt">${cart.count}</span>
</a>`;
}

// ---------------------------------------------------------------- страница корзины
export function basketCart(hash, cart) {
  if (!cart.count) {
    return `<div class="basket_details" data-commerce-cart="${hash}">
	<p class="alert alert-info">Корзина пуста</p>
</div>`;
  }
  const rows = cart.items
    .map(
      (r) => `<li data-commerce-row="${r.row}">
		<div class="img">${r.image ? `<a href="${esc(r.path)}"><img src="${esc(r.image)}" width="98" height="65" alt=""></a>` : ''}</div>
		<h3><a href="${esc(r.path)}">${esc(r.name)}</a></h3>
		${r.option ? `<div class="option">${esc(r.option.name)}</div>` : ''}
		<div class="amount">
			<a href="#" class="btn btn-small" data-commerce-action="decrease">&minus;</a>
			<input type="text" name="count" value="${r.count}" size="3" data-commerce-action="recount" data-min="0">
			<a href="#" class="btn btn-small" data-commerce-action="increase">+</a>
			&times; ${money(r.price)} р. = <b>${money(r.total)} р.</b>
		</div>
		<a href="#" class="remove" data-commerce-action="remove">Удалить</a>
	</li>`,
    )
    .join('\n\t');
  return `<div class="basket_details" data-commerce-cart="${hash}">
	<ul class="basket_items">
	${rows}
	</ul>
	<p class="total">Итого: <b>${money(cart.total)} р.</b> <a href="#" data-commerce-action="clean" class="btn btn-small">Очистить корзину</a></p>
</div>`;
}

export function deliveryBlock(settings, selected) {
  return settings.deliveryMethods
    .map(
      (d) => `<label class="radio"><input type="radio" class="delivery" id="${d.domId}" name="delivery_method" value="${d.id}"${d.id === selected ? ' checked' : ''} required> ${esc(d.title)}${d.price ? ` — от ${money(d.price)} р.` : ''}</label>`,
    )
    .join('\n');
}

export function paymentsBlock(settings, selected) {
  return settings.paymentMethods
    .map(
      (p) => `<label class="radio"><input type="radio" id="${p.domId}" name="payment_method" value="${p.id}"${p.id === selected ? ' checked' : ''}> ${esc(p.title)}</label>`,
    )
    .join('\n');
}

export function orderForm(settings, { hash = 'order', values = {}, errors = {} } = {}) {
  const field = (name, label, { required = false, type = 'text', textarea = false } = {}) => {
    const err = errors[name] ? `<span class="help-inline error">${esc(errors[name])}</span>` : '';
    const input = textarea
      ? `<textarea name="${name}" id="order_${name}"${required ? ' required' : ''}>${esc(values[name])}</textarea>`
      : `<input type="${type}" name="${name}" id="order_${name}" value="${esc(values[name])}"${required ? ' required' : ''}>`;
    return `<div class="control-group${err ? ' error' : ''}">
	<label class="control-label" for="order_${name}">${label}${required ? '<sup class="required">*</sup>' : ''}</label>
	<div class="controls">${input}${err}</div>
</div>`;
  };
  return `<form method="post" action="/basket" id="order_form" data-commerce-order="${hash}">
	<input type="hidden" name="formid" value="order">
	<hr><h2>Оформление заказа</h2>
	${errors._form ? `<p class="alert alert-error">${esc(errors._form)}</p>` : ''}
	${field('name', 'Имя', { required: true })}
	${field('phone', 'Телефон', { required: true })}
	${field('email', 'E-mail', { type: 'email' })}
	<h3>Способ доставки</h3>
	<div data-commerce-deliveries>${deliveryBlock(settings, values.delivery_method)}</div>
	${errors.delivery_method ? `<span class="help-inline error">${esc(errors.delivery_method)}</span>` : ''}
	<div id="addr">${field('address', 'Адрес доставки')}</div>
	<div id="pay_block"><h3>Способ оплаты</h3>
	<div data-commerce-payments>${paymentsBlock(settings, values.payment_method)}</div>
	${errors.payment_method ? `<span class="help-inline error">${esc(errors.payment_method)}</span>` : ''}</div>
	${field('comment', 'Комментарий к заказу', { textarea: true })}
	<div class="control-group">Нажимая кнопку, вы принимаете условия <a href="/politika-konfidencialnosti" target="_blank">обработки данных</a>.</div>
	<button type="submit" class="btn btn-large btn-med">Оформить заказ</button>
</form>`;
}

export function orderSuccess(order) {
  return `<div class="alert alert-success">
	<h2>Спасибо! Заказ №${order.id} оформлен.</h2>
	<p>Сумма заказа: <b>${money(order.total)} р.</b>${order.deliveryPrice ? ` (включая доставку ${money(order.deliveryPrice)} р.)` : ''}</p>
	<p>Наш менеджер свяжется с вами по телефону ${esc(order.customer.phone)} для подтверждения.</p>
</div>
<p><a href="/katalog-meda">Вернуться в каталог</a></p>`;
}

// ---------------------------------------------------------------- формы /ajax.php
/** Ответ FormLister при ошибке: форма заново, с сообщениями. */
export function ctaFormWithErrors(values, errors) {
  const group = (name, label) => `<div class="control-group${errors[name] ? ' error' : ''}">
		<label class="control-label" for="fld_${name}">${label}<sup class="required">*</sup></label>
		<div class="controls">
			<input type="text" name="${name}" id="fld_${name}" required value="${esc(values[name])}">
			${errors[name] ? `<span class="help-inline">${esc(errors[name])}</span>` : ''}
		</div>
	</div>`;
  return `<h2>Мы вам перезвоним</h2>
<form method="post" id="cta_form">
	<input type="hidden" name="formid" value="cta_form">
	${group('name', 'Имя')}
	${group('phone', 'Телефон')}
	<div class="control-group">Нажимая кнопку, вы принимаете условия <a href="/politika_konfidencialnosti/" target="_blank">обработки данных</a>.</div>
	<div class="control-group"><div class="controls" style="text-align: right">
		<button style="width: 100%; height: 40px; " type="submit" class="btn btn-med">Перезвонить</button>
	</div></div>
</form>`;
}

export function fbFormWithErrors(values, errors) {
  const group = (name, label, id, { required, type = 'text', textarea } = {}) => `<div class="control-group${errors[name] ? ' error' : ''}">
	<label class="control-label" for="${id}">${label}${required ? '<sup class="required">*</sup>' : ''}</label>
	<div class="controls">
		${textarea ? `<textarea name="${name}" id="${id}"${required ? ' required' : ''}>${esc(values[name])}</textarea>` : `<input type="${type}" name="${name}" id="${id}" value="${esc(values[name])}"${required ? ' required' : ''}>`}
		${errors[name] ? `<span class="help-inline">${esc(errors[name])}</span>` : ''}
	</div>
</div>`;
  return `<h2>Форма обратной связи</h2>
<form class="form-horizontal" method="post" id="fb_form">
	<input type="hidden" name="formid" value="fb_form">
	${group('name', 'Имя', 'field_imya', { required: true })}
	${group('email', 'Email', 'field_asd98jf', { type: 'email' })}
	${group('phone', 'Телефон', 'field_telefon')}
	${group('message', 'Сообщение', 'field_soobshchenie', { required: true, textarea: true })}
	<div class="control-group"><div class="controls">
		<button type="submit" class="btn btn-primary" name="otpravit" id="field_otpravit">Отправить</button>
	</div></div>
</form>`;
}

// ---------------------------------------------------------------- поиск
export function searchResults(query, products) {
  const cards = products
    .map(
      (p) => `<div class="cel">
	<div class="price"><span class="cwrap">${p.price != null ? `<b>${money(p.price)}</b> р.${p.listUnit ? ` <b>/</b> ${esc(p.listUnit)}` : ''}` : ''}</span></div>
	<a href="${esc(p.path)}">
		<div class="img">${p.image?.thumb ? `<img src="${esc(p.image.thumb)}" class="ib" width="196" height="130" alt="">` : ''}</div>
		<div class="name">${esc(p.name)}</div>
	</a>
</div>`,
    )
    .join('\n');
  return `<div class="sotheader"><h1>Поиск: «${esc(query)}»</h1></div>
${products.length ? `<p>Найдено: ${products.length}</p><div class="catalog_list">${cards}</div>` : '<p class="alert alert-info">Ничего не найдено</p>'}`;
}

// ---------------------------------------------------------------- шаблон страницы
/**
 * Берёт HTML страницы из зеркала и подменяет содержимое основного блока
 * (между <div id="wrap"> и <div class="prefooter">) — так динамические страницы мока
 * выглядят как сайт.
 */
export function inLayout(templateHtml, { title, body }) {
  let html = templateHtml.replace(
    /(<div id="wrap">)[\s\S]*?(<div class="prefooter">)/,
    (_, open, close) => `${open}\n<div class="text">\n${body}\n</div>\n<div class="clrfooter clr"></div>\n</div>\n${close}`,
  );
  if (title) html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)} — Дом мёда (mock)</title>`);
  return html;
}
