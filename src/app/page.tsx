import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Cổng gốc: bắt buộc đăng nhập mới vào được trang chủ.
 * - Đã đăng nhập → /dashboard
 * - Chưa đăng nhập → /login
 */
export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
