import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/supabase/getUser";
import { getTranslationProvider } from "@/lib/ai";

const BodySchema = z.object({
  texts: z.array(z.string()).min(1).max(20),
  from: z.string().default("en"),
  to: z.string().default("vi"),
});

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { texts, from, to } = parsed.data;
  const translator = getTranslationProvider();
  if (!translator) {
    // Chưa cấu hình AI key → trả lại nguyên văn
    return NextResponse.json({ translations: texts, skipped: true });
  }

  try {
    const translations = await translator.translateBatch(texts, { from, to });
    return NextResponse.json({ translations });
  } catch (err) {
    console.error("translate error", err);
    return NextResponse.json({ error: "Translate failed" }, { status: 502 });
  }
}
