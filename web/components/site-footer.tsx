/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { site } from "@/lib/site";

const COLS = [
  {
    title: "Каталог",
    links: [
      { title: "Сорта мёда", path: "/katalog-meda" },
      { title: "Мёд в сотах", path: "/katalog-meda/myod-v-sotah" },
      { title: "Продукты пчеловодства", path: "/katalog-meda/produkty-pchelovodstva" },
      { title: "Сувенирная коллекция", path: "/katalog-meda/suvenirnaya-kollekciya" },
      { title: "Пчеловодам", path: "/pchelovodam" },
    ],
  },
  {
    title: "Покупателям",
    links: [
      { title: "Доставка и оплата", path: "/about/oplata_i_dostavka" },
      { title: "О магазине", path: "/about" },
      { title: "Договор оферты", path: "/dogovor-oferty" },
      { title: "Политика конфиденциальности", path: "/politika-konfidencialnosti" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-3 md:gap-x-10 md:py-20 lg:grid-cols-12 lg:gap-12">
        <div className="col-span-2 md:col-span-3 lg:col-span-4">
          <img src="/brand/emblem.png" alt="" width={189} height={120} className="h-16 w-auto" />
          <p className="mt-5 max-w-xs font-display text-2xl leading-snug">Специализированный магазин мёда и продуктов пчеловодства</p>
          <p className="mt-3 text-sm text-ink-3">Основан в 1991 году</p>
        </div>
        {COLS.map((col) => (
          <nav key={col.title} className="col-span-1 lg:col-span-2" aria-label={col.title}>
            <p className="t-eyebrow mb-4">{col.title}</p>
            <ul className="text-[15px] text-ink-2">
              {col.links.map((l) => (
                <li key={l.path}>
                  <Link href={l.path} className="inline-block py-1.5 leading-snug hover:text-ink md:py-1">
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="col-span-2 md:col-span-1 lg:col-span-4">
          <p className="t-eyebrow mb-4">Магазин</p>
          <address className="space-y-2.5 text-[15px] not-italic text-ink-2">
            <p>
              <a href={site.address.mapUrl} target="_blank" rel="noopener" className="hover:text-ink">
                {site.address.city}, {site.address.street}
              </a>
            </p>
            <p>
              {site.workHours.map((h) => (
                <span key={h.days} className="block">
                  {h.days}: {h.from}–{h.to}
                </span>
              ))}
            </p>
            <p className="pt-1">
              {site.phones.slice(0, 2).map((p) => (
                <a key={p.display} href={`tel:${p.tel}`} className="block py-1 text-[17px] text-ink tabular-nums hover:text-brown md:py-0 md:text-[15px]">
                  {p.display}
                </a>
              ))}
            </p>
            <p>
              <a href={`mailto:${site.email}`} className="hover:text-ink">
                {site.email}
              </a>
            </p>
          </address>
          <div className="mt-4 flex gap-5 text-sm text-ink-2">
            <a href="https://vk.com/dommeda" target="_blank" rel="noopener" className="link-u inline-block py-2">
              ВКонтакте
            </a>
            <a href="http://www.odnoklassniki.ru/dommeda.ru" target="_blank" rel="noopener" className="link-u inline-block py-2">
              Одноклассники
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-[13px] text-ink-3 lg:flex-row lg:justify-between">
          <p>© 2013–2026 Дом мёда · {site.legal.company}, ОГРН {site.legal.ogrn}</p>
          <p>Прототип новой версии сайта</p>
        </div>
      </div>
    </footer>
  );
}
