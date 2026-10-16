import "server-only";
import content from "@/data/content.json";
import type { Img } from "@/lib/catalog";

// Тексты страниц и фото магазина — только на сервере (тексты оферты/политики не должны попадать в клиентский бандл).
type Page = { path: string; title: string; metaTitle: string | null; metaDescription: string | null; html: string | null };
const c = content as unknown as { pages: Page[]; shop: Record<string, Img | null> };

export const getPage = (path: string) => c.pages.find((p) => p.path === path) ?? null;
export const shopPhotos = c.shop;
