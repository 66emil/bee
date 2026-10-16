import { notFound } from "next/navigation";
import { CategoryView } from "@/components/catalog/category-view";
import { ProductView } from "@/components/catalog/product-view";
import { catalogSlugs } from "@/lib/catalog";
import { catalogMetadata, resolveCatalog } from "@/lib/route-meta";

const PREFIX = "/pchelovodam";

export function generateStaticParams() {
  return catalogSlugs("bee");
}

export async function generateMetadata({ params }: PageProps<"/pchelovodam/[...slug]">) {
  return catalogMetadata(PREFIX, (await params).slug);
}

export default async function Page({ params }: PageProps<"/pchelovodam/[...slug]">) {
  const r = resolveCatalog(PREFIX, (await params).slug);
  if (!r) notFound();
  return r.kind === "product" ? <ProductView p={r.product} /> : <CategoryView cat={r.category} />;
}
