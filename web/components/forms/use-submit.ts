"use client";
import { useState } from "react";
import type { Errors } from "@/lib/validation";

type Status = "idle" | "sending" | "done" | "error";

/** Отправка формы в API прототипа: валидация на сервере, ошибки по полям возвращаются как { errors } */
export function useSubmit<T = unknown>(url: string) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<T | null>(null);

  async function submit(body: Record<string, unknown>, validate?: (b: Record<string, unknown>) => Errors) {
    const local = validate?.(body) ?? {};
    if (Object.keys(local).length) {
      setErrors(local);
      return null;
    }
    setStatus("sending");
    setErrors({});
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? { _form: data.message ?? "Не получилось отправить. Попробуйте ещё раз или позвоните нам." });
        setStatus("error");
        return null;
      }
      setResult(data as T);
      setStatus("done");
      return data as T;
    } catch {
      setErrors({ _form: "Нет связи с сервером. Попробуйте ещё раз или позвоните нам." });
      setStatus("error");
      return null;
    }
  }

  return { status, errors, result, submit, setErrors, reset: () => (setStatus("idle"), setErrors({})) };
}

export function formValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
}
