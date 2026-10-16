// Доступ к каталогу. Данные — data/catalog.json (npm run sync-data из ../site и ../mock-backend).
import raw from "@/data/catalog.json";

export type Img = { src: string; widths: number[]; w: number; h: number; cutout: boolean; focus?: string | null };
export type Option = { index: number; label: string; grams: number | null; price: number };
export type Root = "honey" | "bee" | "service";

export type Product = {
  id: number;
  slug: string;
  path: string;
  root: Root;
  categoryId: number | null;
  categoryIds: number[];
  name: string;
  title: string;
  metaDescription: string | null;
  price: number | null;
  priceUnit: string | null;
  optionType: string | null;
  options: Option[];
  images: Img[];
  sort: string | null;
  structure: string | null;
  aroma: string | null;
  taste: string | null;
  short: string | null;
  descriptionHtml: string | null;
  relatedIds: number[];
  menuIndex: number;
  available: boolean;
  hidden?: boolean;
};

export type Category = {
  id: number;
  path: string;
  slug: string;
  parentId: number | null;
  root: Root;
  title: string;
  h1: string | null;
  metaDescription: string | null;
  descriptionHtml: string | null;
};

const data = raw as unknown as { categories: Category[]; products: Product[] };

export const products = data.products;
export const categories = data.categories;

const productById = new Map(products.map((p) => [p.id, p]));
const productByPath = new Map(products.map((p) => [p.path, p]));
const categoryById = new Map(categories.map((c) => [c.id, c]));
const categoryByPath = new Map(categories.map((c) => [c.path, c]));

export const ROOT_PATH: Record<"honey" | "bee", string> = { honey: "/katalog-meda", bee: "/pchelovodam" };

export const getProduct = (id: number) => productById.get(id) ?? null;
export const getProductByPath = (path: string) => productByPath.get(path) ?? null;
export const getCategory = (id: number | null) => (id == null ? null : categoryById.get(id) ?? null);
export const getCategoryByPath = (path: string) => categoryByPath.get(path) ?? null;

export const visible = (p: Product) => !p.hidden;

export function childCategories(cat: Category) {
  return categories.filter((c) => c.parentId === cat.id);
}

function subtreeIds(cat: Category): Set<number> {
  const ids = new Set([cat.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId != null && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Товары категории (с подкатегориями), в порядке «по значимости», как на сайте */
export function categoryProducts(cat: Category) {
  const ids = subtreeIds(cat);
  return products
    .filter((p) => visible(p) && (p.categoryIds.some((id) => ids.has(id)) || (p.categoryId != null && ids.has(p.categoryId))))
    .sort((a, b) => a.menuIndex - b.menuIndex || a.id - b.id);
}

export function breadcrumbs(path: string) {
  const parts = path.split("/").filter(Boolean);
  const out: { title: string; path: string }[] = [];
  for (let i = 1; i <= parts.length; i++) {
    const p = "/" + parts.slice(0, i).join("/");
    const c = getCategoryByPath(p);
    if (c) out.push({ title: c.title, path: c.path });
  }
  return out;
}

export function minPrice(p: Product) {
  if (p.options.length) return Math.min(...p.options.map((o) => o.price));
  return p.price;
}

/** Пути для generateStaticParams: всё под корнем (категории и товары) */
export function catalogSlugs(root: "honey" | "bee") {
  const prefix = ROOT_PATH[root] + "/";
  const paths = [
    ...categories.filter((c) => c.path.startsWith(prefix)).map((c) => c.path),
    ...products.filter((p) => visible(p) && p.path.startsWith(prefix)).map((p) => p.path),
  ];
  return paths.map((p) => ({ slug: p.slice(prefix.length).split("/") }));
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/ё/g, "е");

export function searchProducts(q: string) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return products
    .filter(visible)
    .map((p) => {
      const name = norm(p.name);
      const hay = [name, norm(p.title), norm(p.aroma), norm(p.taste), norm(p.sort), norm(getCategory(p.categoryId)?.title)].join(" ");
      if (!terms.every((t) => hay.includes(t))) return null;
      return { p, score: terms.filter((t) => name.includes(t)).length };
    })
    .filter((x): x is { p: Product; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.p.menuIndex - b.p.menuIndex)
    .map((x) => x.p);
}
