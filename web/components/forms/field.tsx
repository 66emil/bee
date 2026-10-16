import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type Base = { label: string; name: string; error?: string; optional?: boolean; /** префикс id — уникален для каждой формы на странице */ form: string };

export function Field({ label, name, error, optional, form, ...rest }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = `${form}-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-ink-3">— по желанию</span>}
      </label>
      <input id={id} name={name} className="field" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} {...rest} />
      {error && (
        <p id={`${id}-e`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Area({ label, name, error, optional, form, ...rest }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = `${form}-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-ink-3">— по желанию</span>}
      </label>
      <textarea id={id} name={name} rows={4} className="field resize-y" aria-invalid={error ? true : undefined} {...rest} />
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}

export function Consent({ action = "отправляя форму" }: { action?: string }) {
  return (
    <p className="text-[13px] leading-relaxed text-ink-3">
      {action[0].toUpperCase() + action.slice(1)}, вы соглашаетесь с{" "}
      <a href="/politika-konfidencialnosti" target="_blank" className="underline underline-offset-2 hover:text-ink">
        политикой обработки персональных данных
      </a>
      .
    </p>
  );
}
