"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cart, totals, useCart } from "@/components/cart/store";
import { Qty } from "@/components/cart/qty";
import { Photo } from "@/components/photo";
import { Area, Consent, Field } from "@/components/forms/field";
import { useSubmit } from "@/components/forms/use-submit";
import { IconClose } from "@/components/icons";
import { plural, price } from "@/lib/format";
import { readOrder, validateOrder } from "@/lib/validation";
import type { DeliveryMethod, PaymentMethod } from "@/lib/site";

const BAG = { id: 611, price: 15, title: "Фирменный пакет «Дом мёда»" };
export const LAST_ORDER_KEY = "dm-last-order";

export function Checkout({ deliveries, payments, phone }: { deliveries: DeliveryMethod[]; payments: PaymentMethod[]; phone: { tel: string; display: string } }) {
  const { lines } = useCart();
  const { count, sum } = totals(lines);
  const router = useRouter();
  const [delivery, setDelivery] = useState<string>(deliveries[0].id);
  const [payment, setPayment] = useState<string>("");
  const [bag, setBag] = useState(false);
  const { status, errors, submit } = useSubmit<{ id: string }>("/api/orders");

  const d = deliveries.find((x) => x.id === delivery)!;
  const allowedPayments = payments.filter((p) => d.payments.includes(p.id));
  const goods = sum + (bag ? BAG.price : 0);

  if (count === 0 && status !== "sending") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="t-h2">В корзине пока пусто</p>
        <p className="mt-4 text-ink-2">Загляните в каталог — у нас больше десяти сортов, от прозрачной акации до терпкой гречихи.</p>
        <Link href="/katalog-meda" className="btn btn-primary mt-8">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const body = {
      ...fd,
      delivery,
      payment: d.payments.length ? payment : "",
      lines: [...lines.map((l) => ({ id: l.id, optionIndex: l.optionIndex, count: l.count })), ...(bag ? [{ id: BAG.id, optionIndex: null, count: 1 }] : [])],
    };
    const order = await submit(body, (b) => validateOrder(readOrder(b)));
    if (order) {
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
      } catch {
        // без sessionStorage страница «спасибо» покажет общий текст
      }
      cart.clear();
      router.push("/basket/success");
    } else {
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"], [data-invalid]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-12 lg:grid-cols-12 lg:gap-14">
      <div className="min-w-0 space-y-12 lg:col-span-7">
        {/* Состав */}
        <section aria-labelledby="h-items">
          <h2 id="h-items" className="t-h3">
            Ваш заказ <span className="text-ink-3">· {count} {plural(count, "товар", "товара", "товаров")}</span>
          </h2>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {lines.map((l) => (
              <li key={l.key} className="relative flex gap-4 py-5">
                <Link href={l.path} className="w-20 shrink-0 md:w-24">
                  <Photo img={l.image} alt="" sizes="96px" className="rounded-[8px]" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 pr-10 sm:pr-0">
                    <Link href={l.path} className="font-medium leading-snug hover:text-brown">
                      {l.name}
                    </Link>
                    <p className="num text-sm text-ink-3">
                      {l.optionLabel ? `${l.optionLabel} · ` : ""}
                      {price(l.price)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-5">
                    <Qty size="sm" value={l.count} min={1} onChange={(n) => cart.setCount(l.key, n)} />
                    <p className="num text-right font-medium sm:w-24">{price(l.price * l.count)}</p>
                    <button
                      type="button"
                      onClick={() => cart.remove(l.key)}
                      className="absolute right-0 top-3 grid size-11 place-items-center rounded-full text-ink-3 hover:bg-paper hover:text-ink sm:static sm:size-9"
                      aria-label={`Убрать ${l.name}`}
                    >
                      <IconClose className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-[15px]">
            <input type="checkbox" checked={bag} onChange={(e) => setBag(e.target.checked)} className="size-5 accent-[var(--color-brown)]" />
            <span>
              Добавить фирменный пакет «Дом мёда» — <span className="tabular-nums">{price(BAG.price)}</span>
            </span>
          </label>
        </section>

        {/* Контакты */}
        <section aria-labelledby="h-contacts" className="space-y-4">
          <h2 id="h-contacts" className="t-h3">
            Контакты
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field form="order" label="Имя" name="name" autoComplete="name" error={errors.name} />
            <Field form="order" label="Телефон" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 (___) ___-__-__" error={errors.phone} />
          </div>
          <Field form="order" label="E-mail" name="email" type="email" autoComplete="email" optional error={errors.email} />
        </section>

        {/* Получение */}
        <section aria-labelledby="h-delivery" className="space-y-4">
          <h2 id="h-delivery" className="t-h3">
            Как получить
          </h2>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-labelledby="h-delivery">
            {deliveries.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={x.id === delivery}
                onClick={() => {
                  setDelivery(x.id);
                  if (!x.payments.includes(payment)) setPayment("");
                }}
                className="chip w-full !justify-start !py-3 sm:!min-h-[92px]"
              >
                <span className="text-[15px] font-medium leading-snug">{x.title.replace(/\s*\(.*\)$/, "")}</span>
                <span className="mt-1 text-[13px] text-ink-3">{x.price ? `от ${price(x.price)}` : "бесплатно"}</span>
              </button>
            ))}
          </div>
          {errors.delivery && <p className="text-sm text-error">{errors.delivery}</p>}
          {d.needsAddress ? (
            <>
              <Field form="order" label="Адрес доставки" name="address" autoComplete="street-address" placeholder="Улица, дом, квартира" error={errors.address} />
              <p className="text-sm text-ink-3">Доставляем по будням с 10:00 до 20:00. Стоимость зависит от загруженности курьеров — менеджер подтвердит её при звонке.</p>
            </>
          ) : (
            <p className="rounded-[var(--radius-ui)] bg-paper px-4 py-3 text-[15px] text-ink-2">
              Москва, ул. Новокузнецкая, 5, стр. 1 · Пн–Сб 9:00–20:00, Вс 10:00–20:00. Оплата при получении в магазине.
            </p>
          )}
        </section>

        {/* Оплата */}
        {allowedPayments.length > 0 && (
          <section aria-labelledby="h-pay" className="space-y-4">
            <h2 id="h-pay" className="t-h3">
              Оплата
            </h2>
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-labelledby="h-pay" data-invalid={errors.payment ? "" : undefined}>
              {allowedPayments.map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={x.id === payment} onClick={() => setPayment(x.id)} className={`chip w-full !py-3 ${errors.payment ? "!border-error" : ""}`}>
                  <span className="text-[15px] font-medium leading-snug">{x.title}</span>
                </button>
              ))}
            </div>
            {errors.payment && <p className="text-sm text-error">{errors.payment}</p>}
          </section>
        )}

        <Area form="order" label="Комментарий к заказу" name="comment" optional placeholder="Удобное время доставки, пожелания" />
      </div>

      {/* Итог */}
      <aside className="min-w-0 lg:col-span-5">
        <div className="space-y-4 rounded-[14px] bg-paper p-6 md:p-8 lg:sticky lg:top-28">
          <p className="t-h3">Итого</p>
          <dl className="space-y-2.5 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-2">Товары</dt>
              <dd className="tabular-nums">{price(sum)}</dd>
            </div>
            {bag && (
              <div className="flex justify-between">
                <dt className="text-ink-2">Пакет</dt>
                <dd className="tabular-nums">{price(BAG.price)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-2">{d.needsAddress ? "Доставка" : "Самовывоз"}</dt>
              <dd className="tabular-nums">{d.price ? `от ${price(d.price)}` : "бесплатно"}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-4">
            <span className="whitespace-nowrap font-medium">{d.price ? "Итого с доставкой" : "К оплате"}</span>
            <span className="font-display text-[2.2rem] leading-none num">
              {d.price ? <span className="text-[1.2rem] text-ink-3">от </span> : null}
              {price(goods + d.price)}
            </span>
          </div>
          {errors._form && <p className="text-sm text-error">{errors._form}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={status === "sending"}>
            {status === "sending" ? "Отправляем заказ…" : "Оформить заказ"}
          </button>
          <Consent action="оформляя заказ" />
          <p className="text-[13px] text-ink-3">
            Менеджер позвонит, чтобы подтвердить заказ и время доставки. Удобнее по телефону?{" "}
            <a href={`tel:${phone.tel}`} className="text-ink underline underline-offset-2">
              {phone.display}
            </a>
          </p>
        </div>
      </aside>
    </form>
  );
}
