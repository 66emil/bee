"use client";
import { IconMinus, IconPlus } from "@/components/icons";

export function Qty({ value, onChange, min = 1, size = "md" }: { value: number; onChange: (n: number) => void; min?: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-9" : "h-12";
  const w = size === "sm" ? "w-9" : "w-11";
  return (
    <div className={`inline-flex items-center rounded-[10px] border border-line bg-white ${h}`}>
      <button type="button" className={`grid ${w} h-full place-items-center text-ink-2 hover:text-ink disabled:opacity-40`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Меньше">
        <IconMinus />
      </button>
      <span className="min-w-6 text-center text-[15px] font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={`grid ${w} h-full place-items-center text-ink-2 hover:text-ink`} onClick={() => onChange(value + 1)} aria-label="Больше">
        <IconPlus />
      </button>
    </div>
  );
}
