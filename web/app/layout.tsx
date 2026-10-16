import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Golos_Text } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/header/site-header";
import { Overlays } from "@/components/header/overlays";
import { SiteFooter } from "@/components/site-footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CallbackDialog } from "@/components/forms/callback-dialog";

const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Дом мёда — магазин натурального мёда в Москве", template: "%s — Дом мёда" },
  description: "Специализированный магазин мёда и продуктов пчеловодства в особняке XIX века на Новокузнецкой. Дегустация каждого сорта, доставка по Москве.",
  robots: { index: false, follow: false }, // прототип: не индексировать
};

export const viewport: Viewport = {
  themeColor: "#fbf7f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-cream">
          К содержимому
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <CartDrawer />
        <CallbackDialog />
        <Overlays />
      </body>
    </html>
  );
}
