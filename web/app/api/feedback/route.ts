// Форма обратной связи на /contacts (прототип): валидация, запись в лог.
import { validateFeedback } from "@/lib/validation";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const errors = validateFeedback(body);
  if (Object.keys(errors).length) return Response.json({ errors }, { status: 422 });
  console.log("[feedback]", JSON.stringify({ ...body, at: new Date().toISOString() }));
  return Response.json({ ok: true }, { status: 201 });
}
