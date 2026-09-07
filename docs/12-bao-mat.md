# 12 — Bảo mật & quyền riêng tư

Ghi lại **ai chặn ai** trong app, kết quả đợt rà soát, và những việc còn lại.

## 1. Ba hàng rào

| Tầng | Chặn cái gì | Ở đâu |
| --- | --- | --- |
| **RLS (chính)** | Mọi truy vấn chỉ thấy dòng có `user_id = auth.uid()` | policy trong `0001`, siết thêm ở `0003` |
| **Quyền bảng** | Request không có JWT hợp lệ (vai trò `anon`) bị chặn trước cả policy | `0003`, `0009`, `0011` |
| **Route handler** | Mỗi `/api/*` tự kiểm đăng nhập (middleware cố ý bỏ qua `/api`) | `getRequestUser` / `getRequestContext` |

Client **không bao giờ** gửi `user_id` lên server: danh tính luôn lấy từ JWT.
Không có endpoint nào nhận id người dùng làm tham số, nên không có chỗ để đổi id
người khác vào mà đọc trộm (IDOR).

`service_role` (bỏ qua RLS) chỉ xuất hiện ở ba chỗ chạy trên server —
`lib/supabase/server.ts`, `lib/rate-limit.ts`, `lib/lookup.ts` — và không file
`"use client"` nào chạm tới. Key không có tiền tố `NEXT_PUBLIC_` nên không thể
lọt vào bundle trình duyệt.

## 2. Đã rà, đạt

- **Bí mật**: không file `.env*` nào bị commit, kể cả trong lịch sử git. Chỉ có
  `.env.example`. Biến `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` đúng là những thứ vốn
  công khai (URL + anon key).
- **RLS**: cả 9 bảng `public.*` đều bật RLS. `rate_limit_counters` bật RLS mà
  **không** policy → chỉ `service_role` đụng được.
- **Chuỗi sở hữu**: `0003` bắt thẻ phải nằm trong deck của mình, tiến độ phải
  gắn thẻ của mình — không mượn được `deck_id` của người khác.
- **XSS**: chỗ duy nhất dùng `dangerouslySetInnerHTML` là chuỗi tĩnh bootstrap
  giao diện tối. Không có `innerHTML`, `srcDoc`, hay `href` dựng từ dữ liệu người dùng.
- **Log**: không chỗ nào in token / session / mật khẩu ra console.
- **Service worker**: không cache HTML (mỗi trang chứa dữ liệu của tài khoản
  đang đăng nhập — cache lại là rò sang người dùng kế tiếp trên máy dùng chung),
  không đụng `/api/*`, `/auth/*` hay request khác origin.
- **CSRF**: cookie phiên của `@supabase/ssr` mặc định `SameSite=Lax` → trình
  duyệt không gửi cookie theo POST từ site khác.

## 3. Đã vá trong đợt này

| Vấn đề | Vá |
| --- | --- |
| Không có header bảo mật nào — trang nhúng được vào iframe site khác (clickjacking lên nút Xóa bộ thẻ / Gỡ thiết bị) | `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` trong [`next.config.js`](../next.config.js) |
| `/auth/callback?next=` nhận thẳng giá trị từ URL rồi ghép vào redirect | Chỉ nhận đường dẫn nội bộ bắt đầu bằng **một** dấu `/`; chặn `//evil.com` và `/\evil.com` |
| `review_events` (0004) và `user_devices` (0010) ra đời sau `0003` nên vẫn giữ quyền mặc định của vai trò `anon` | [`0011_harden_new_tables.sql`](../supabase/migrations/0011_harden_new_tables.sql) thu hồi |

Riêng mục thứ ba: RLS vẫn đang chặn đúng (policy lọc theo `auth.uid()`, mà
`anon` thì `uid` = null), nên đây là **lớp phòng thủ thứ hai** chứ không phải lỗ
hổng đang mở — nếu sau này ai lỡ tay drop một policy thì tầng quyền bảng vẫn đỡ.

## 4. Việc còn lại (chấp nhận có ý thức)

- **Chưa có Content-Security-Policy.** Trang có inline script (bootstrap giao
  diện tối) và client gọi thẳng Supabase + DictionaryAPI + file audio, nên CSP
  phải liệt kê đúng từng host; làm ẩu là app gãy im lặng trên production. Đây là
  việc nên làm tiếp, có kiểm thử trên preview trước.
- **Cookie phiên không `httpOnly`** — bản chất thiết kế của `@supabase/ssr`
  (client trình duyệt phải đọc được token). Hệ quả: nếu có XSS thì mất token.
  Bù lại bằng việc không có sink XSS nào (§2) và CSP ở trên.
- **Mobile lưu session trong `AsyncStorage`** dạng thường (chuẩn của Supabase
  RN). Máy bị root/jailbreak hoặc bị lấy backup thì đọc được. Muốn chặt hơn thì
  đổi sang `expo-secure-store`.
- **`dictionary_cache` cho mọi người đã đăng nhập đọc** — dùng chung để đỡ gọi
  API. Không gắn user, nhưng ai đó có thể dò xem những từ nào từng được tra
  (không biết ai tra). Chấp nhận được; muốn kín thì bỏ quyền select của
  `authenticated` và đọc qua route handler.
- **`user_devices` lưu IP và User-Agent.** Chỉ chủ tài khoản đọc được (§1) và
  dòng bị xóa khi gỡ thiết bị, nhưng đây là dữ liệu cá nhân — đừng thêm vào
  export hay log.
- **`GET`/`DELETE /api/devices` chưa rate limit** (chỉ `POST` có). Rủi ro thấp
  vì chỉ đụng dữ liệu của chính mình.

## 5. Rà lại khi nào

Mỗi lần thêm bảng mới: bật RLS, viết policy, **và** thu hồi quyền `anon` —
Supabase cấp quyền mặc định cho bảng mới trong schema `public`, `0003` không tự
phủ những bảng sinh sau nó.
