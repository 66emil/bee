/* eslint-disable @next/next/no-img-element -- фото заранее подготовлены в WebP 480/960 (scripts/sync-data.mjs) */
import type { Img } from "@/lib/catalog";

type Props = {
  img: (Pick<Img, "src" | "widths" | "cutout"> & { focus?: string | null }) | null | undefined;
  alt: string;
  sizes: string;
  ratio?: string;
  className?: string;
  imgClassName?: string;
  position?: string;
  eager?: boolean;
  /** cover — кадрировать, contain — целиком; по умолчанию: предметные фото целиком, остальные — кадрировать */
  fit?: "cover" | "contain";
  /** заполнить родителя (родитель задаёт размер), без собственной пропорции */
  fill?: boolean;
  /** пропорция с планшета (md+), если отличается от мобильной */
  ratioMd?: string;
};

/**
 * Единая подача фото (принцип 2): одна подложка, одна пропорция.
 * Снимки на белом фоне «растворяются» в тёплой подложке через multiply.
 */
export function Photo({ img, alt, sizes, ratio = "1 / 1", ratioMd, className = "", imgClassName = "", position, eager, fit, fill }: Props) {
  const mode = fit ?? (img?.cutout ? "contain" : "cover");
  return (
    <div
      className={`${fill ? "absolute inset-0" : "relative"} overflow-hidden bg-paper ${ratioMd ? "aspect-[var(--r)] md:aspect-[var(--rmd)]" : ""} ${className}`}
      style={fill ? undefined : ratioMd ? ({ "--r": ratio, "--rmd": ratioMd } as React.CSSProperties) : { aspectRatio: ratio }}
    >
      {img ? (
        <img
          src={`${img.src}-${img.widths[img.widths.length - 1]}.webp`}
          srcSet={img.widths.map((w) => `${img.src}-${w}.webp ${w}w`).join(", ")}
          sizes={sizes}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : undefined}
          decoding="async"
          className={`absolute inset-0 h-full w-full ${
            mode === "contain" ? `object-contain ${img.cutout ? "p-[7%] mix-blend-multiply" : ""}` : "object-cover"
          } ${imgClassName}`}
          style={position || img.focus ? { objectPosition: position ?? img.focus ?? undefined } : undefined}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <img src="/brand/emblem.png" alt="" className="w-1/3 opacity-15" />
        </div>
      )}
    </div>
  );
}
