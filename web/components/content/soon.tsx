import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Hex } from "@/components/icons";

/** Раздел есть в меню старого сайта, но страница отдаёт 404 — в прототипе показываем аккуратную заглушку */
export function Soon({ title, text }: { title: string; text: string }) {
  return (
    <div className="container-x pb-28 pt-8 md:pt-12">
      <Breadcrumbs items={[{ title }]} />
      <div className="mx-auto mt-16 max-w-xl text-center">
        <Hex className="mx-auto size-10" fill="var(--color-honey-soft)" stroke="var(--color-honey)" />
        <h1 className="t-h1 mt-6">{title}</h1>
        <p className="t-lead mt-5">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/katalog-meda" className="btn btn-primary">
            В каталог мёда
          </Link>
          <Link href="/about" className="btn btn-ghost">
            О магазине
          </Link>
        </div>
      </div>
    </div>
  );
}
