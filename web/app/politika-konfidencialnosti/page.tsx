import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = { title: "Политика конфиденциальности" };

export default function Page() {
  return <ContentPage path="/politika-konfidencialnosti" title="Политика конфиденциальности" />;
}
