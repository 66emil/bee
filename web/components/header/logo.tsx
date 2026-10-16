/* eslint-disable @next/next/no-img-element -- растровый логотип из исходного logo.png (вектора пока нет) */
import Link from "next/link";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const e = size === "lg" ? "h-14" : "h-9 md:h-10";
  const w = size === "lg" ? "h-8" : "h-[18px] md:h-[22px]";
  return (
    <Link href="/" className="flex items-center gap-2.5 md:gap-3" aria-label="Дом мёда — на главную">
      <img src="/brand/emblem.png" alt="" width={189} height={120} className={`${e} w-auto`} />
      <img src="/brand/wordmark.png" alt="Дом мёда" width={273} height={71} className={`${w} w-auto`} />
    </Link>
  );
}
