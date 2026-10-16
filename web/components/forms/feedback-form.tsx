"use client";
import { Area, Consent, Field } from "./field";
import { formValues, useSubmit } from "./use-submit";
import { validateFeedback } from "@/lib/validation";
import { IconCheck } from "@/components/icons";

export function FeedbackForm() {
  const { status, errors, submit, reset } = useSubmit("/api/feedback");
  if (status === "done") {
    return (
      <div className="rounded-[14px] bg-paper p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-honey-soft text-brown">
          <IconCheck className="size-7" />
        </span>
        <p className="mt-4 font-display text-3xl">Сообщение отправлено</p>
        <p className="mt-2 text-ink-2">Спасибо! Ответим в ближайшее время.</p>
        <button type="button" className="btn btn-ghost mt-6" onClick={reset}>
          Написать ещё
        </button>
      </div>
    );
  }
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await submit(formValues(e.currentTarget), validateFeedback);
      }}
    >
      <Field form="fb" label="Имя" name="name" autoComplete="name" error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field form="fb" label="E-mail" name="email" type="email" autoComplete="email" optional error={errors.email} />
        <Field form="fb" label="Телефон" name="phone" type="tel" inputMode="tel" autoComplete="tel" optional error={errors.phone} />
      </div>
      <Area form="fb" label="Сообщение" name="message" error={errors.message} />
      {errors._form && <p className="text-sm text-error">{errors._form}</p>}
      <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
        {status === "sending" ? "Отправляем…" : "Отправить"}
      </button>
      <Consent />
    </form>
  );
}
