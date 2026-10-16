import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BuyBox } from "@/components/buy-box";
import { Gallery } from "./gallery";
import { ProductCard } from "@/components/product-card";
import { Hex, IconStore, IconTruck } from "@/components/icons";
import { breadcrumbs, categoryProducts, getCategory, getProduct, visible, type Product } from "@/lib/catalog";
import { toCard } from "@/lib/cards";
import { firstSentence } from "@/lib/format";
import { varietyBySlug } from "@/lib/varieties";
import { mainPhone, site } from "@/lib/site";

function related(p: Product) {
  const list = p.relatedIds.map(getProduct).filter((x): x is Product => !!x && visible(x) && x.id !== p.id);
  const cat = getCategory(p.categoryId);
  if (cat) {
    for (const x of categoryProducts(cat)) {
      if (list.length >= 4) break;
      if (x.id !== p.id && !list.some((y) => y.id === x.id)) list.push(x);
    }
  }
  return list.slice(0, 4);
}

export function ProductView({ p }: { p: Product }) {
  const cat = getCategory(p.categoryId);
  const variety = cat && p.root === "honey" ? varietyBySlug(cat.slug) : null;
  const crumbs = [...breadcrumbs(cat?.path ?? ""), { title: p.name }];
  const facts = [
    ["Сорт", p.sort],
    ["Аромат", p.aroma],
    ["Вкус", p.taste],
    ["Структура", p.structure],
  ].filter(([, v]) => v) as [string, string][];
  const lead = variety ? variety.note : firstSentence(p.aroma ?? p.short, 140);
  const rel = related(p);
  const main = p.images[0];

  return (
    <div className="pb-24">
      <div className="container-x pt-5 md:pt-10">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="container-x mt-4 grid gap-7 md:mt-8 lg:grid-cols-12 lg:gap-14">
        {/* Фото */}
        <div className="min-w-0 lg:col-span-7">
          <div className="lg:sticky lg:top-28">
            <Gallery images={p.images} alt={p.name} />
          </div>
        </div>

        {/* Покупка */}
        <div className="min-w-0 lg:col-span-5">
          {variety && (
            <Link href={cat!.path} className="t-eyebrow -my-2 inline-flex items-center gap-2 py-2 hover:text-ink">
              <Hex className="size-3.5" fill={variety.color} /> {variety.name} мёд<span className="hidden sm:inline"> · {variety.tags.join(", ")}</span>
            </Link>
          )}
          {!variety && cat && (
            <Link href={cat.path} className="t-eyebrow -my-2 inline-block py-2 hover:text-ink">
              {cat.title}
            </Link>
          )}
          <h1 className={`mt-3 text-balance ${p.root === "honey" ? "t-h1" : "font-display text-[1.75rem] font-semibold leading-tight md:text-[2.4rem]"}`}>{p.name}</h1>
          {lead && <p className="t-lead mt-4 text-pretty">{lead}.</p>}

          <div className="mt-6 md:mt-8">
            <BuyBox
              p={{ id: p.id, name: p.name, path: p.path, price: p.price, options: p.options, image: main ?? null, available: p.available }}
              phone={mainPhone}
            />
          </div>

          <ul className="mt-8 space-y-4 border-t border-line pt-6 text-[15px]">
            <li className="flex gap-3">
              <IconTruck className="size-6 shrink-0 text-ink-3" />
              <span>
                <span className="font-medium">Доставка по Москве</span> в пределах МКАД — от 350 ₽, по будням с 10:00 до 20:00.{" "}
                <Link href="/about/oplata_i_dostavka" className="text-ink-3 underline underline-offset-4">
                  Подробнее
                </Link>
              </span>
            </li>
            <li className="flex gap-3">
              <IconStore className="size-6 shrink-0 text-ink-3" />
              <span>
                <span className="font-medium">Самовывоз и дегустация</span> — {site.address.street}, ежедневно.
              </span>
            </li>
          </ul>

          {facts.length > 0 && (
            <dl className="mt-10 divide-y divide-line border-y border-line">
              {facts.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-4 sm:grid-cols-[120px_1fr] sm:gap-6">
                  <dt className="t-eyebrow pt-1">{k}</dt>
                  <dd className="text-[15px] leading-relaxed text-ink-2">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {p.descriptionHtml && <div className="prose-dm mt-8 text-[15px]" dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} />}
        </div>
      </div>

      {rel.length > 0 && (
        <section className="container-x mt-16 md:mt-24">
          <h2 className="t-h2">Вам может понравиться</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:mt-8 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
            {rel.map((x) => (
              <ProductCard key={x.id} c={toCard(x)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
