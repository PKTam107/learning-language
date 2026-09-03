"use client";

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/currentUser";

/**
 * Cài đặt lưu theo TÀI KHOẢN (`profiles.settings`, migration 0009) để đổi thiết
 * bị không mất. Giao diện sáng/tối vẫn cố tình để theo thiết bị — điện thoại
 * dùng nền tối trong khi máy tính dùng nền sáng là chuyện bình thường.
 *
 * Kiểu trả về để lỏng (`Record`) vì đây là jsonb: người dùng có thể đang chạy
 * bản app cũ/mới hơn, khóa lạ phải được bỏ qua chứ không làm sập.
 */
export async function fetchRemoteSettings(): Promise<Record<
  string,
  unknown
> | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  const { data, error } = await createClient()
    .from("profiles")
    .select("settings")
    .eq("id", userId)
    .maybeSingle();
  // Cột chưa migrate hoặc chưa có profile → dùng cài đặt của thiết bị.
  if (error || !data) return null;
  return (data.settings as Record<string, unknown> | null) ?? null;
}

/** Ghi cài đặt lên tài khoản. Lỗi (mất mạng, chưa migrate) thì bỏ qua im lặng. */
export async function saveRemoteSettings(
  settings: Record<string, unknown>
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;

  // upsert thay vì update: tài khoản tạo trước khi có trigger `handle_new_user`
  // sẽ không có dòng profile nào để update.
  const { error } = await createClient()
    .from("profiles")
    .upsert({ id: userId, settings }, { onConflict: "id" });
  if (error) console.warn("saveRemoteSettings:", error.message);
}
