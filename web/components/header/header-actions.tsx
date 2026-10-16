"use client";
import { cart, totals, useCart } from "@/components/cart/store";
import { uiStore } from "@/components/ui-store";
import { IconBag, IconMenu, IconSearch } from "@/components/icons";

export function HeaderActions() {
  const { lines } = useCart();
  const { count } = totals(lines);
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <button
        type="button"
        onClick={() => uiStore.set({ search: true })}
        className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper hover:text-ink"
        aria-label="Поиск"
      >
        <IconSearch />
      </button>
      <button
        type="button"
        onClick={() => cart.open()}
        className="relative grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper hover:text-ink"
        aria-label={count ? `Корзина: ${count} шт.` : "Корзина"}
      >
        <IconBag />
        {count > 0 && (
          <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-brown px-1 text-[11px] font-semibold leading-[18px] text-cream">
            {count}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => uiStore.set({ menu: true })}
        className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-paper lg:hidden"
        aria-label="Меню"
      >
        <IconMenu />
      </button>
    </div>
  );
}

export function CallbackLink({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={() => uiStore.set({ callback: true, menu: false })} className={className}>
      Перезвоните мне
    </button>
  );
}
