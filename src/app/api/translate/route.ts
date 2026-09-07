import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/supabase/getUser";
import { enforceRateLimit, standardRules } from "@/lib/rate-limit";
import { requestDeviceId } from "@/lib/user-agent";
import { getTranslationProvider } from "@/lib/ai";

const BodySchema = z.object({
  texts: z.array(z.string()).min(1).max(20),
  from: z.string().default("en"),
  to: z.string().default("vi"),
});

// Provider dịch tùy AI_PROVIDER. Với MyMemory (mặc định hiện tại) mỗi chuỗi là
// MỘT request, nên một lượt gọi 20 chuỗi = 20 request ra ngoài — mà quota
// MyMemory tính chung cho cả app theo MYMEMORY_EMAIL: một người gọi nhiều là cả
// app hết dịch. Đổi sang OpenAI/Gemini thì đây còn là tiền. Hạn mức vì vậy chặt
// hơn /api/lookup.
const TRANSLATE_RULES = standardRules("translate", 20, 15, 300);

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const limited = await enforceRateLimit({
    userId: user.id,
    deviceId: requestDeviceId(request),
    rules: TRANSLATE_RULES,
    message: "Bạn dịch quá nhanh. Thử lại sau ít giây.",
  });
  if (limited) return limited;

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
