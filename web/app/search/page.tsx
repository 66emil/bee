import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/product-card";
import { IconSearch } from "@/components/icons";
import { searchProducts } from "@/lib/catalog";
import { toCard } from "@/lib/cards";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Поиск" };

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const found = q ? searchProducts(q) : [];
  return (
    <>
      <Form action="/search" className="mt-8 flex max-w-2xl items-center gap-3 border-b border-ink/20 pb-3">
        <IconSearch className="size-6 text-ink-3" />
        <input name="q" type="search" defaultValue={q} placeholder="Сорт, продукт или инвентарь" className="w-full bg-transparent font-display text-3xl outline-none placeholder:text-ink-3" aria-label="Поиск" />
        <button className="btn btn-primary !min-h-10">Найти</button>
      </Form>
      {q && (
        <p className="mt-6 text-ink-2">
          {found.length ? `${found.length} ${plural(found.length, "результат", "результата", "результатов")} по запросу «${q}»` : `По запросу «${q}» ничего не нашлось. Попробуйте «липовый», «соты» или «дымарь».`}
        </p>
      )}
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {found.slice(0, 48).map((p) => (
          <ProductCard key={p.id} c={toCard(p)} />
        ))}
      </div>
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/search">) {
  return (
    <div className="container-x pb-24 pt-8 md:pt-12">
      <Breadcrumbs items={[{ title: "Поиск" }]} />
      <h1 className="t-h1 mt-6">Поиск</h1>
      <Suspense fallback={<p className="mt-8 text-ink-3">Ищем…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
