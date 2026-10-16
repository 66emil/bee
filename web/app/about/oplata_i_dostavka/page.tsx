import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { IconPhone, IconStore, IconTruck } from "@/components/icons";
import { mainPhone, site } from "@/lib/site";

export const metadata: Metadata = { title: "Доставка и оплата" };

export default function Page() {
  return (
    <div className="container-x pb-24 pt-8 md:pt-12">
      <Breadcrumbs items={[{ title: "О нас", path: "/about" }, { title: "Доставка и оплата" }]} />
      <h1 className="t-h1 mt-6">Доставка и оплата</h1>
      <p className="t-lead mt-5 max-w-[52ch]">Заказ можно оформить на любую сумму — в корзине на сайте или по телефону. Наши сотрудники свяжутся с вами и обсудят детали.</p>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        <section className="rounded-[14px] bg-paper p-6 md:p-8">
          <IconTruck className="size-7 text-brown" />
          <h2 className="t-h3 mt-5">Курьером по Москве</h2>
          <p className="mt-3 text-ink-2">В пределах МКАД, по будням с 10:00 до 20:00 в удобное для вас время.</p>
          <p className="num mt-5 font-display text-3xl">от 350 ₽</p>
          <p className="mt-1 text-sm text-ink-3">зависит от спроса и загруженности курьеров</p>
        </section>
        <section className="rounded-[14px] bg-paper p-6 md:p-8">
          <IconStore className="size-7 text-brown" />
          <h2 className="t-h3 mt-5">Самовывоз</h2>
          <p className="mt-3 text-ink-2">
            {site.address.city}, {site.address.street}. Можно продегустировать мёд перед покупкой.
          </p>
          <p className="mt-5 font-display text-3xl">бесплатно</p>
          <p className="mt-1 text-sm text-ink-3">Пн–Сб 9:00–20:00, Вс 10:00–20:00</p>
        </section>
        <section className="rounded-[14px] bg-paper p-6 md:p-8">
          <IconPhone className="size-7 text-brown" />
          <h2 className="t-h3 mt-5">По телефону</h2>
          <p className="mt-3 text-ink-2">Поможем выбрать сорт и оформим заказ за вас.</p>
          <p className="mt-5 space-y-1">
            {site.phones.slice(0, 2).map((p) => (
              <a key={p.tel} href={`tel:${p.tel}`} className="block whitespace-nowrap py-1 text-[20px] font-medium tabular-nums hover:text-brown">
                {p.display}
              </a>
            ))}
          </p>
        </section>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="t-h2">Оплата</h2>
        <p className="mt-4 text-ink-2">
          При доставке — наличными или картой курьеру. При самовывозе — в магазине. Способы оплаты на сайте — в форме заказа.{" "}
          <span className="text-ink-3">(Онлайн-оплата и точные условия — уточнить у заказчика.)</span>
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/katalog-meda" className="btn btn-primary">
            Выбрать мёд
          </Link>
          <a href={`tel:${mainPhone.tel}`} className="btn btn-ghost">
            Позвонить
          </a>
        </div>
      </section>
    </div>
  );
}
