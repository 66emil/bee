"use client";
// Мобильное меню и поиск — полноэкранные слои поверх страницы.
import Link from "next/link";
import Form from "next/form";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { uiStore, useUi } from "@/components/ui-store";
import { IconArrow, IconClose, IconPhone, IconSearch } from "@/components/icons";
import { MAIN_NAV, mainPhone, site } from "@/lib/site";

function useLockScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && uiStore.set({ menu: false, search: false });
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [locked]);
}

export function Overlays() {
  const { menu, search } = useUi();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);
  useLockScroll(menu || search);

  // закрываем слои при переходе на другую страницу
  useEffect(() => {
    uiStore.set({ menu: false, search: false });
  }, [pathname]);

  useEffect(() => {
    if (search) input.current?.focus();
  }, [search]);

  return (
    <>
      {search && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px]" onClick={() => uiStore.set({ search: false })}>
          <div className="bg-cream shadow-[0_20px_60px_-30px_rgba(43,28,18,0.45)]" onClick={(e) => e.stopPropagation()}>
            <div className="container-x py-5 md:py-8">
              <Form action="/search" className="flex items-center gap-3 border-b border-line pb-3">
                <IconSearch className="size-6 shrink-0 text-ink-3" />
                <input
                  ref={input}
                  name="q"
                  type="search"
                  placeholder="Липовый, в сотах, перга…"
                  className="w-full bg-transparent font-display text-2xl outline-none placeholder:text-ink-3 md:text-4xl"
                  aria-label="Поиск по каталогу"
                  autoComplete="off"
                />
                <button type="button" onClick={() => uiStore.set({ search: false })} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-paper" aria-label="Закрыть поиск">
                  <IconClose />
                </button>
              </Form>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink-2">
                <span className="text-ink-3">Часто ищут:</span>
                {["липовый", "гречишный", "в сотах", "перга", "медогонка"].map((q) => (
                  <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="link-u">
                    {q}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {menu && (
        <div className="fixed inset-0 z-50 flex flex-col bg-cream lg:hidden" role="dialog" aria-modal="true" aria-label="Меню">
          <div className="container-x flex h-16 items-center justify-between border-b border-line">
            <span className="t-eyebrow">Меню</span>
            <button type="button" onClick={() => uiStore.set({ menu: false })} className="grid size-11 place-items-center rounded-full hover:bg-paper" aria-label="Закрыть меню">
              <IconClose />
            </button>
          </div>
          <nav className="container-x flex-1 overflow-y-auto py-6">
            <ul className="divide-y divide-line">
              {MAIN_NAV.map((item) => (
                <li key={item.path}>
                  <Link href={item.path} className="flex items-center justify-between py-4 font-display text-[1.75rem] leading-tight">
                    {item.title}
                    <IconArrow className="size-5 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="container-x space-y-3 border-t border-line py-6">
            <a href={`tel:${mainPhone.tel}`} className="btn btn-primary w-full">
              <IconPhone /> {mainPhone.display}
            </a>
            <button type="button" className="btn btn-ghost w-full" onClick={() => uiStore.set({ menu: false, callback: true })}>
              Перезвоните мне
            </button>
            <p className="pt-1 text-center text-sm text-ink-3">
              {site.address.city}, {site.address.street} · ежедневно
            </p>
          </div>
        </div>
      )}
    </>
  );
}
