# 09 — Phiên đăng nhập và khôi phục mật khẩu

Access token và refresh token là hai thứ khác nhau: JWT có thời hạn ngắn;
refresh token được luân chuyển bởi Supabase để giữ phiên đăng nhập. Không cần
kéo dài JWT lên 1 ngày để người dùng giữ đăng nhập một tuần.

## Cấu hình phải kiểm tra trên Supabase Dashboard

Code trong repo không thay đổi được cấu hình của project đang chạy.

| Cài đặt | Giá trị khuyến nghị | Ghi chú |
| --- | --- | --- |
| JWT expiry | `3600` giây | JWT đã cấp có thể còn dùng được đến khi hết hạn, kể cả sau khi thu hồi refresh token. |
| Refresh token rotation | Bật | Giữ cơ chế chống dùng lại token. |
| Refresh token reuse interval | Mặc định `10` giây | Không tăng để che lỗi race khi refresh. |
| Inactivity timeout | `604800` giây nếu gói hỗ trợ | Phiên không hoạt động trong 7 ngày phải đăng nhập lại. |
| Time-box user sessions | Theo chính sách sản phẩm nếu gói hỗ trợ | Khác với timeout khi không hoạt động. |
| Confirm email | Bật | Kiểm tra 12 ký tự ở giao diện không thay thế chính sách phía Auth server. |
| Minimum password length | Ít nhất `12` | Áp dụng cả khi gọi trực tiếp Supabase API. |
| Leaked password protection | Bật nếu gói hỗ trợ | Chặn mật khẩu đã bị lộ. |
| Auth rate limits / CAPTCHA | Kiểm tra và cấu hình theo lưu lượng | Giới hạn trong giao diện không ngăn được gọi API trực tiếp. CAPTCHA cần tích hợp widget trước khi bật bắt buộc. |
| Redirect URLs | Liệt kê chính xác các URL production cần dùng | Web: `/auth/callback`, `/auth/callback?next=/auth/reset-password`; native OAuth: `linguacards://auth/callback`. Tránh wildcard production. |

## Trong code

- **Web**: browser client dùng PKCE của `@supabase/ssr`; middleware xác thực
  bằng `getUser()`, chuyển cookie mới xuống server render và trả về trình duyệt,
  kể cả response redirect và khi adapter ghi cookie nhiều lần. Không cache các
  response đi qua middleware. Callback không refresh phiên cũ trước khi đổi code,
  chỉ chuyển tới dashboard hoặc trang reset đã định trước, không chuyển tiếp code.
- **Đăng ký**: web/mobile yêu cầu tối thiểu 12 ký tự và nhập lại mật khẩu. Đăng
  nhập vẫn nhận mật khẩu tài khoản cũ; không áp chính sách mới để chặn họ.
- **Quên mật khẩu web**: gửi email bằng `resetPasswordForEmail`, đổi code ở
  callback rồi tới `/auth/reset-password`. PKCE yêu cầu mở link trên cùng trình
  duyệt đã gửi yêu cầu. Trang lưu mật khẩu xác thực với Auth server trước khi
  `updateUser`, sau đó gọi `signOut({ scope: "global" })`. Nếu đăng xuất thất bại,
  giao diện cho thử lại mà không ghi lại mật khẩu.
- **Mobile**: bật/tắt auto-refresh theo AppState ngay từ lúc khởi tạo, tránh gọi
  `getSession()` trực tiếp trong callback `onAuthStateChange` bằng cách trì hoãn
  ping thiết bị sang lượt chạy tiếp theo. Session và PKCE verifier được mã hóa
  AES-256-GCM trong AsyncStorage, với khóa 256-bit lưu bằng `expo-secure-store`
  (Keychain/Keystore). Mỗi lần ghi dùng nonce mới; tên storage key được xác thực
  kèm ciphertext. Khóa iOS chỉ đọc khi máy đã mở khóa, không chuyển sang máy khác.
  Không dùng sinh trắc học khi auto-refresh để tránh yêu cầu tương tác nền.
  Adapter tự chuyển session cũ và xóa bản rõ; lỗi kho bảo mật không dẫn đến lưu
  plaintext. Mất khóa/ciphertext hỏng thì yêu cầu đăng nhập lại. Sign-out xóa khóa
  trước ciphertext. Android backup loại SecureStore qua config plugin.
  Expo web chỉ giữ khóa trong bộ nhớ, tải lại trang phải đăng nhập lại.
  Luồng quên mật khẩu mới chỉ có trên web; xác nhận email native cần kiểm thử
  riêng trên thiết bị.

## Kiểm thử tích hợp trước khi phát hành

1. Bật xác nhận email, đăng ký địa chỉ mới và thử địa chỉ đã tồn tại; kiểm tra
   thông báo không khẳng định tài khoản tồn tại.
2. Google OAuth: thành công, hủy, code sai/hết hạn, code dùng lại.
3. Quên mật khẩu: dùng link trên cùng trình duyệt, thử link dùng lại/hết hạn;
   đổi thành công rồi đăng nhập bằng mật khẩu mới, kiểm tra phiên ở thiết bị khác
   không thể refresh. JWT cũ có thể còn hiệu lực tới hạn, không phải thu hồi tức thì.
4. Dùng môi trường thử nghiệm với JWT ngắn để quan sát refresh: mở nhiều tab,
   đi qua `/login`, reload và chuyển app native background/foreground. Không ghi
   token ra log hoặc đính kèm token vào báo lỗi.
5. Kiểm tra thực tế `Cache-Control: private, no-store` và `Set-Cookie` qua CDN/proxy.

Tham khảo: [Sessions](https://supabase.com/docs/guides/auth/sessions),
[SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide),
[Password reset](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## Kiểm tra bản mobile dùng secure storage

Cài dependency bằng `cd mobile && npm ci`, rồi **build lại binary native**
(development build hoặc EAS build) để thêm module `expo-secure-store`; OTA
JavaScript không thêm được native module vào binary cũ.

- Nâng cấp từ bản cũ đang đăng nhập: mở app, kiểm tra AsyncStorage không còn
  giá trị bản rõ ở `sb-…-auth-token`/`-code-verifier`; chỉ còn ciphertext
  `linguacards.auth.v1.…`. Không sao chép token vào log hay báo lỗi.
- Đăng nhập Google với metadata lớn, force-close rồi mở lại; kiểm tra refresh
  sau background/foreground, session vẫn đọc được khi máy mở khóa.
- Đăng xuất rồi mở lại, thử restore backup sang thiết bị khác: không được
  phục hồi phiên nếu thiếu khóa gốc. Khóa iOS có thể còn sau uninstall nhưng
  một mình khóa không phục hồi được session nếu ciphertext đã mất.
- Chạy `npm test -- tests/mobile-auth-storage.test.ts` ở thư mục gốc để kiểm tra
  migration, nonce, dữ liệu hỏng, lỗi native/disk và race refresh/sign-out.
