import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = { title: "Договор оферты" };

export default function Page() {
  return <ContentPage path="/dogovor-oferty" title="Договор оферты" />;
}
