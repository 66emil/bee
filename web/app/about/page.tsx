import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Photo } from "@/components/photo";
import { getPage, shopPhotos } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "О магазине",
  description: "Дом мёда — специализированный магазин мёда и продуктов пчеловодства в старинном особняке XIX века в центре Москвы.",
};

export default function Page() {
  const page = getPage("/about");
  return (
    <div className="pb-24">
      <div className="container-x pt-8 md:pt-12">
        <Breadcrumbs items={[{ title: "О нас" }]} />
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <h1 className="t-display lg:col-span-7">Дом мёда на Новокузнецкой</h1>
          <p className="t-lead self-end lg:col-span-5">Специализированный магазин мёда и продуктов пчеловодства в старинном особняке XIX века в центре Москвы. С 1991 года.</p>
        </div>
      </div>
      <div className="container-x mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {(["hall", "tasting", "stand", "counter"] as const).map((k, i) => (
          <Photo key={k} img={shopPhotos[k]} alt="Магазин Дом мёда" sizes="(min-width: 768px) 25vw, 50vw" ratio={i % 3 === 0 ? "4 / 5" : "4 / 5"} eager={i < 2} className="rounded-[var(--radius-ui)]" />
        ))}
      </div>
      <div className="container-x mt-16 grid gap-12 lg:grid-cols-12">
        <div className="prose-dm text-[17px] lg:col-span-7" dangerouslySetInnerHTML={{ __html: page?.html ?? "" }} />
        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="space-y-5 rounded-[14px] bg-paper p-6 md:p-8">
            <p className="t-eyebrow">Приходите на дегустацию</p>
            <p className="font-display text-2xl leading-snug">
              {site.address.city}, {site.address.street}
            </p>
            <p className="text-ink-2">
              {site.workHours.map((h) => (
                <span key={h.days} className="block">
                  {h.days}: {h.from}–{h.to}
                </span>
              ))}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={site.address.mapUrl} target="_blank" rel="noopener" className="btn btn-primary">
                Построить маршрут
              </a>
              <Link href="/contacts" className="btn btn-ghost">
                Контакты
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
