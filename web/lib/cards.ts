import "server-only";
import { getCategory, minPrice, type Product } from "@/lib/catalog";
import { firstSentence, normalizeUnit, price, weight } from "@/lib/format";
import { varietyBySlug, type Taste } from "@/lib/varieties";

/** Данные карточки товара — готовятся на сервере, чтобы клиентские сетки не тянули каталог целиком */
export type CardData = {
  id: number;
  name: string;
  path: string;
  honey: boolean;
  image: { src: string; widths: number[]; cutout: boolean; focus?: string | null } | null;
  badge: string | null;
  line: string | null;
  priceText: string;
  sizesText: string;
  // для сортировки/фильтров
  price: number | null;
  menuIndex: number;
  taste: Taste | null;
};

export function toCard(p: Product): CardData {
  const honey = p.root === "honey";
  const from = minPrice(p);
  const multi = p.options.length > 1;
  const cat = getCategory(p.categoryId);
  return {
    id: p.id,
    name: p.name,
    path: p.path,
    honey,
    image: p.images[0] ? { src: p.images[0].src, widths: p.images[0].widths, cutout: p.images[0].cutout, focus: p.images[0].focus } : null,
    badge: /2026/.test(p.name) ? "Свежий сбор" : null,
    line: honey ? firstSentence(p.aroma ?? p.taste, 70) || null : null,
    priceText: from != null ? (multi ? `от ${price(from)}` : price(from)) : "Цену уточняйте",
    sizesText: multi
      ? p.options.map((o) => weight(o.grams, o.label)).join(" · ")
      : p.options.length === 1
        ? weight(p.options[0].grams, p.options[0].label)
        : normalizeUnit(p.priceUnit),
    price: from,
    menuIndex: p.menuIndex,
    taste: cat ? varietyBySlug(cat.slug)?.taste ?? null : null,
  };
}
