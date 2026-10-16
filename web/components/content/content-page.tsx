import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getPage } from "@/lib/content";

/** Текстовая страница из CMS: заголовок + аккуратная типографика (оферта, политика и т.п.) */
export function ContentPage({ path, title, crumbs }: { path: string; title?: string; crumbs?: { title: string; path?: string }[] }) {
  const page = getPage(path);
  if (!page?.html) notFound();
  const t = title ?? page.title;
  return (
    <div className="container-x pb-24 pt-8 md:pt-12">
      <Breadcrumbs items={crumbs ?? [{ title: t }]} />
      <h1 className="t-h1 mt-6 max-w-3xl text-balance">{t}</h1>
      <div className="prose-dm mt-10 text-[16px]" dangerouslySetInnerHTML={{ __html: page.html }} />
    </div>
  );
}
