import type { Metadata } from "next";
import { Soon } from "@/components/content/soon";

export const metadata: Metadata = { title: "Рецепты с мёдом" };

export default function Page() {
  return <Soon title="Рецепты с мёдом" text="Скоро здесь появятся рецепты: с чем сочетать акациевый, липовый или гречишный мёд, выпечка, напитки и соусы." />;
}
