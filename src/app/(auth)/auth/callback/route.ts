import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Chỉ cho phép các đích auth được ứng dụng sử dụng; không chuyển tiếp URL tùy ý.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") === "/auth/reset-password"
    ? "/auth/reset-password" : "/dashboard";
  let target = "/login?error=auth";
  if (code && !searchParams.has("error")) {
    try {
      const { error } = await createClient().auth.exchangeCodeForSession(code);
      if (!error) target = next;
    } catch {
      // Không đưa code, token hoặc chi tiết nhà cung cấp vào URL lỗi.
    }
  }
  const response = NextResponse.redirect(new URL(target, origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
