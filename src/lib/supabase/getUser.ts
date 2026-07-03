import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "./server";

/**
 * Lấy user đã đăng nhập từ request — hỗ trợ 2 cách:
 *  1. Cookie session (web app, Next.js).
 *  2. Header `Authorization: Bearer <access_token>` (app mobile / client ngoài).
 *
 * Trả về null nếu không xác thực được.
 */
export async function getRequestUser(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    // Anon client + getUser(token): xác thực JWT mà không cần cookie.
    const anon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data } = await anon.auth.getUser(token);
    return data.user ?? null;
  }

  // Mặc định: đọc session từ cookie (web).
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
