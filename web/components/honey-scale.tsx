import Link from "next/link";
import { HONEY_GRADIENT, type Variety } from "@/lib/varieties";
import { Hex } from "./icons";

/**
 * Медовая шкала: сорта на шкале от светлого к тёмному.
 * Различие сортов по настоящему признаку продукта — цвету (принцип 3); метки — сота, собственный мотив.
 * На телефоне шкала шире экрана и листается пальцем — так подписи не налезают друг на друга.
 */
export function HoneyScale({ items }: { items: Pick<Variety, "slug" | "name" | "tone" | "color">[] }) {
  return (
    <div className="mt-6">
      <div className="-mx-5 overflow-x-auto px-5 no-scrollbar md:mx-0 md:overflow-visible md:px-0">
        <div className="relative min-w-[640px] pb-12 pt-12 md:min-w-0 md:pb-14" aria-label="Цвет мёда: от светлого к тёмному">
          <div className="h-2.5 rounded-full" style={{ background: HONEY_GRADIENT }} />
          {items.map((v, i) => (
            <Link
              key={v.slug}
              href={`/katalog-meda/${v.slug}`}
              className="group absolute top-12 grid size-11 -translate-x-1/2 -translate-y-[calc(50%-5px)] place-items-center"
              style={{ left: `${v.tone}%` }}
              aria-label={`${v.name} мёд`}
            >
              <Hex className="size-6 drop-shadow-[0_2px_3px_rgba(43,28,18,0.25)] transition-transform group-hover:scale-125" fill={v.color} stroke="#fbf7f0" />
              <span
                className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px] text-ink-2 transition-colors group-hover:text-ink ${
                  i % 2 === 0 ? "top-10" : "bottom-10"
                }`}
              >
                {v.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-1 flex justify-between text-[12px] tracking-wide text-ink-3 md:hidden">
        <span>светлые</span>
        <span aria-hidden>листайте →</span>
        <span>тёмные</span>
      </p>
    </div>
  );
}
