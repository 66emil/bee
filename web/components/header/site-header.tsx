import Link from "next/link";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { CallbackLink, HeaderActions } from "./header-actions";
import { mainPhone } from "@/lib/site";

export function SiteHeader() {
  return (
    <>
      <div className="bg-paper text-ink-2">
        <div className="container-x flex h-9 items-center justify-center gap-2 text-[13px] lg:justify-between">
          <p className="truncate">
            <span className="text-honey">●</span> Свежий сбор 2026 уже в магазине
            <span className="hidden sm:inline"> · доставка по Москве от 350 ₽</span>
          </p>
          <div className="hidden items-center gap-5 lg:flex">
            <Link href="/about/oplata_i_dostavka" className="hover:text-ink">
              Доставка и оплата
            </Link>
            <span>Новокузнецкая, 5 · ежедневно</span>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-md">
        <div className="container-x flex h-16 items-center justify-between gap-6 md:h-[76px]">
          <Logo />
          <NavLinks />
          <div className="flex items-center gap-4">
            <div className="hidden flex-col items-end leading-tight xl:flex">
              <a href={`tel:${mainPhone.tel}`} className="text-[15px] font-medium tabular-nums hover:text-brown">
                {mainPhone.display}
              </a>
              <CallbackLink className="text-[13px] text-ink-3 underline decoration-line underline-offset-4 hover:text-ink" />
            </div>
            <HeaderActions />
          </div>
        </div>
      </header>
    </>
  );
}
