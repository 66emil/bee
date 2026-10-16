import type { Metadata } from "next";
import { CatalogRootView } from "@/components/catalog/category-view";

export const metadata: Metadata = {
  title: "Пчеловодам",
  description: "Инвентарь и оборудование для пасек: медогонки, дымари, вощина, одежда пчеловода и многое другое.",
};

export default function Page() {
  return <CatalogRootView root="bee" />;
}
