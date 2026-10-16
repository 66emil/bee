import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CatalogBrowser } from "@/components/catalog-browser";
import { Photo } from "@/components/photo";
import { Hex } from "@/components/icons";
import { breadcrumbs, categoryProducts, childCategories, getCategory, getCategoryByPath, getProduct, type Category } from "@/lib/catalog";
import { toCard } from "@/lib/cards";
import { plural } from "@/lib/format";
import { HONEY_GRADIENT, TASTES, VARIETIES, varietyBySlug } from "@/lib/varieties";

/** Ссылки на соседние разделы: сорта и прочие категории мёда */
function HoneyNav({ current }: { current?: string }) {
  const root = getCategoryByPath("/katalog-meda")!;
  const others = childCategories(root).filter((c) => !varietyBySlug(c.slug) && categoryProducts(c).length > 0);
  return (
    <nav aria-label="Разделы каталога" className="-mx-5 overflow-x-auto px-5 no-scrollbar md:mx-0 md:px-0">
      <ul className="flex gap-2 pb-1 md:flex-wrap">
        <li>
          <Link href="/katalog-meda" aria-current={!current ? "page" : undefined} className="chip chip-sm">
            Весь мёд
          </Link>
        </li>
        {VARIETIES.map((v) => (
          <li key={v.slug}>
            <Link href={`/katalog-meda/${v.slug}`} aria-current={current === v.slug ? "page" : undefined} className="chip chip-sm !flex-row !items-center gap-2">
              <Hex className="size-3" fill={v.color} /> {v.name}
            </Link>
          </li>
        ))}
        {others.map((c) => (
          <li key={c.slug}>
            <Link href={c.path} aria-current={current === c.slug ? "page" : undefined} className="chip chip-sm">
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function CatalogRootView({ root }: { root: "honey" | "bee" }) {
  const cat = getCategoryByPath(root === "honey" ? "/katalog-meda" : "/pchelovodam")!;
  const items = categoryProducts(cat);
  let cards = items.map(toCard);

  if (root === "honey") {
    // порядок витрины: сорта от светлого к тёмному, затем соты, продукты пчеловодства, подарки
    const order = [...VARIETIES.map((v) => v.slug), "myod-v-sotah", "produkty-pchelovodstva", "suvenirnaya-kollekciya", "med-s-orehami-i-suhofruktami"];
    const rank = (id: number) => {
      const p = items.find((x) => x.id === id)!;
      const slug = getCategory(p.categoryId)?.slug ?? "";
      const i = order.indexOf(slug);
      return (i < 0 ? 99 : i) * 1000 + p.menuIndex;
    };
    cards = [...cards].sort((a, b) => rank(a.id) - rank(b.id)).map((c, i) => ({ ...c, menuIndex: i }));
    return (
      <div className="container-x pb-24 pt-8 md:pt-12">
        <Breadcrumbs items={[{ title: "Каталог мёда" }]} />
        <div className="mt-6 grid gap-6 md:grid-cols-2 md:items-end">
          <h1 className="t-h1">Каталог мёда</h1>
          <p className="text-ink-2 md:justify-self-end md:text-right">
            {items.length} {plural(items.length, "позиция", "позиции", "позиций")}: сорта мёда, мёд в сотах, продукты пчеловодства и подарки
          </p>
        </div>
        <div className="mt-8">
          <HoneyNav />
        </div>
        <div className="mt-8">
          <CatalogBrowser cards={cards} tastes={TASTES} />
        </div>
      </div>
    );
  }

  const subs = childCategories(cat).filter((s) => categoryProducts(s).length > 0);
  const announcement = cat.descriptionHtml?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return (
    <div className="container-x pb-24 pt-8 md:pt-12">
      <Breadcrumbs items={[{ title: "Пчеловодам" }]} />
      <div className="mt-6 grid gap-6 md:grid-cols-2 md:items-end">
        <div>
          <p className="t-eyebrow mb-3">Зал «Пчеловодное дело»</p>
          <h1 className="t-h1">Пчеловодам</h1>
        </div>
        <p className="max-w-md text-ink-2 md:justify-self-end">Инвентарь и оборудование для пасек. Всё можно посмотреть и подержать в руках в демонстрационном зале на Новокузнецкой.</p>
      </div>
      {announcement && (
        <p className="mt-7 flex items-start gap-3 rounded-[var(--radius-ui)] bg-honey-soft/60 px-4 py-3.5 text-[15px] leading-snug md:mt-8 md:items-center md:px-5 md:py-4">
          <span className="text-honey">●</span> {announcement.replace(/год$/, "года")} — уточняйте по телефону
        </p>
      )}
      <h2 className="t-eyebrow mb-4 mt-8 sm:mt-10">Разделы</h2>
      <div className="-mx-5 flex snap-x gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {subs.map((s) => {
          const ps = categoryProducts(s);
          const cover = ps.find((p) => p.images[0]?.cutout) ?? ps[0];
          return (
            <Link key={s.id} href={s.path} className="group w-[34%] shrink-0 snap-start sm:w-auto">
              <Photo img={cover?.images[0]} alt="" sizes="(min-width: 1024px) 16vw, 34vw" ratio="1 / 1" className="rounded-[var(--radius-ui)]" imgClassName="transition-transform duration-500 group-hover:scale-105" />
              <p className="mt-2 text-[13px] font-medium leading-snug sm:text-[14px]">{s.title}</p>
              <p className="text-[12px] text-ink-3">{ps.length}</p>
            </Link>
          );
        })}
      </div>
      <h2 className="t-h3 mb-4 mt-12 md:mt-16">Все товары</h2>
      <CatalogBrowser cards={cards} />
    </div>
  );
}

export function CategoryView({ cat }: { cat: Category }) {
  const items = categoryProducts(cat);
  const cards = items.map(toCard);
  const variety = cat.root === "honey" ? varietyBySlug(cat.slug) : null;
  const cover = variety ? getProduct(variety.coverId) : null;
  const subs = childCategories(cat).filter((s) => categoryProducts(s).length > 0);
  const crumbs = breadcrumbs(cat.path);
  const isHoney = cat.root === "honey";

  return (
    <div className="container-x pb-24 pt-8 md:pt-12">
      <Breadcrumbs items={crumbs} />

      {variety && cover ? (
        <section className="mt-5 grid gap-6 md:mt-6 md:grid-cols-12 md:items-center md:gap-12">
          <div className="md:order-2 md:col-span-5">
            <Photo img={cover.images[0]} alt={`${cat.title}`} sizes="(min-width: 768px) 40vw, 100vw" ratio="16 / 10" ratioMd="4 / 5" eager className="rounded-[14px]" />
          </div>
          <div className="md:order-1 md:col-span-7">
            <p className="t-eyebrow mb-3 flex items-center gap-2">
              <Hex className="size-3.5" fill={variety.color} /> {TASTES[variety.taste].label}
            </p>
            <h1 className="t-h1">{cat.title}</h1>
            <p className="t-lead mt-4 max-w-[40ch] md:mt-5">{variety.note}.</p>
            <div className="mt-6 max-w-md">
              <div className="relative h-2 rounded-full" style={{ background: HONEY_GRADIENT }}>
                <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${variety.tone}%` }}>
                  <Hex className="size-5 drop-shadow" fill={variety.color} stroke="#fbf7f0" />
                </span>
                <span className="sr-only">Цвет: {variety.tone < 30 ? "светлый" : variety.tone < 70 ? "янтарный" : "тёмный"}</span>
              </div>
              <div className="mt-2 flex justify-between text-[12px] text-ink-3">
                <span>светлый</span>
                <span>тёмный</span>
              </div>
            </div>
            {(cover.aroma || cover.taste) && (
              <>
                <details className="group mt-6 border-y border-line md:hidden">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[15px] font-medium">
                    Аромат и вкус
                    <span className="text-xl text-ink-3 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <dl className="space-y-4 pb-5 text-[15px]">
                    {cover.aroma && (
                      <div>
                        <dt className="t-eyebrow mb-1">Аромат</dt>
                        <dd className="text-ink-2">{cover.aroma}</dd>
                      </div>
                    )}
                    {cover.taste && (
                      <div>
                        <dt className="t-eyebrow mb-1">Вкус</dt>
                        <dd className="text-ink-2">{cover.taste}</dd>
                      </div>
                    )}
                  </dl>
                </details>
                <dl className="mt-8 hidden max-w-xl gap-4 text-[15px] md:grid md:grid-cols-2">
                  {cover.aroma && (
                    <div>
                      <dt className="t-eyebrow mb-1">Аромат</dt>
                      <dd className="text-ink-2">{cover.aroma}</dd>
                    </div>
                  )}
                  {cover.taste && (
                    <div>
                      <dt className="t-eyebrow mb-1">Вкус</dt>
                      <dd className="text-ink-2">{cover.taste}</dd>
                    </div>
                  )}
                </dl>
              </>
            )}
          </div>
        </section>
      ) : (
        <div className="mt-6">
          <h1 className="t-h1">{cat.title}</h1>
          <p className="mt-3 text-ink-2">
            {items.length} {plural(items.length, isHoney ? "позиция" : "товар", isHoney ? "позиции" : "товара", isHoney ? "позиций" : "товаров")}
          </p>
        </div>
      )}

      {isHoney && (
        <div className="mt-8 md:mt-12">
          <HoneyNav current={cat.slug} />
        </div>
      )}

      {subs.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-2">
          {subs.map((s) => (
            <li key={s.id}>
              <Link href={s.path} className="chip chip-sm">
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <CatalogBrowser cards={cards} />
      </div>

      {cat.descriptionHtml && cat.descriptionHtml.length > 120 && (
        <details className="group mt-20 max-w-3xl border-t border-line pt-6">
          <summary className="flex cursor-pointer list-none items-center justify-between font-display text-2xl">
            {variety ? `О сорте: ${variety.name.toLowerCase()} мёд` : `О разделе «${cat.title}»`}
            <span className="text-ink-3 transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="prose-dm mt-5" dangerouslySetInnerHTML={{ __html: cat.descriptionHtml }} />
        </details>
      )}
    </div>
  );
}
