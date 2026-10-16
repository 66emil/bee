"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cart } from "@/components/cart/store";
import { Qty } from "@/components/cart/qty";
import { IconBag, IconPhone } from "@/components/icons";
import { price, weight } from "@/lib/format";
import type { Img, Option } from "@/lib/catalog";

export type BuyProduct = {
  id: number;
  name: string;
  path: string;
  price: number | null;
  options: Option[];
  image: (Pick<Img, "src" | "widths" | "cutout"> & { focus?: string | null }) | null;
  available: boolean;
};

/** Выбор фасовки кнопками с ценой (принцип 9) + количество + «В корзину». compact — для витрин на главной. */
export function BuyBox({ p, compact = false, phone }: { p: BuyProduct; compact?: boolean; phone?: { tel: string; display: string } }) {
  const [opt, setOpt] = useState<number | null>(p.options[0]?.index ?? null);
  const [qty, setQty] = useState(1);
  const [stickyVisible, setStickyVisible] = useState(false);
  const mainBtn = useRef<HTMLButtonElement>(null);

  const option = p.options.find((o) => o.index === opt) ?? null;
  const unitPrice = option?.price ?? p.price;
  const per100 = option?.grams && option.grams >= 200 ? (option.price / option.grams) * 100 : null;

  // закреплённая панель «В корзину» на мобильном, когда основная кнопка ушла с экрана
  useEffect(() => {
    if (compact || !mainBtn.current) return;
    const io = new IntersectionObserver(([e]) => setStickyVisible(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(mainBtn.current);
    return () => io.disconnect();
  }, [compact]);

  function add() {
    if (unitPrice == null) return;
    cart.add(
      {
        id: p.id,
        optionIndex: option?.index ?? null,
        name: p.name,
        optionLabel: option ? weight(option.grams, option.label) : null,
        price: unitPrice,
        image: p.image,
        path: p.path,
      },
      qty,
    );
    setQty(1);
  }

  if (!p.available || unitPrice == null) {
    return (
      <div className="rounded-[var(--radius-ui)] border border-line p-5">
        <p className="font-medium">Сейчас нет в наличии</p>
        <p className="mt-1 text-sm text-ink-2">Позвоните — подскажем, когда появится, или предложим похожий сорт.</p>
        {phone && (
          <a href={`tel:${phone.tel}`} className="btn btn-ghost mt-4">
            <IconPhone /> {phone.display}
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      {p.options.length > 1 && (
        <fieldset>
          <legend className={compact ? "sr-only" : "label mb-2.5"}>Фасовка</legend>
          <div className={`grid gap-2 ${p.options.length === 2 ? "grid-cols-2" : "grid-cols-3"}`} role="radiogroup">
            {p.options.map((o) => (
              <button
                key={o.index}
                type="button"
                role="radio"
                aria-checked={o.index === opt}
                onClick={() => setOpt(o.index)}
                className="chip w-full"
              >
                <span className="text-[15px] font-medium">{weight(o.grams, o.label)}</span>
                <span className="num text-[13px] text-ink-3">{price(o.price)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {!compact && (
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="num font-display text-[2.4rem] leading-none md:text-[2.6rem]">{price(unitPrice * qty)}</p>
            <p className="mt-2 text-sm text-ink-3">
              {option && p.options.length === 1 ? `${weight(option.grams, option.label)} · ` : ""}
              {per100 ? `${price(Math.round(per100))} за 100 г` : qty > 1 ? `${qty} × ${price(unitPrice)}` : ""}
            </p>
          </div>
        </div>
      )}

      <div className={`flex gap-2.5 ${compact ? "mt-3" : "mt-5"}`}>
        {!compact && <Qty value={qty} onChange={setQty} />}
        <button ref={mainBtn} type="button" onClick={add} className="btn btn-primary flex-1">
          <IconBag className="size-5" />
          {compact ? `В корзину · ${price(unitPrice)}` : "В корзину"}
        </button>
      </div>

      {!compact && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 lg:hidden ${
            stickyVisible ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink-2">
                {p.name}
                {option ? ` · ${weight(option.grams, option.label)}` : ""}
              </p>
              <p className="font-medium tabular-nums">{price(unitPrice)}</p>
            </div>
            <button type="button" onClick={add} className="btn btn-primary">
              В корзину
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GoToCart() {
  return (
    <Link href="/basket" className="text-sm text-ink-2 underline underline-offset-4">
      Перейти к оформлению
    </Link>
  );
}
