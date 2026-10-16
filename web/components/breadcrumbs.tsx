import Link from "next/link";

/**
 * Хлебные крошки. На телефоне — одна ссылка «← родительский раздел»: длинная цепочка в две строки
 * на узком экране только мешает.
 */
export function Breadcrumbs({ items }: { items: { title: string; path?: string }[] }) {
  const parent = [...items.slice(0, -1)].reverse().find((i) => i.path) ?? { title: "Главная", path: "/" };
  return (
    <nav aria-label="Навигация" className="text-[13px] text-ink-3">
      <Link href={parent.path!} className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-ink-2 md:hidden">
        <span aria-hidden>←</span> {parent.title}
      </Link>
      <ol className="hidden flex-wrap items-center gap-x-2 gap-y-1 md:flex">
        <li>
          <Link href="/" className="hover:text-ink">
            Главная
          </Link>
        </li>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <span aria-hidden className="text-line">
              /
            </span>
            {it.path && i < items.length - 1 ? (
              <Link href={it.path} className="hover:text-ink">
                {it.title}
              </Link>
            ) : (
              <span className="text-ink-2" aria-current="page">
                {it.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SectionHead({ eyebrow, title, action, className = "" }: { eyebrow?: string; title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-3 ${className}`}>
      <div>
        {eyebrow && <p className="t-eyebrow mb-3">{eyebrow}</p>}
        <h2 className="t-h2 text-balance">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** Ссылка «смотреть всё» у заголовка секции: крупная зона нажатия на телефоне */
export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-my-2 inline-flex items-center gap-2 py-2 text-[15px]">
      <span className="link-u">{children}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}
