import type { Metadata } from "next";
import { Soon } from "@/components/content/soon";

export const metadata: Metadata = { title: "Музей" };

export default function Page() {
  return <Soon title="Музей пчеловодства" text="Раздел готовится. А пока приходите в магазин на Новокузнецкой — там можно увидеть инвентарь пасечника и попробовать мёд разных сортов." />;
}
