"use client";
import { useState } from "react";
import { Photo } from "@/components/photo";
import type { Img } from "@/lib/catalog";

/** Галерея товара: главное фото в родной пропорции (предметные — в квадрате), миниатюры переключают его */
export function Gallery({ images, alt }: { images: Img[]; alt: string }) {
  const [i, setI] = useState(0);
  const main = images[i];
  return (
    <div>
      <Photo
        key={main?.src ?? "none"}
        img={main}
        alt={alt}
        sizes="(min-width: 1024px) 55vw, 100vw"
        ratio={main && !main.cutout ? `${main.w} / ${main.h}` : "1 / 1"}
        eager
        className="rounded-[14px]"
        fit={main && !main.cutout ? "cover" : undefined}
        position="50% 50%"
      />
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-3" role="group" aria-label="Фото товара">
          {images.map((img, n) => (
            <button key={img.src} type="button" onClick={() => setI(n)} aria-label={`Фото ${n + 1}`} aria-pressed={n === i} className={`rounded-[8px] ring-offset-2 ring-offset-cream ${n === i ? "ring-1 ring-brown" : "opacity-80 hover:opacity-100"}`}>
              <Photo img={img} alt="" sizes="15vw" className="rounded-[8px]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
