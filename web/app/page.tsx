import Link from "next/link";
import { Photo } from "@/components/photo";
import { BuyBox } from "@/components/buy-box";
import { HoneyScale } from "@/components/honey-scale";
import { SectionHead, SectionLink } from "@/components/breadcrumbs";
import { Hex, IconArrow, IconSpoon, IconStore, IconTruck } from "@/components/icons";
import { categoryProducts, getCategoryByPath, getProduct, minPrice, type Product } from "@/lib/catalog";
import { plural, price } from "@/lib/format";
import { TASTES, VARIETIES, type Taste } from "@/lib/varieties";
import { mainPhone, site } from "@/lib/site";
import { shopPhotos } from "@/lib/content";

const HERO = [
  { id: 466, slug: "akacievyj-myod", caption: "Акациевый", tone: "светлый", color: "#f4e4a8" },
  { id: 452, slug: "dyagilevyj-myod", caption: "Дягилевый", tone: "янтарный", color: "#c47a26" },
  { id: 454, slug: "grechishnyj-myod", caption: "Гречишный", tone: "тёмный", color: "#5e2e10" },
];

const FRESH: { id: number; note: string }[] = [
  { id: 641, note: "Первый мёд нового сезона: свежий, нежный, с цветочным ароматом." },
  { id: 466, note: "Нежный и прозрачный, с лёгким цветочным ароматом и сливочным послевкусием." },
];

const MORE = ["myod-v-sotah", "produkty-pchelovodstva", "suvenirnaya-kollekciya"];
const BEE_TILES = ["medogonki", "dymari", "odezhda-i-tekstil", "inventar-obshhego-naznacheniya"];
const TASTE_KEYS = Object.keys(TASTES) as Taste[];

const buyProps = (p: Product) => ({
  id: p.id,
  name: p.name,
  path: p.path,
  price: p.price,
  options: p.options,
  image: p.images[0] ?? null,
  available: p.available,
});

/** Горизонтальная лента на телефоне, сетка с sm — один приём для всех «каруселей» */
const RAIL = "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 no-scrollbar sm:mx-0 sm:grid sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0";

export default function Home() {
  const varieties = VARIETIES.map((v) => {
    const cat = getCategoryByPath(`/katalog-meda/${v.slug}`)!;
    const items = categoryProducts(cat);
    const prices = items.map(minPrice).filter((x): x is number => x != null);
    return { ...v, cover: getProduct(v.coverId)!, count: items.length, from: Math.min(...prices) };
  });
  const honeyCount = categoryProducts(getCategoryByPath("/katalog-meda")!).length;

  return (
    <>
      {/* ---------- Первый экран. На телефоне: заголовок → банки → текст → кнопки ---------- */}
      <section className="container-x grid pb-14 pt-7 md:pt-14 lg:grid-cols-12 lg:gap-x-12 lg:pb-24">
        <div className="lg:col-span-6 lg:row-start-1 lg:self-end xl:col-span-5">
          <p className="t-eyebrow">
            <span className="md:hidden lg:inline xl:hidden">С 1991 года · Новокузнецкая, 5</span>
            <span className="hidden md:inline lg:hidden xl:inline">Магазин мёда на Новокузнецкой · с 1991 года</span>
          </p>
          <h1 className="t-display mt-4 text-balance md:mt-5">
            Найдите <em className="font-display italic text-brown">свой</em> мёд
          </h1>
        </div>

        <div className="mt-7 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center xl:col-span-7 xl:col-start-6">
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {HERO.map((h, i) => (
              <Link key={h.id} href={`/katalog-meda/${h.slug}`} className={`group block ${i === 1 ? "lg:translate-y-8" : ""}`}>
                <Photo
                  img={getProduct(h.id)!.images[0]}
                  alt={`${h.caption} мёд`}
                  sizes="(min-width: 1024px) 20vw, 33vw"
                  ratio="3 / 4"
                  position="80% 50%"
                  eager
                  className="rounded-[var(--radius-ui)]"
                  imgClassName="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                />
                <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-ink-2 md:mt-3 md:gap-2 md:text-sm">
                  <Hex className="size-3 shrink-0 md:size-3.5" fill={h.color} />
                  <span>
                    <span className="text-ink">{h.caption}</span>
                    <span className="hidden sm:inline"> · {h.tone}</span>
                  </span>
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-7 lg:col-span-6 lg:row-start-2 lg:mt-6 lg:self-start xl:col-span-5">
          <p className="t-lead max-w-[36ch] text-pretty">
            От прозрачной акации до терпкой гречихи — мёд с лучших пасек страны. Каждый сорт можно попробовать в нашем магазине или заказать с доставкой по Москве.
          </p>
          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
            <Link href="/katalog-meda" className="btn btn-primary">
              Выбрать мёд <IconArrow />
            </Link>
            <Link href="#sorta" className="btn btn-ghost">
              Как подобрать сорт
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Факты вместо лозунгов ---------- */}
      <section className="border-y border-line">
        <dl className="container-x grid grid-cols-2 gap-x-5 gap-y-7 py-9 md:gap-x-8 md:py-12 lg:grid-cols-4 lg:gap-x-6">
          {[
            ["1991", "год, когда открылся Дом мёда"],
            ["XIX век", "особняк в центре Москвы, где находится магазин"],
            ["Дегустация", "каждого сорта — консультанты помогут с выбором"],
            [`${honeyCount}`, `${plural(honeyCount, "позиция", "позиции", "позиций")} мёда и продуктов пчеловодства круглый год`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-display text-[1.85rem] leading-none md:text-[2.25rem] lg:text-[2.5rem]">{k}</dt>
              <dd className="mt-2 max-w-[24ch] text-[14px] leading-snug text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------- Сорта: различие по цвету и вкусу ---------- */}
      <section id="sorta" className="container-x scroll-mt-24 py-16 md:py-28">
        <SectionHead
          eyebrow="Сорта мёда"
          title="От светлого к тёмному"
          action={<p className="max-w-md text-[16px] text-ink-2 md:text-[17px]">Чем темнее мёд, тем насыщеннее вкус. Выберите по цвету или по характеру — а в магазине каждый сорт можно попробовать.</p>}
        />
        <HoneyScale items={VARIETIES} />

        {/* Телефон и планшет: список по вкусу, как меню дегустации */}
        <div className="mt-6 space-y-9 lg:hidden">
          {TASTE_KEYS.map((t) => (
            <div key={t}>
              <h3 className="t-h3">{TASTES[t].title}</h3>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-3">{TASTES[t].hint}</p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {varieties
                  .filter((v) => v.taste === t)
                  .map((v) => (
                    <li key={v.slug}>
                      <Link href={`/katalog-meda/${v.slug}`} className="flex items-center gap-4 py-3 active:bg-paper/60 md:gap-5">
                        <Photo img={v.cover.images[0]} alt="" sizes="96px" ratio="1 / 1" className="w-16 shrink-0 rounded-[8px] md:w-20" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-display text-[1.3rem] font-semibold leading-tight">
                            <Hex className="size-3 shrink-0" fill={v.color} /> {v.name}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-ink-2">{v.note}</p>
                        </div>
                        <p className="shrink-0 text-right text-[12px] leading-tight text-ink-3">
                          от
                          <span className="num block text-[15px] font-medium text-ink">{price(v.from)}</span>
                        </p>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Десктоп: сетка 3×3 по шкале */}
        <div className="hidden lg:block">
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-3">
            {TASTE_KEYS.map((t) => (
              <span key={t}>
                <span className="text-ink-2">{TASTES[t].title}</span> — {TASTES[t].hint.toLowerCase()}
              </span>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {varieties.map((v) => (
              <Link key={v.slug} href={`/katalog-meda/${v.slug}`} className="group">
                <div className="flex h-full gap-3.5 rounded-[var(--radius-ui)] border border-line bg-white/60 p-3.5 transition-colors hover:border-ink-3 xl:gap-4 xl:p-4">
                  <Photo img={v.cover.images[0]} alt={`${v.name} мёд`} sizes="140px" ratio="4 / 5" className="w-20 shrink-0 rounded-[8px] xl:w-28" />
                  <div className="flex min-w-0 flex-col py-1">
                    <p className="t-eyebrow">{TASTES[v.taste].one}</p>
                    <p className="mt-1 flex items-center gap-2 font-display text-[1.45rem] font-semibold leading-tight">
                      <Hex className="size-3.5 shrink-0" fill={v.color} /> {v.name}
                    </p>
                    <p className="mt-1.5 text-[14px] leading-snug text-ink-2">{v.note}</p>
                    <p className="mt-auto pt-3 text-[13px] text-ink-3">
                      от <span className="num text-ink">{price(v.from)}</span> · {v.count} {plural(v.count, "позиция", "позиции", "позиций")}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Свежий сбор ---------- */}
      <section className="bg-paper py-16 md:py-28">
        <div className="container-x">
          <SectionHead eyebrow="Новый урожай" title="Свежий сбор 2026" action={<SectionLink href="/katalog-meda">Весь каталог</SectionLink>} />
          <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-2 md:gap-8">
            {FRESH.map(({ id, note }) => {
              const p = getProduct(id)!;
              return (
                <article key={id} className="flex flex-col overflow-hidden rounded-[14px] bg-cream">
                  <Link href={p.path} className="group block overflow-hidden">
                    <Photo img={p.images[0]} alt={p.name} sizes="(min-width: 768px) 45vw, 100vw" ratio="16 / 10" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
                  </Link>
                  <div className="flex flex-1 flex-col p-5 md:p-8">
                    <p className="text-[13px] text-ink-3">
                      <span className="text-honey">●</span> Свежий сбор
                    </p>
                    <h3 className="mt-2 font-display text-[1.8rem] font-semibold leading-tight md:text-[2.1rem]">
                      <Link href={p.path} className="hover:text-brown">
                        {p.name}
                      </Link>
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{note}</p>
                    <div className="mt-auto pt-5 sm:max-w-md md:pt-6">
                      <BuyBox p={buyProps(p)} compact />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Не только мёд ---------- */}
      <section className="container-x py-16 md:py-28">
        <SectionHead eyebrow="Не только мёд" title="Соты, перга и подарки" />
        <div className={`mt-8 md:mt-10 sm:grid-cols-3 sm:gap-6 ${RAIL}`}>
          {MORE.map((slug) => {
            const cat = getCategoryByPath(`/katalog-meda/${slug}`)!;
            const items = categoryProducts(cat);
            const cover = items.find((p) => p.images[0]?.cutout) ?? items.find((p) => p.images[0]) ?? items[0];
            return (
              <Link key={slug} href={cat.path} className="group w-[68%] shrink-0 snap-start sm:w-auto">
                <Photo img={cover?.images[0]} alt={cat.title} sizes="(min-width: 640px) 33vw, 70vw" ratio="4 / 3" className="rounded-[var(--radius-ui)]" imgClassName="transition-transform duration-700 group-hover:scale-[1.04]" />
                <p className="mt-3 font-display text-[1.35rem] font-semibold leading-tight md:mt-4 md:text-[1.4rem]">{cat.title}</p>
                <p className="text-[13px] text-ink-3">
                  {items.length} {plural(items.length, "позиция", "позиции", "позиций")}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- Магазин и дегустация: доверие через конкретику ---------- */}
      <section className="bg-brown text-cream">
        <div className="container-x grid gap-9 py-16 md:py-28 lg:grid-cols-12 lg:gap-14">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <p className="t-eyebrow !text-honey-soft/70">Дом мёда на Новокузнецкой</p>
            <h2 className="t-h2 mt-4 text-balance">Сначала попробуйте, потом выбирайте</h2>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-cream/80 md:mt-6 md:text-[17px]">
              Магазин находится в старинном особняке XIX века в центре Москвы. Консультанты предложат продегустировать каждый сорт — от широко известных липы, акации и гречихи до редких дягиля, вереска и донника.
            </p>
            <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-cream/80 md:text-[17px]">
              Собственные склады в цокольном этаже и многолетние связи с пасечными хозяйствами позволяют держать широкий ассортимент круглый год.
            </p>
            <dl className="mt-7 grid grid-cols-2 gap-5 text-[15px] md:mt-8">
              <div>
                <dt className="text-cream/55">Адрес</dt>
                <dd className="mt-1">
                  {site.address.city}, {site.address.street}
                </dd>
              </div>
              <div>
                <dt className="text-cream/55">Часы работы</dt>
                <dd className="mt-1">
                  {site.workHours.map((h) => (
                    <span key={h.days} className="block">
                      {h.days}: {h.from}–{h.to}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <a href={site.address.mapUrl} target="_blank" rel="noopener" className="btn bg-cream text-brown hover:bg-white">
                Построить маршрут
              </a>
              <a href={`tel:${mainPhone.tel}`} className="btn border border-cream/30 text-cream hover:border-cream/70">
                {mainPhone.display}
              </a>
            </div>
          </div>
          <div className="order-1 grid grid-cols-5 gap-2.5 self-center md:gap-4 lg:order-2 lg:col-span-7">
            <Photo img={shopPhotos.tasting} alt="Прилавок с подносами для дегустации мёда" sizes="(min-width: 1024px) 35vw, 60vw" ratio="4 / 5" className="col-span-3 rounded-[var(--radius-ui)]" />
            <div className="col-span-2 flex flex-col gap-2.5 md:gap-4">
              <Photo img={shopPhotos.stand} alt="Стойка с мёдом в магазине" sizes="(min-width: 1024px) 22vw, 40vw" ratio="1 / 1" className="rounded-[var(--radius-ui)]" />
              <Photo img={shopPhotos.counter} alt="Торговый зал Дома мёда" sizes="(min-width: 1024px) 22vw, 40vw" ratio="1 / 1" className="rounded-[var(--radius-ui)]" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Как получить заказ ---------- */}
      <section className="container-x py-14 md:py-20">
        <div className="grid gap-7 md:grid-cols-2 md:gap-x-10 lg:grid-cols-3">
          {[
            { icon: <IconTruck />, title: "Доставка по Москве", text: "В пределах МКАД, по будням с 10:00 до 20:00 в удобное время. Стоимость — от 350 ₽." },
            { icon: <IconStore />, title: "Самовывоз", text: `${site.address.street}. Пн–Сб 9:00–20:00, Вс 10:00–20:00. Заказ любой суммы.` },
            { icon: <IconSpoon />, title: "Заказ по телефону", text: `${mainPhone.display} — подскажем с выбором и оформим заказ за вас.` },
          ].map((x) => (
            <div key={x.title} className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-paper text-brown">{x.icon}</span>
              <div>
                <p className="font-medium">{x.title}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{x.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Пчеловодам ---------- */}
      <section className="border-t border-line py-16 md:py-28">
        <div className="container-x">
          <SectionHead eyebrow="Зал «Пчеловодное дело»" title="Всё для пасеки" action={<SectionLink href="/pchelovodam">Инвентарь и оборудование</SectionLink>} />
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 md:mt-10 md:gap-6 lg:grid-cols-4">
            {BEE_TILES.map((slug) => {
              const cat = getCategoryByPath(`/pchelovodam/${slug}`)!;
              const items = categoryProducts(cat);
              const cover = items.find((p) => p.images[0]?.cutout) ?? items[0];
              return (
                <Link key={slug} href={cat.path} className="group">
                  <Photo img={cover?.images[0]} alt={cat.title} sizes="(min-width: 1024px) 25vw, 50vw" ratio="4 / 3" className="rounded-[var(--radius-ui)]" imgClassName="transition-transform duration-700 group-hover:scale-[1.04]" />
                  <p className="mt-2.5 text-[15px] font-medium leading-snug md:mt-3 md:text-base">{cat.title}</p>
                  <p className="text-[13px] text-ink-3">
                    {items.length} {plural(items.length, "товар", "товара", "товаров")}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
