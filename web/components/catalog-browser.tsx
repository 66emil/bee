"use client";
import { useMemo, useState } from "react";
import type { CardData } from "@/lib/cards";
import type { Taste } from "@/lib/varieties";
import { ProductCard } from "./product-card";
import { plural } from "@/lib/format";

const SORTS = {
  menu: { title: "Сначала популярные", fn: (a: CardData, b: CardData) => a.menuIndex - b.menuIndex || a.id - b.id },
  priceAsc: { title: "Сначала дешевле", fn: (a: CardData, b: CardData) => (a.price ?? 1e9) - (b.price ?? 1e9) },
  priceDesc: { title: "Сначала дороже", fn: (a: CardData, b: CardData) => (b.price ?? -1) - (a.price ?? -1) },
  name: { title: "По названию", fn: (a: CardData, b: CardData) => a.name.localeCompare(b.name, "ru") },
};
type SortKey = keyof typeof SORTS;

export function CatalogBrowser({
  cards,
  tastes,
  pageSize = 24,
}: {
  cards: CardData[];
  tastes?: Record<Taste, { title: string; one: string; label: string; hint: string }>;
  pageSize?: number;
}) {
  const [sort, setSort] = useState<SortKey>("menu");
  const [taste, setTaste] = useState<Taste | null>(null);
  const [limit, setLimit] = useState(pageSize);

  const list = useMemo(() => {
    const filtered = taste ? cards.filter((c) => c.taste === taste) : cards;
    return [...filtered].sort(SORTS[sort].fn);
  }, [cards, sort, taste]);

  return (
    <div>
      <div className="flex flex-col gap-3 border-y border-line py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:py-4">
        {tastes ? (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar md:mx-0 md:px-0" role="group" aria-label="Вкус">
            <button type="button" className="chip chip-sm shrink-0" aria-pressed={taste === null} onClick={() => (setTaste(null), setLimit(pageSize))}>
              <span>Все</span>
            </button>
            {(Object.keys(tastes) as Taste[]).map((t) => (
              <button key={t} type="button" className="chip chip-sm shrink-0" aria-pressed={taste === t} onClick={() => (setTaste(t), setLimit(pageSize))} title={tastes[t].hint}>
                <span>{tastes[t].title}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-ink-3">
            {list.length} {plural(list.length, "товар", "товара", "товаров")}
          </p>
        )}
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          <span className="shrink-0">Порядок:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="min-h-11 flex-1 rounded-[8px] border border-line bg-white px-3 py-2 text-[15px] text-ink md:min-h-10 md:flex-none md:text-[14px]">
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORTS[k].title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {tastes && taste && <p className="mt-4 text-[14px] text-ink-3">{tastes[taste].hint}</p>}

      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:mt-8 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-10 md:gap-x-6 lg:grid-cols-4">
        {list.slice(0, limit).map((c, i) => (
          <ProductCard key={c.id} c={c} eager={i < 4} />
        ))}
      </div>
      {list.length === 0 && <p className="py-16 text-center text-ink-2">Здесь пока ничего нет.</p>}
      {list.length > limit && (
        <div className="mt-12 text-center">
          <button type="button" className="btn btn-ghost" onClick={() => setLimit((l) => l + pageSize)}>
            Показать ещё · {list.length - limit}
          </button>
        </div>
      )}
    </div>
  );
}
