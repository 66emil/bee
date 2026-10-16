import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FeedbackForm } from "@/components/forms/feedback-form";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Контакты", description: "Адрес, телефоны и часы работы магазина Дом мёда на Новокузнецкой." };

export default function Page() {
  return (
    <div className="container-x pb-24 pt-8 md:pt-12">
      <Breadcrumbs items={[{ title: "Контакты" }]} />
      <h1 className="t-h1 mt-6">Контакты</h1>
      <div className="mt-8 grid gap-12 md:mt-12 lg:grid-cols-12 lg:gap-14">
        <div className="space-y-10 lg:col-span-6">
          <section>
            <p className="t-eyebrow mb-3">Магазин и дегустационный зал</p>
            <p className="font-display text-[1.75rem] leading-tight md:text-[2rem]">
              {site.address.city}, {site.address.street}
            </p>
            <p className="mt-2 text-ink-2">
              {site.address.postcode}, {site.address.city} ·{" "}
              {site.workHours.map((h, i) => (
                <span key={h.days}>
                  {i > 0 && ", "}
                  {h.days.toLowerCase()} {h.from}–{h.to}
                </span>
              ))}
            </p>
            <a href={site.address.mapUrl} target="_blank" rel="noopener" className="btn btn-primary mt-6 w-full sm:w-auto">
              Открыть в Яндекс Картах
            </a>
          </section>
          <section>
            <p className="t-eyebrow mb-3">Телефоны</p>
            <ul className="divide-y divide-line border-y border-line">
              {site.phones.map((p) => (
                <li key={p.tel + p.label} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <a href={`tel:${p.tel}`} className="whitespace-nowrap py-1 text-[20px] font-medium tabular-nums hover:text-brown">
                    {p.display}
                  </a>
                  <span className="text-sm text-ink-3 sm:text-right">{p.label}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <p className="t-eyebrow mb-3">Почта</p>
            <a href={`mailto:${site.email}`} className="font-display text-2xl hover:text-brown">
              {site.email}
            </a>
          </section>
          <p className="text-sm text-ink-3">
            {site.legal.company} · ОГРН {site.legal.ogrn}
          </p>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <h2 className="t-h3">Напишите нам</h2>
          <p className="mb-6 mt-2 text-ink-2">Пожелания, вопросы о сортах и оптовых заказах — ответим на почту или перезвоним.</p>
          <FeedbackForm />
        </div>
      </div>
    </div>
  );
}
