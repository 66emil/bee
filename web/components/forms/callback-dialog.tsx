"use client";
import { useEffect, useRef } from "react";
import { uiStore, useUi } from "@/components/ui-store";
import { IconCheck, IconClose } from "@/components/icons";
import { Consent, Field } from "./field";
import { formValues, useSubmit } from "./use-submit";
import { validateCallback } from "@/lib/validation";
import { mainPhone } from "@/lib/site";

export function CallbackDialog() {
  const { callback } = useUi();
  const ref = useRef<HTMLDialogElement>(null);
  const { status, errors, submit, reset } = useSubmit("/api/callback");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (callback && !d.open) d.showModal();
    if (!callback && d.open) d.close();
  }, [callback]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        uiStore.set({ callback: false });
        if (status === "done") reset();
      }}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[min(92vw,440px)] rounded-[14px] bg-cream p-0 text-ink shadow-[0_30px_80px_-30px_rgba(43,28,18,0.5)] backdrop:bg-ink/35 backdrop:backdrop-blur-[2px]"
      aria-labelledby="cb-title"
    >
      <div className="relative p-6 md:p-8">
        <button type="button" onClick={() => ref.current?.close()} className="absolute right-3 top-3 grid size-11 place-items-center rounded-full hover:bg-paper" aria-label="Закрыть">
          <IconClose />
        </button>
        {status === "done" ? (
          <div className="py-6 text-center">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-honey-soft text-brown">
              <IconCheck className="size-7" />
            </span>
            <p id="cb-title" className="font-display text-3xl">Заявка отправлена</p>
            <p className="mt-2 text-ink-2">Мы скоро свяжемся с вами.</p>
            <button type="button" className="btn btn-ghost mt-6" onClick={() => ref.current?.close()}>
              Хорошо
            </button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              await submit(formValues(e.currentTarget), validateCallback);
            }}
            className="space-y-4"
          >
            <div className="pr-10">
              <p id="cb-title" className="font-display text-3xl leading-tight">Перезвоним</p>
              <p className="mt-1 text-ink-2">Подскажем с выбором сорта или примем заказ по телефону.</p>
            </div>
            <Field form="cb" label="Имя" name="name" autoComplete="name" error={errors.name} />
            <Field form="cb" label="Телефон" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 (___) ___-__-__" error={errors.phone} />
            {errors._form && <p className="text-sm text-error">{errors._form}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={status === "sending"}>
              {status === "sending" ? "Отправляем…" : "Перезвоните мне"}
            </button>
            <Consent action="нажимая кнопку" />
            <p className="text-center text-sm text-ink-3">
              или позвоните сами:{" "}
              <a href={`tel:${mainPhone.tel}`} className="text-ink underline underline-offset-4">
                {mainPhone.display}
              </a>
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}
