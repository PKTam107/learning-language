# 09 — Thời hạn phiên đăng nhập (Auth session)

Mục tiêu: **access token sống 1 ngày, refresh token (phiên) sống 1 tuần** để
người dùng không bị đăng xuất giữa chừng.

## Phần code (đã xử lý trong repo)

Việc gia hạn token là **tự động** miễn là client được cấu hình đúng — repo đã đảm bảo:

- **Web** (`src/lib/supabase/client.ts`): `createBrowserClient` mặc định
  `persistSession` + `autoRefreshToken`. Middleware (`src/lib/supabase/middleware.ts`)
  gọi `getUser()` mỗi request nên cookie session được làm mới liên tục.
- **Mobile** (`mobile/src/lib/supabase.ts`): lưu session vào `AsyncStorage`,
  `autoRefreshToken: true`, và bật/tắt `startAutoRefresh`/`stopAutoRefresh` theo
  `AppState` để token được gia hạn khi app ở foreground.

> Code **không** đặt được độ dài access/refresh token — đó là cấu hình của
> project Supabase (bên dưới).

## Phần cấu hình Supabase (phải làm thủ công trên dashboard)

Vào **Supabase Dashboard → Authentication → Sessions** (và **JWT settings**):

| Cài đặt | Giá trị cần đặt | Ý nghĩa |
| --- | --- | --- |
| **Access token (JWT) expiry** | `86400` giây (1 ngày) | Access token hết hạn sau 1 ngày; auto-refresh sẽ cấp token mới. |
| **Refresh token reuse interval** | giữ mặc định (`10` giây) | Chống dùng lại refresh token cũ (bảo mật). |
| **Inactivity timeout** | `604800` giây (1 tuần) | Không hoạt động quá 1 tuần → phiên hết hạn, phải đăng nhập lại. |
| **Time-box user sessions** | để trống / tùy chọn | Nếu muốn buộc đăng nhập lại theo chu kỳ tuyệt đối. |

> Lưu ý: access token expiry tối đa Supabase cho phép là 1 tuần (604800s); đặt 1 ngày là hợp lệ.

### Nếu dùng Supabase CLI (`supabase/config.toml`)

Có thể khai báo tương đương thay vì chỉnh dashboard, rồi `supabase config push`:

```toml
[auth]
jwt_expiry = 86400            # access token 1 ngày
# Phiên hết hạn nếu không hoạt động 1 tuần:
[auth.sessions]
inactivity_timeout = "168h"   # 7 ngày
```

## Kiểm tra nhanh

1. Đăng nhập, mở DevTools → Application → Cookies: xem token `sb-...-auth-token`.
2. Đợi qua mốc 1 giờ (mốc cũ) — nếu vẫn đăng nhập bình thường là auto-refresh chạy.
3. Trên mobile: đóng app > mở lại sau vài giờ — vẫn giữ đăng nhập.
