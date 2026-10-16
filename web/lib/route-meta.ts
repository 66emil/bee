import "server-only";
import type { Metadata } from "next";
import { getCategoryByPath, getProductByPath, visible } from "@/lib/catalog";

/** Путь из сегментов catch-all: ["lipovyj-myod", "lipovyj"] -> /katalog-meda/lipovyj-myod/lipovyj */
export function resolveCatalog(prefix: string, slug: string[]) {
  const path = `${prefix}/${slug.map(decodeURIComponent).join("/")}`;
  const product = getProductByPath(path);
  if (product && visible(product)) return { kind: "product" as const, product };
  const category = getCategoryByPath(path);
  if (category) return { kind: "category" as const, category };
  return null;
}

export function catalogMetadata(prefix: string, slug: string[]): Metadata {
  const r = resolveCatalog(prefix, slug);
  if (!r) return { title: "Не найдено" };
  if (r.kind === "product") return { title: r.product.name, description: r.product.metaDescription ?? undefined };
  return { title: r.category.title, description: r.category.metaDescription ?? undefined };
}
