# LinguaCards Mobile 📱

App di động (Expo / React Native) cho LinguaCards. Dùng **chung Supabase** với
web app — cùng database, cùng RLS, cùng tài khoản.

> 📐 Mobile khớp vào kiến trúc hệ thống thế nào (dùng chung backend + route handler
> với web): xem [`../docs/06-mobile.md`](../docs/06-mobile.md). Doc dưới đây là phần
> setup & cấu trúc của riêng package mobile.

## Tech stack

- **Expo SDK 52 + expo-router v4** — file-based routing trong `app/`
- **React Native 0.76** + TypeScript
- **@supabase/supabase-js** + AsyncStorage — auth & data, session lưu trên máy
- Backend dùng lại nguyên web app (Postgres + RLS + API route `/api/lookup`, `/api/translate`)

## Bắt đầu

### 1. Cài dependencies
```bash
cd mobile
npm install
```

### 2. Cấu hình môi trường
```bash
cp .env.example .env
```
Điền `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY` (cùng giá trị
với `../.env.local` của web — đây là anon key, an toàn để nhúng vào app).
**Không bao giờ** đưa `service_role` key vào app mobile.

### 3. Chạy
```bash
npm start          # Metro + QR (quét bằng Expo Go)
npm run android    # mở thẳng trên Android emulator
npm run ios        # mở thẳng trên iOS simulator (cần macOS)
```

> Yêu cầu **Node ≥ 18.18**.

📖 **Hướng dẫn chạy chi tiết** (emulator trên WSL2, điện thoại thật, build APK, tra từ,
xử lý lỗi thường gặp): xem [`docs/chay-app.md`](./docs/chay-app.md).

## Cấu trúc

```
app/                  # expo-router (mỗi file = 1 route)
  _layout.tsx         # root: AuthProvider + Stack
  index.tsx           # cổng điều hướng (chờ session → (app) hoặc (auth))
  (auth)/             # nhóm route chưa đăng nhập
    _layout.tsx       # đã login thì redirect vào (app)
    login.tsx         # đăng nhập / đăng ký bằng email + Google OAuth
  (app)/              # nhóm route đã đăng nhập (có gác session)
    _layout.tsx       # Stack: tabs + các màn học/chi tiết riêng
    (tabs)/
      _layout.tsx     # menu dưới có biểu tượng và tên, hỗ trợ sáng/tối
      index.tsx       # Trang chủ: việc cần ôn, mục tiêu, chuỗi và thử thách
      learn.tsx       # Học tập: học nhanh, ôn hôm nay, đọc hiểu, từ hay quên
      decks.tsx       # Bộ từ: quản lý bộ thẻ, thêm/sửa/xóa, sao lưu
      progress.tsx    # Tiến độ: lịch ôn, heatmap, huy hiệu
      settings.tsx    # Cài đặt, tài khoản và đăng xuất
    reading.tsx       # bài đọc (ẩn menu dưới để tập trung)
    study/[deckId].tsx # phiên ôn (today / weak / UUID bộ thẻ)
    decks/[id].tsx    # chi tiết bộ thẻ
    share.tsx         # nhận từ được chia sẻ ngoài app
src/
  lib/supabase.ts     # Supabase client (AsyncStorage + url polyfill)
  lib/theme.ts        # bảng màu sáng+tối / spacing, đồng bộ với web
  contexts/ThemeContext.tsx  # provider giao diện + useStyles/useThemeColors
  contexts/AuthContext.tsx
  components/ui/       # Button, Input
  types.ts            # domain types (đồng bộ web src/types)
```

## Điều hướng trong app

Thanh menu dưới có năm tab cố định: **Trang chủ · Học tập · Bộ từ · Tiến độ · Cài đặt**.
Muốn đọc bài, vào **Học tập → Đọc hiểu**. Mục này luôn hiện kể cả khi kho từ còn trống;
trang đọc hướng dẫn thêm đủ từ khi cần. **Trang chủ** vẫn có lối vào đọc nhanh.

**Bộ từ** tập trung quản lý nội dung; **Cài đặt → Tài khoản** có nút đăng xuất.
Mở bài đọc, phiên ôn hoặc chi tiết bộ thẻ sẽ ẩn menu dưới, có nút quay lại màn trước.
Các đường dẫn `/settings`, `/progress`, `/reading`, `/decks/:id`, `/study/today`,
`/study/weak` và nhận chia sẻ vẫn dùng được. Màn chính dùng `/decks` cho tab Bộ từ.

Thay đổi menu nằm trong APK: cần cài bản build mới, không tự cập nhật theo web.

## Lệnh hữu ích

| Lệnh | Tác dụng |
|------|----------|
| `npm start` | Dev server (Metro) + QR |
| `npm run android` / `ios` | Mở trên emulator/simulator |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npx eas-cli@latest build -p android --profile preview` | Build APK trên cloud → ra link tải + QR |
| `npx eas-cli@latest build:list -p android --limit 5` | Lấy lại link các build APK gần nhất |

## Tiến độ

- [x] **Feature 1** — Skeleton + auth email (login/signup/signout) + điều hướng có gác session
- [x] **Feature 2** — Danh sách bộ thẻ + tạo/sửa/xóa (pull-to-refresh, FAB, empty state)
- [x] **Feature 3** — Danh sách card trong bộ thẻ + xóa (header tên deck, số từ)
- [x] **Feature 4** — Study mode: lật thẻ (animation), đánh giá, audio US/UK, thanh tiến độ
- [x] **Feature 5** — Tra cứu & thêm từ (QuickCreator gọi `/api/lookup` qua Bearer token)
- [x] **P2 parity** — trạng thái học (bar/chấm/lọc) + chế độ học (Ôn hôm nay/chưa thuộc/giới hạn/xáo trộn) + spaced repetition SM-2 + thống kê "cần ôn". Ngang web.
- [x] **Feature 6** — Google OAuth (nút "Tiếp tục với Google" ở màn login)
- [ ] Parity P1 — sửa / chuyển / xem chi tiết thẻ (web đã có)

## Google OAuth (đăng nhập bằng Google)

Nút **"Tiếp tục với Google"** ở màn login dùng `expo-web-browser` +
`expo-auth-session` (PKCE): mở trình duyệt hệ thống → Google xác thực → redirect
về app qua deep link `linguacards://auth/callback` → đổi `code` lấy session.

**Cấu hình một lần (bắt buộc, làm trên Supabase dashboard):**
1. Authentication → Providers → Google: đã bật sẵn cho web (dùng chung, không cần
   tạo OAuth client mới cho mobile).
2. Authentication → URL Configuration → **Redirect URLs**: thêm
   `linguacards://auth/callback`.

**Lưu ý:** OAuth cần native module mới → phải **build lại APK** (`eas build`), không
chạy được bằng bản Expo Go cũ. Deep link chỉ hoạt động trên dev build / bản standalone.
