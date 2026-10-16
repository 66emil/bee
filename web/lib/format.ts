// Единый формат цен и фасовок по всему сайту: «3 155 ₽», «1 020,50 ₽», «500 г», «1 кг».

const intFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function price(n: number | null | undefined) {
  if (n == null) return "";
  const s = Number.isInteger(n) ? intFmt.format(n) : decFmt.format(n);
  return `${s.replace(/ | /g, " ")} ₽`;
}

export function weight(grams: number | null | undefined, fallback?: string | null): string {
  if (grams) return grams >= 1000 ? `${String(grams / 1000).replace(".", ",")} кг` : `${grams} г`;
  return normalizeUnit(fallback);
}

/** «1000г» → «1 кг», «500 гр» → «500 г», «1 килограмм» → «1 кг» */
export function normalizeUnit(s: string | null | undefined): string {
  if (!s) return "";
  const m = s.toLowerCase().replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(кг|килограмм\w*|г\b|гр\w*)/);
  if (!m) return s.trim();
  const v = parseFloat(m[1]);
  const g = m[2].startsWith("к") ? v * 1000 : v;
  return weight(g);
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/** Первое предложение — для коротких подписей в карточках */
export function firstSentence(s: string | null | undefined, max = 90) {
  if (!s) return "";
  const first = s.split(/(?<=[.!?])\s/)[0].replace(/\.$/, "");
  return first.length > max ? first.slice(0, max).replace(/[\s,;:]+\S*$/, "") + "…" : first;
}
