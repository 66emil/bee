// Оформление заказа (прототип). Валидация как на старом сайте; итог пересчитывается по каталогу.
// Заказ не сохраняется в базу — пишется в лог (на Vercel: вкладка Logs). Ответ — номер и состав заказа.
import { randomInt } from "node:crypto";
import { getProduct } from "@/lib/catalog";
import { readOrder, validateOrder } from "@/lib/validation";
import { site } from "@/lib/site";
import { weight } from "@/lib/format";

type Line = { id: number; optionIndex: number | null; count: number };

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: "Некорректный запрос" }, { status: 400 });
  }
  const input = readOrder(body);
  const errors = validateOrder(input);

  const rawLines = Array.isArray(body.lines) ? (body.lines as Line[]) : [];
  const items = [];
  for (const l of rawLines) {
    const p = getProduct(Number(l.id));
    const count = Math.max(0, Math.min(999, Math.round(Number(l.count) || 0)));
    if (!p || !p.available || !count) continue;
    const opt = p.options.length ? p.options.find((o) => o.index === l.optionIndex) ?? p.options[0] : null;
    const unit = opt?.price ?? p.price;
    if (unit == null) continue;
    items.push({ id: p.id, name: p.name, option: opt ? weight(opt.grams, opt.label) : null, price: unit, count, total: Math.round(unit * count * 100) / 100 });
  }
  if (!items.length) errors._form = "Корзина пуста — добавьте мёд, чтобы оформить заказ.";
  if (Object.keys(errors).length) return Response.json({ errors }, { status: 422 });

  const delivery = site.deliveryMethods.find((d) => d.id === input.delivery)!;
  const payment = delivery.payments.length ? site.paymentMethods.find((p) => p.id === input.payment) ?? null : null;
  const subtotal = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const order = {
    id: `DM-${randomInt(100000, 999999)}`,
    createdAt: new Date().toISOString(),
    customer: { name: input.name, phone: input.phone, email: input.email || null },
    delivery: { method: delivery.id, title: delivery.title, address: delivery.needsAddress ? input.address : null, priceFrom: delivery.price },
    payment: payment ? { method: payment.id, title: payment.title } : null,
    comment: input.comment || null,
    items,
    subtotal,
    total: subtotal + delivery.price,
  };
  console.log("[order]", JSON.stringify(order));
  return Response.json(order, { status: 201 });
}
