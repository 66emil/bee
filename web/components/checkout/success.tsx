"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { IconCheck } from "@/components/icons";
import { price } from "@/lib/format";
import { LAST_ORDER_KEY } from "./checkout";

type Order = {
  id: string;
  customer: { name: string; phone: string };
  delivery: { title: string; address: string | null; priceFrom: number };
  payment: { title: string } | null;
  items: { id: number; name: string; option: string | null; count: number; total: number }[];
  subtotal: number;
};

const read = () => {
  try {
    return sessionStorage.getItem(LAST_ORDER_KEY);
  } catch {
    return null;
  }
};

export function OrderSuccess({ phone }: { phone: { tel: string; display: string } }) {
  const raw = useSyncExternalStore(() => () => {}, read, () => null);
  const order: Order | null = raw ? JSON.parse(raw) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <span className="grid size-16 place-items-center rounded-full bg-honey-soft text-brown">
        <IconCheck className="size-8" />
      </span>
      <h1 className="t-h1 mt-6">Спасибо, заказ принят</h1>
      {order ? (
        <>
          <p className="t-lead mt-4">
            Номер заказа <span className="font-medium text-ink">{order.id}</span>. {order.customer.name}, мы позвоним по номеру {order.customer.phone}, чтобы подтвердить состав и время.
          </p>
          <div className="mt-10 rounded-[14px] bg-paper p-6 md:p-8">
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id + (i.option ?? "")} className="flex justify-between gap-4 py-3 text-[15px]">
                  <span>
                    {i.name}
                    <span className="text-ink-3">
                      {i.option ? ` · ${i.option}` : ""} × {i.count}
                    </span>
                  </span>
                  <span className="tabular-nums">{price(i.total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-ink-2">Получение</dt>
                <dd className="text-right">
                  {order.delivery.title}
                  {order.delivery.address ? <span className="block text-ink-3">{order.delivery.address}</span> : null}
                </dd>
              </div>
              {order.payment && (
                <div className="flex justify-between">
                  <dt className="text-ink-2">Оплата</dt>
                  <dd>{order.payment.title}</dd>
                </div>
              )}
              <div className="flex justify-between pt-2 font-medium">
                <dt>Товары на сумму</dt>
                <dd className="tabular-nums">{price(order.subtotal)}</dd>
              </div>
            </dl>
          </div>
        </>
      ) : (
        <p className="t-lead mt-4">Мы скоро позвоним, чтобы подтвердить заказ.</p>
      )}
      <p className="mt-8 text-ink-2">
        Если что-то нужно изменить — позвоните:{" "}
        <a href={`tel:${phone.tel}`} className="text-ink underline underline-offset-4">
          {phone.display}
        </a>
      </p>
      <Link href="/katalog-meda" className="btn btn-ghost mt-8">
        Вернуться в каталог
      </Link>
    </div>
  );
}
