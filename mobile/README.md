# LinguaCards Mobile 📱

App di động (Expo / React Native) cho LinguaCards. Dùng **chung Supabase** với
web app — cùng database, cùng RLS, cùng tài khoản.

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
npm start          # mở Expo Dev Tools, quét QR bằng app Expo Go
npm run android    # mở thẳng trên Android emulator
npm run ios        # mở thẳng trên iOS simulator (cần macOS)
```

> Yêu cầu **Node ≥ 18.18**. Nếu dùng máy thật, cài app **Expo Go** rồi quét mã QR.

## Cấu trúc

```
app/                  # expo-router (mỗi file = 1 route)
  _layout.tsx         # root: AuthProvider + Stack
  index.tsx           # cổng điều hướng (chờ session → (app) hoặc (auth))
  (auth)/             # nhóm route chưa đăng nhập
    _layout.tsx       # đã login thì redirect vào (app)
    login.tsx         # đăng nhập / đăng ký bằng email
  (app)/              # nhóm route đã đăng nhập (có gác session)
    _layout.tsx       # chưa login thì redirect ra login
    index.tsx         # trang chủ (placeholder — Bộ thẻ sẽ thêm sau)
src/
  lib/supabase.ts     # Supabase client (AsyncStorage + url polyfill)
  lib/theme.ts        # màu / spacing đồng bộ với web
  contexts/AuthContext.tsx
  components/ui/       # Button, Input
  types.ts            # domain types (đồng bộ web src/types)
```

## Lệnh hữu ích

| Lệnh | Tác dụng |
|------|----------|
| `npm start` | Dev server (Metro) + QR |
| `npm run android` / `ios` | Mở trên emulator/simulator |
| `npm run typecheck` | Kiểm tra TypeScript |

## Tiến độ

- [x] **Feature 1** — Skeleton + auth email (login/signup/signout) + điều hướng có gác session
- [ ] Feature 2 — Danh sách bộ thẻ + CRUD
- [ ] Feature 3 — Card trong bộ thẻ
- [ ] Feature 4 — Study mode (lật thẻ + đánh giá)
- [ ] Feature 5 — Lookup / tạo thẻ (cần API route nhận Bearer token)
- [ ] Feature 6 — Google OAuth, dashboard thống kê
