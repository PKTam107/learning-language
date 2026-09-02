"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Lấy id user hiện tại **không gọi mạng**.
 *
 * `auth.getUser()` gửi một request tới Supabase Auth để xác thực lại token —
 * ở phía client nó chạy *tuần tự trước* mọi query, nên mỗi màn hình phải chờ
 * thêm một round-trip trước khi bắt đầu lấy dữ liệu. `getSession()` đọc phiên
 * đã lưu sẵn ở trình duyệt (và tự làm mới khi token hết hạn), nên gần như
 * tức thì.
 *
 * Đổi được vì ở đây id chỉ dùng để **dựng câu query và chặn UI khi chưa đăng
 * nhập** — không phải hàng rào bảo mật. Hàng rào thật là RLS trên Postgres:
 * mọi bảng đều lọc theo `auth.uid()` lấy từ token do server tự giải mã
 * (xem supabase/migrations/0003_harden_rls.sql), nên token giả/hết hạn không
 * đọc hay ghi được gì dù client có nói mình là ai.
 *
 * Phía server thì vẫn phải dùng `getUser()` — xem lib/supabase/getUser.ts
 * (route handler) và lib/supabase/middleware.ts.
 */
export async function currentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  return session?.user?.id ?? null;
}
