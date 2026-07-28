import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/supabase/getUser";
import { createServiceClient } from "@/lib/supabase/server";
import { enrichWord, type Enrichment } from "@/lib/enrich";

const BodySchema = z.object({
  words: z.array(z.string().min(1).max(60)).min(1).max(10),
});

// Rate limit backfill: mỗi user tối đa N lô/phút (mỗi lô ≤10 từ). Chống đập Datamuse.
const ENRICH_LIMIT = 60;
const ENRICH_WINDOW_SECONDS = 60;

async function withinRate(userId: string): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    const { data, error } = await createServiceClient().rpc("consume_rate_limit", {
      p_user_id: userId,
      p_bucket: "enrich",
      p_limit: ENRICH_LIMIT,
      p_window_seconds: ENRICH_WINDOW_SECONDS,
    });
    if (error) return true; // RPC lỗi (migration chưa chạy) → không chặn
    return data !== false;
  } catch {
    return true;
  }
}

/**
 * Tính enrichment (CEFR + word family + collocations) cho một lô từ.
 * Dùng cho backfill các thẻ cũ. Trả về { [word]: Enrichment }.
 * KHÔNG ghi DB — client tự cập nhật thẻ của mình (RLS).
 */
export async function POST(request: Request) {
  const user = await getRequestUser(request);
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!(await withinRate(user.id))) {
    return NextResponse.json(
      { error: "Rate limited", message: "Làm giàu quá nhanh, thử lại sau ít giây." },
      { status: 429, headers: { "Retry-After": String(ENRICH_WINDOW_SECONDS) } }
    );
  }

  const words = [...new Set(parsed.data.words.map((w) => w.trim().toLowerCase()))];
  const entries = await Promise.all(
    words.map(async (w) => [w, await enrichWord(w)] as const)
  );
  return NextResponse.json(Object.fromEntries(entries) as Record<string, Enrichment>);
}
