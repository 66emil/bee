// «Перезвоните мне» (прототип): валидация, запись в лог.
import { validateCallback } from "@/lib/validation";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const errors = validateCallback(body);
  if (Object.keys(errors).length) return Response.json({ errors }, { status: 422 });
  console.log("[callback]", JSON.stringify({ name: body.name, phone: body.phone, at: new Date().toISOString() }));
  return Response.json({ ok: true }, { status: 201 });
}
