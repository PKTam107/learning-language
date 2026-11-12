import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/supabase/getUser";
import { enforceRateLimit, standardRules } from "@/lib/rate-limit";
import { requestDeviceId } from "@/lib/user-agent";
import { commonsImages } from "@/lib/commons-images";

const Body = z.object({ query: z.string().trim().min(1).max(100) });

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nhập từ khóa từ 1–100 ký tự." }, { status: 400 });
  const limited = await enforceRateLimit({ userId: user.id, deviceId: requestDeviceId(request), rules: standardRules("images", 10, 10, 100), message: "Bạn tìm ảnh quá nhanh, hãy thử lại sau." });
  if (limited) return limited;
  try {
    const query = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", generator: "search",
      gsrsearch: `${parsed.data.query} filetype:bitmap|drawing`, gsrnamespace: "6", gsrlimit: "12",
      prop: "imageinfo", iiprop: "url|mime|thumbmime|extmetadata", iiurlwidth: "640",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl", iiextmetadatalanguage: "en",
    });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, {
      headers: { "User-Agent": "LinguaCards/0.1 (vocabulary flashcards; Wikimedia Commons image search)" },
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return NextResponse.json({ error: response.status === 429 ? "Nguồn ảnh đã hết lượt tìm tạm thời. Hãy thử lại sau." : "Chưa kết nối được nguồn ảnh. Hãy thử lại sau." }, { status: 503 });
    const data = await response.json();
    const images = commonsImages(data);
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ error: "Không tải được ảnh. Bạn có thể thử lại hoặc lưu thẻ không có ảnh." }, { status: 502 });
  }
}
