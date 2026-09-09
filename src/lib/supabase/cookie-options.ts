import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Thuộc tính cookie phiên, dùng chung cho CẢ BA nơi tạo client (browser,
 * middleware, server). Cùng một cookie được ghi ở nhiều nơi — browser lúc đăng
 * nhập, middleware lúc gia hạn — nên lệch thuộc tính giữa các nơi là mỗi lần
 * ghi lại đổi tính chất của chính cookie đó.
 *
 * Chỉ đặt những gì cần khác mặc định của @supabase/ssr; phần còn lại
 * (`path=/`, `SameSite=Lax`) giữ nguyên. `httpOnly` cố ý KHÔNG bật được:
 * client trình duyệt phải đọc được token — bù bằng CSP theo nonce (lib/csp.ts).
 */
export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  /**
   * Thư viện không tự thêm `Secure`. Thiếu nó thì một lần lỡ mở `http://` là
   * token phiên đi dạng thô trên đường truyền — mà cookie này không httpOnly
   * nên đọc được là dùng được luôn. Đi cùng header HSTS ở next.config.js.
   *
   * Dev chạy http://localhost nên phải tắt, bật là trình duyệt bỏ cookie và
   * không đăng nhập được.
   */
  secure: process.env.NODE_ENV === "production",
};
