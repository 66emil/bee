import type { Metadata } from "next";
import { CatalogRootView } from "@/components/catalog/category-view";

export const metadata: Metadata = {
  title: "Каталог мёда",
  description: "Акациевый, липовый, гречишный, каштановый и другие сорта натурального мёда, мёд в сотах и продукты пчеловодства.",
};

export default function Page() {
  return <CatalogRootView root="honey" />;
}
