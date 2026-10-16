// Правила форм — общие для браузера и API (app/api/*). Повторяют мок-бэкенд и старый сайт:
// заказ: имя*, телефон*, способ доставки*, адрес* (если доставка), оплата* (если доступна для доставки);
// обратный звонок: имя*, телефон*; обратная связь: имя*, сообщение*, e-mail/телефон — по желанию.
import { site } from "@/lib/site";

export type Errors = Record<string, string>;

const PHONE_RE = /^[+\d][\d\s()-]{9,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function phoneError(v: string, required: boolean) {
  if (!v) return required ? "Укажите телефон" : null;
  return PHONE_RE.test(v) && v.replace(/\D/g, "").length >= 10 ? null : "Проверьте номер телефона";
}

export type OrderInput = {
  name: string;
  phone: string;
  email: string;
  delivery: string;
  address: string;
  payment: string;
  comment: string;
};

export function readOrder(body: Record<string, unknown>): OrderInput {
  return {
    name: s(body.name),
    phone: s(body.phone),
    email: s(body.email),
    delivery: s(body.delivery),
    address: s(body.address),
    payment: s(body.payment),
    comment: s(body.comment),
  };
}

export function validateOrder(v: OrderInput): Errors {
  const e: Errors = {};
  if (!v.name) e.name = "Как к вам обращаться?";
  const ph = phoneError(v.phone, true);
  if (ph) e.phone = ph;
  if (v.email && !EMAIL_RE.test(v.email)) e.email = "Проверьте e-mail";
  const d = site.deliveryMethods.find((x) => x.id === v.delivery);
  if (!d) e.delivery = "Выберите способ получения";
  else {
    if (d.needsAddress && !v.address) e.address = "Укажите адрес доставки";
    if (d.payments.length && !d.payments.includes(v.payment)) e.payment = "Выберите способ оплаты";
  }
  return e;
}

export function validateCallback(body: Record<string, unknown>): Errors {
  const e: Errors = {};
  if (!s(body.name)) e.name = "Как к вам обращаться?";
  const ph = phoneError(s(body.phone), true);
  if (ph) e.phone = ph;
  return e;
}

export function validateFeedback(body: Record<string, unknown>): Errors {
  const e: Errors = {};
  if (!s(body.name)) e.name = "Как к вам обращаться?";
  if (!s(body.message)) e.message = "Напишите сообщение";
  const em = s(body.email);
  if (em && !EMAIL_RE.test(em)) e.email = "Проверьте e-mail";
  const ph = phoneError(s(body.phone), false);
  if (ph) e.phone = ph;
  return e;
}
