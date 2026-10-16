import Link from "next/link";
import type { CardData } from "@/lib/cards";
import { Photo } from "./photo";

/** Карточка: фото → название → вкус в нескольких словах → цена (принцип 1). Все карточки собраны одинаково. */
export function ProductCard({ c, sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw", eager }: { c: CardData; sizes?: string; eager?: boolean }) {
  return (
    <Link href={c.path} className="group flex flex-col">
      <div className="relative">
        <Photo
          img={c.image}
          alt={c.name}
          sizes={sizes}
          eager={eager}
          className="rounded-[var(--radius-ui)]"
          imgClassName="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.035]"
        />
        {c.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-2.5 py-1 text-[12px] font-medium text-brown shadow-sm">
            <span className="text-honey">●</span> {c.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <h3 className={`line-clamp-2 ${c.honey ? "font-display text-[1.2rem] leading-[1.15] font-semibold sm:text-[1.35rem] md:text-[1.45rem]" : "text-[14px] leading-snug font-medium sm:text-[15px]"}`}>
          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
            {c.name}
          </span>
        </h3>
        {c.line && <p className="mt-1.5 line-clamp-1 text-[13px] leading-snug text-ink-3 sm:line-clamp-2 sm:text-[14px]">{c.line}</p>}
        <div className="mt-auto pt-2.5 sm:pt-3">
          <p className="num text-[15px] font-medium sm:text-[16px]">{c.priceText}</p>
          <p className="truncate text-[12px] text-ink-3 sm:text-[13px]">{c.sizesText}</p>
        </div>
      </div>
    </Link>
  );
}
