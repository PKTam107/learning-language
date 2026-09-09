# 12 — Bảo mật & quyền riêng tư

Ghi lại **ai chặn ai** trong app, kết quả đợt rà soát, và những việc còn lại.

## 1. Ba hàng rào

| Tầng | Chặn cái gì | Ở đâu |
| --- | --- | --- |
| **RLS (chính)** | Mọi truy vấn chỉ thấy dòng có `user_id = auth.uid()` | policy trong `0001`, siết thêm ở `0003` |
| **Quyền bảng** | Request không có JWT hợp lệ (vai trò `anon`) bị chặn trước cả policy | `0003`, `0009`, `0011` |
| **Route handler** | Mỗi `/api/*` tự kiểm đăng nhập — `/api` bị `matcher` của middleware loại từ đầu nên không xác thực hai lần | `getRequestUser` / `getRequestContext`, [`src/middleware.ts`](../src/middleware.ts) |

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
| Không có Content-Security-Policy — script lạ chèn được là đọc luôn cookie phiên (cookie này không `httpOnly`) | CSP theo **nonce** sinh trong middleware, xem §3.1 |
| Cookie phiên không có `Secure`, site cũng không có HSTS — một lần lỡ mở `http://` là token đi dạng thô, mà cookie này không `httpOnly` nên đọc được là dùng được luôn | `cookieOptions.secure` dùng chung cho cả ba nơi tạo client ([`cookie-options.ts`](../src/lib/supabase/cookie-options.ts)) + `Strict-Transport-Security` trong [`next.config.js`](../next.config.js) |
| Middleware chuyển hướng bằng response **mới**, không chép cookie → phiên `getUser()` vừa gia hạn bị bỏ rơi, trình duyệt giữ refresh token cũ; quá reuse interval (10s) là bị đá ra giữa buổi | `redirectTo()` chép cookie từ `supabaseResponse` sang response redirect, xem §3.2 |

Riêng mục thứ ba: RLS vẫn đang chặn đúng (policy lọc theo `auth.uid()`, mà
`anon` thì `uid` = null), nên đây là **lớp phòng thủ thứ hai** chứ không phải lỗ
hổng đang mở — nếu sau này ai lỡ tay drop một policy thì tầng quyền bảng vẫn đỡ.

### 3.1 CSP theo nonce

Chính sách dựng ở [`src/lib/csp.ts`](../src/lib/csp.ts), gắn vào response trong
[`src/lib/supabase/middleware.ts`](../src/lib/supabase/middleware.ts).

Mỗi request sinh một `nonce` ngẫu nhiên 128 bit. Middleware đặt nó vào **header
của request** (`x-nonce` cho layout đọc, và chính chuỗi CSP để Next tự gắn nonce
vào các `<script>` nó sinh ra) lẫn **header của response**. Chỉ script mang đúng
nonce đó mới chạy — script kẻ tấn công chèn vào không đoán được.

Cố ý **không** dùng `'unsafe-inline'` cho script: có nó thì CSP gần như vô nghĩa
trước XSS. `'strict-dynamic'` là bắt buộc vì Next tải chunk bằng JS nên không
liệt kê trước từng file được.

| Directive | Vì sao |
| --- | --- |
| `script-src 'self' 'nonce-…' 'strict-dynamic'` | thêm `'unsafe-eval'` **chỉ trong dev** (Next dev dùng eval) |
| `style-src 'self' 'unsafe-inline'` | Next và next/font chèn `<style>` lúc hydrate; CSS không chạy được mã nên rủi ro thấp |
| `connect-src 'self' <supabase>` | client gọi thẳng Supabase REST + Auth |
| `media-src 'self' https:` | file phát âm của DictionaryAPI **và** URL người dùng tự nhập khi import — khoá theo host là gãy audio thẻ import |
| `font-src 'self'` | `next/font` tải Inter về lúc build, không cần fonts.gstatic.com |
| `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` | chống nhúng iframe, plugin, và `<base>` bị chèn để đổi gốc URL tương đối |

**Đánh đổi phải biết**: layout đọc `headers()` để lấy nonce, nên toàn bộ trang
chuyển từ prerender tĩnh (○) sang render theo request (ƒ). Cụ thể `/login` và
`/offline` trước đây CDN cache được, giờ trả `Cache-Control: private, no-store`.
Đây là điều kiện đúng đắn — HTML mang nonce mà bị cache là nonce dùng lại, CSP
mất tác dụng. Các trang còn lại vốn đã qua middleware gọi `getUser()` mỗi
request nên phần hụt không đáng kể.

**Gỡ ra khi cần**: đặt biến môi trường `CSP_REPORT_ONLY=1` → trình duyệt chỉ ghi
vi phạm ra console chứ không chặn. Biến này nhúng lúc build nên đổi xong phải
deploy lại.

**Thêm dịch vụ ngoài về sau** (analytics, Sentry, CDN ảnh…) thì phải bổ sung host
vào đúng directive trong `csp.ts`, nếu không trình duyệt chặn im lặng.

### 3.2 Cookie phiên khi middleware chuyển hướng

`getUser()` trong [`middleware.ts`](../src/lib/supabase/middleware.ts) không chỉ
đọc phiên — nó **tự gia hạn** khi access token hết hạn, và cookie mới được ghi
lên `supabaseResponse`. Hai nhánh chuyển hướng (`/login` khi chưa đăng nhập,
`/dashboard` khi đã đăng nhập) dựng response khác, nên phải chép cookie sang
bằng tay; thiếu bước đó là trình duyệt giữ refresh token cũ và lần gia hạn kế
tiếp bị Supabase từ chối (reuse interval mặc định 10 giây).

## 4. Việc còn lại (chấp nhận có ý thức)

- **Cookie phiên không `httpOnly`** — bản chất thiết kế của `@supabase/ssr`
  (client trình duyệt phải đọc được token), không sửa được từ phía app. Hệ quả:
  XSS là mất token. Bù bằng ba lớp: không có sink XSS nào (§2), CSP theo nonce
  chặn script lạ chạy ngay từ đầu (§3.1), và `Secure` + HSTS để token không rò
  qua đường truyền http (§3).
- **`maxAge` của cookie phiên là 400 ngày** (mặc định thư viện) trong khi ý đồ ở
  [docs/09](./09-auth-session.md) là phiên 1 tuần. Không phải lỗ hổng — token
  bên trong hết hạn là cookie vô dụng — nhưng cái vỏ nằm lại trên máy dùng chung
  rất lâu. Muốn khớp thì thêm `maxAge` vào `cookie-options.ts`.
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
