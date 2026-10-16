"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV } from "@/lib/site";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Основное меню" className="hidden lg:block">
      <ul className="flex items-center gap-7 xl:gap-9">
        {MAIN_NAV.map((item) => {
          const active = pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <li key={item.path}>
              <Link
                href={item.path}
                aria-current={active ? "page" : undefined}
                className={`relative py-2 text-[15px] transition-colors hover:text-ink ${active ? "text-ink" : "text-ink-2"}`}
              >
                {item.title}
                {active && <span className="absolute inset-x-0 -bottom-0.5 h-px bg-honey" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
