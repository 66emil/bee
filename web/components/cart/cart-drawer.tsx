"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cart, totals, useCart } from "./store";
import { Qty } from "./qty";
import { Photo } from "@/components/photo";
import { IconCheck, IconClose } from "@/components/icons";
import { plural, price } from "@/lib/format";

export function CartDrawer() {
  const { lines, drawerOpen, lastAddedKey } = useCart();
  const { count, sum } = totals(lines);
  const pathname = usePathname();

  useEffect(() => {
    cart.close();
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cart.close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
      <div className={`absolute inset-0 bg-ink/30 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`} onClick={() => cart.close()} />
      <aside
        role="dialog"
        aria-label="Корзина"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-cream transition-[transform,visibility] duration-300 ease-[var(--ease-out-soft)] ${
          drawerOpen ? "visible translate-x-0 shadow-[-20px_0_60px_-30px_rgba(43,28,18,0.4)]" : "invisible translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5 md:h-[76px] md:px-7">
          <p className="font-display text-2xl">
            Корзина {count > 0 && <span className="text-ink-3">· {count}</span>}
          </p>
          <button type="button" onClick={() => cart.close()} className="grid size-11 place-items-center rounded-full hover:bg-paper" aria-label="Закрыть корзину">
            <IconClose />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="font-display text-3xl">Здесь пока пусто</p>
            <p className="text-ink-2">Начните со светлой акации или терпкой гречихи — у нас больше десяти сортов.</p>
            <Link href="/katalog-meda" className="btn btn-primary mt-2" onClick={() => cart.close()}>
              Выбрать мёд
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5 md:px-7">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-4 py-5">
                  <Link href={l.path} className="w-20 shrink-0" onClick={() => cart.close()}>
                    <Photo img={l.image} alt="" sizes="80px" className="rounded-[8px]" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    {l.key === lastAddedKey && (
                      <p className="mb-1 flex items-center gap-1 text-[13px] text-ok">
                        <IconCheck className="size-4" /> Добавлено
                      </p>
                    )}
                    <Link href={l.path} className="line-clamp-2 font-medium leading-snug hover:text-brown" onClick={() => cart.close()}>
                      {l.name}
                    </Link>
                    {l.optionLabel && <p className="text-sm text-ink-3">{l.optionLabel}</p>}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Qty size="sm" value={l.count} min={0} onChange={(n) => cart.setCount(l.key, n)} />
                      <p className="font-medium tabular-nums">{price(l.price * l.count)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-4 border-t border-line bg-paper/60 px-5 py-5 md:px-7">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-2">
                  {count} {plural(count, "товар", "товара", "товаров")}
                </span>
                <span className="font-display text-3xl num">{price(sum)}</span>
              </div>
              <p className="text-sm text-ink-3">Доставка по Москве от 350 ₽ или самовывоз с Новокузнецкой — выберете при оформлении.</p>
              <Link href="/basket" className="btn btn-primary w-full" onClick={() => cart.close()}>
                Оформить заказ
              </Link>
              <button type="button" className="w-full text-center text-sm text-ink-2 underline underline-offset-4" onClick={() => cart.close()}>
                Продолжить покупки
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
