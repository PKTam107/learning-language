import { createClient as createAnonClient, type SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

/**
 * Client Supabase mang đúng danh tính của người gọi request, cho cả hai kiểu
 * xác thực (cookie web / Bearer mobile). Cần khi route handler gọi RPC dựa vào
 * `auth.uid()` và claim `session_id` — service_role không có hai thứ đó.
 */
export interface RequestContext {
  user: User;
  supabase: SupabaseClient;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

/**
 * Xác thực request và trả về client chạy dưới danh nghĩa user đó.
 * Trả về null nếu không xác thực được.
 */
export async function getRequestContext(
  request: Request
): Promise<RequestContext | null> {
  const token = bearerToken(request);

  if (token) {
    // Anon key + JWT của user: RLS và auth.uid() hoạt động như trên web.
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );
    const { data } = await supabase.auth.getUser(token);
    return data.user ? { user: data.user, supabase } : null;
  }

  // Mặc định: đọc session từ cookie (web).
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { user, supabase } : null;
}

/**
 * Lấy user đã đăng nhập từ request — hỗ trợ 2 cách:
 *  1. Cookie session (web app, Next.js).
 *  2. Header `Authorization: Bearer <access_token>` (app mobile / client ngoài).
 *
 * Trả về null nếu không xác thực được.
 */
export async function getRequestUser(request: Request): Promise<User | null> {
  return (await getRequestContext(request))?.user ?? null;
}
