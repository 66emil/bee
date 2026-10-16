import Link from "next/link";
import { Hex } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="container-x py-28 text-center">
      <Hex className="mx-auto size-10" fill="var(--color-honey-soft)" stroke="var(--color-honey)" />
      <h1 className="t-h1 mt-6">Такой страницы нет</h1>
      <p className="t-lead mx-auto mt-4 max-w-md">Возможно, ссылка устарела. Зато мёд никуда не делся.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/katalog-meda" className="btn btn-primary">
          Каталог мёда
        </Link>
        <Link href="/" className="btn btn-ghost">
          На главную
        </Link>
      </div>
    </div>
  );
}
