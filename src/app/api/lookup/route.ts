import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildDraftCard } from "@/lib/lookup";

const BodySchema = z.object({
  word: z.string().min(1).max(100),
  source: z.string().default("en"),
  target: z.string().default("vi"),
});

export async function POST(request: Request) {
  // Yêu cầu đăng nhập (tránh lạm dụng API key)
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { word, source, target } = parsed.data;

  try {
    const draft = await buildDraftCard(word, source, target);
    return NextResponse.json(draft);
  } catch (err) {
    console.error("lookup error", err);
    return NextResponse.json(
      { error: "Lookup failed", message: (err as Error).message },
      { status: 502 }
    );
  }
}
