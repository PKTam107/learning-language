import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/supabase/getUser";
import { enforceRateLimit, standardRules } from "@/lib/rate-limit";
import { requestDeviceId } from "@/lib/user-agent";
import { buildDraftCard } from "@/lib/lookup";

const BodySchema = z.object({
  word: z.string().min(1).max(100),
  source: z.string().default("en"),
  target: z.string().default("vi"),
});

// Mỗi lượt tra = 1 lần gọi DictionaryAPI + 1 lượt dịch, mà hạn ngạch dịch tính
// chung cho cả app (xem /api/translate). Ba tầng: 30 lượt/phút mỗi tài khoản,
// trong đó một thiết bị không quá 20 — máy bị lạm dụng không nuốt trọn hạn mức
// của tài khoản; và 500 lượt/ngày để một người không vét sạch hạn ngạch chung.
const LOOKUP_RULES = standardRules("lookup", 30, 20, 500);

// Một lượt tra có thể phải chờ dictionary (có retry) + dịch + làm giàu. Mức mặc
// định 10s của Vercel làm cụm nhiều từ bị cắt giữa chừng khi upstream chậm.
export const maxDuration = 30;

export async function POST(request: Request) {
  // Yêu cầu đăng nhập (tránh lạm dụng API key) — cookie (web) hoặc Bearer (mobile)
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit({
    userId: user.id,
    deviceId: requestDeviceId(request),
    rules: LOOKUP_RULES,
    message: "Bạn tra từ quá nhanh. Thử lại sau ít giây.",
  });
  if (limited) return limited;

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
