// Заказы, заявки на обратный звонок, сообщения обратной связи.
// Валидация общая для легаси-форм (ajax.php, POST /basket) и для REST API.
import { httpError } from '../http.js';
import { round2 } from './cart.js';

const PHONE_RE = /^[+\d][\d\s()\-]{5,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trim = (v) => (typeof v === 'string' ? v.trim() : v ?? '');

/**
 * kind = 'callback': имя*, телефон*            (форма «Обратный звонок», #cta_form)
 * kind = 'feedback': имя*, сообщение*, email/телефон — по желанию (#fb_form на /contacts)
 */
export function validateContact(input, kind) {
  const v = {
    name: trim(input.name),
    phone: trim(input.phone),
    email: trim(input.email),
    message: trim(input.message),
  };
  const errors = {};
  if (!v.name) errors.name = 'Введите имя';
  if (kind === 'callback' && !v.phone) errors.phone = 'Введите телефон';
  else if (v.phone && !PHONE_RE.test(v.phone)) errors.phone = 'Неверный формат телефона';
  if (v.email && !EMAIL_RE.test(v.email)) errors.email = 'Неверный формат e-mail';
  if (kind === 'feedback' && !v.message) errors.message = 'Введите сообщение';
  return { values: v, errors };
}

export function createOrderService(store, carts) {
  const { settings } = store;

  function validateOrder(input) {
    const values = {
      name: trim(input.name ?? input.customer?.name),
      phone: trim(input.phone ?? input.customer?.phone),
      email: trim(input.email ?? input.customer?.email),
      delivery_method: trim(input.delivery_method ?? input.delivery?.method),
      payment_method: trim(input.payment_method ?? input.payment?.method),
      address: trim(input.address ?? input.delivery?.address),
      comment: trim(input.comment),
    };
    const errors = {};
    if (!values.name) errors.name = 'Введите имя';
    if (!values.phone) errors.phone = 'Введите телефон';
    else if (!PHONE_RE.test(values.phone)) errors.phone = 'Неверный формат телефона';
    if (values.email && !EMAIL_RE.test(values.email)) errors.email = 'Неверный формат e-mail';

    const delivery = settings.deliveryMethods.find((d) => d.id === values.delivery_method);
    if (!delivery) errors.delivery_method = 'Выберите способ доставки';
    else {
      if (delivery.needsAddress && !values.address) errors.address = 'Укажите адрес доставки';
      if (delivery.payments.length) {
        if (!values.payment_method) errors.payment_method = 'Выберите способ оплаты';
        else if (!delivery.payments.includes(values.payment_method))
          errors.payment_method = 'Этот способ оплаты недоступен для выбранной доставки';
      }
    }
    return { values, errors, delivery };
  }

  function create(sid, input, { source = 'site' } = {}) {
    const { values, errors, delivery } = validateOrder(input);
    const cart = carts.view(sid);
    if (!cart.count) errors._form = 'Корзина пуста';
    if (Object.keys(errors).length) throw httpError(422, 'Ошибка валидации', { values, errors });

    const payment = settings.paymentMethods.find((p) => p.id === values.payment_method) || null;
    const order = {
      id: store.nextOrderId(),
      createdAt: new Date().toISOString(),
      status: 'new',
      source,
      customer: { name: values.name, phone: values.phone, email: values.email || null },
      delivery: {
        method: delivery.id,
        title: delivery.title,
        address: delivery.needsAddress ? values.address : null,
        price: delivery.price,
      },
      payment: delivery.payments.length && payment ? { method: payment.id, title: payment.title } : null,
      comment: values.comment || null,
      items: cart.items.map((r) => ({
        productId: r.id,
        name: r.name,
        option: r.option,
        price: r.price,
        count: r.count,
        total: r.total,
      })),
      subtotal: cart.total,
      deliveryPrice: delivery.price,
      total: round2(cart.total + delivery.price),
      currency: 'RUB',
    };
    store.state.orders.push(order);
    carts.clean(sid);
    store.save();
    return order;
  }

  function createCallback(input, source = 'site') {
    const { values, errors } = validateContact(input, 'callback');
    if (Object.keys(errors).length) throw httpError(422, 'Ошибка валидации', { values, errors });
    const item = { id: store.state.callbackRequests.length + 1, createdAt: new Date().toISOString(), name: values.name, phone: values.phone, source, status: 'new' };
    store.state.callbackRequests.push(item);
    store.save();
    return item;
  }

  function createFeedback(input, source = 'site') {
    const { values, errors } = validateContact(input, 'feedback');
    if (Object.keys(errors).length) throw httpError(422, 'Ошибка валидации', { values, errors });
    const item = {
      id: store.state.feedback.length + 1,
      createdAt: new Date().toISOString(),
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      message: values.message,
      source,
    };
    store.state.feedback.push(item);
    store.save();
    return item;
  }

  return { validateOrder, create, createCallback, createFeedback };
}
