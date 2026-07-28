import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/supabase/getUser";
import { createServiceClient } from "@/lib/supabase/server";
import { buildDraftCard } from "@/lib/lookup";

const BodySchema = z.object({
  word: z.string().min(1).max(100),
  source: z.string().default("en"),
  target: z.string().default("vi"),
});

// Rate limit tra từ: mỗi user tối đa N lượt / cửa sổ (chống lạm dụng key AI).
const LOOKUP_LIMIT = 30;
const LOOKUP_WINDOW_SECONDS = 60;

/**
 * Trả về false nếu user đã vượt hạn mức tra từ trong cửa sổ hiện tại.
 * Đếm atomic phía Postgres (bền vững trên serverless nhiều instance).
 * Nếu thiếu service key hoặc RPC lỗi (vd migration chưa chạy) → cho qua,
 * không chặn người dùng.
 */
async function withinLookupRate(userId: string): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    const { data, error } = await createServiceClient().rpc(
      "consume_rate_limit",
      {
        p_user_id: userId,
        p_bucket: "lookup",
        p_limit: LOOKUP_LIMIT,
        p_window_seconds: LOOKUP_WINDOW_SECONDS,
      }
    );
    if (error) {
      console.warn("rate limit rpc:", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.warn("rate limit:", (e as Error).message);
    return true;
  }
}

export async function POST(request: Request) {
  // Yêu cầu đăng nhập (tránh lạm dụng API key) — cookie (web) hoặc Bearer (mobile)
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await withinLookupRate(user.id))) {
    return NextResponse.json(
      {
        error: "Rate limited",
        message: `Bạn tra từ quá nhanh (tối đa ${LOOKUP_LIMIT} lượt/phút). Thử lại sau ít giây.`,
      },
      { status: 429, headers: { "Retry-After": String(LOOKUP_WINDOW_SECONDS) } }
    );
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
