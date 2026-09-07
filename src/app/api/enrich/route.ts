import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/supabase/getUser";
import { enforceRateLimit, standardRules } from "@/lib/rate-limit";
import { requestDeviceId } from "@/lib/user-agent";
import { enrichWord, type Enrichment } from "@/lib/enrich";

const BodySchema = z.object({
  words: z.array(z.string().min(1).max(60)).min(1).max(10),
});

// Rate limit backfill (mỗi lô ≤10 từ, đập vào Datamuse): 60 lô/phút mỗi tài
// khoản, 40 lô/phút mỗi thiết bị, 1000 lô/ngày.
const ENRICH_RULES = standardRules("enrich", 60, 40, 1000);

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

  const limited = await enforceRateLimit({
    userId: user.id,
    deviceId: requestDeviceId(request),
    rules: ENRICH_RULES,
    message: "Làm giàu quá nhanh, thử lại sau ít giây.",
  });
  if (limited) return limited;

  const words = [...new Set(parsed.data.words.map((w) => w.trim().toLowerCase()))];
  const entries = await Promise.all(
    words.map(async (w) => [w, await enrichWord(w)] as const)
  );
  return NextResponse.json(Object.fromEntries(entries) as Record<string, Enrichment>);
}
