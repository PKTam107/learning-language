# LinguaCards 🎴

Web-app học ngôn ngữ qua **flashcard tự sinh**. Gõ một từ tiếng Anh → hệ thống tự
tra phiên âm, từ loại, nghĩa (dịch sang tiếng Việt bằng AI), ví dụ và audio US/UK.
MVP: **English → Vietnamese**, kiến trúc DB đã sẵn sàng cho đa ngôn ngữ.

## Tech stack

- **Next.js 14 (App Router) + TypeScript** — frontend + API route handlers
- **Tailwind CSS** — UI responsive (mobile-first), có **dark mode** (Sáng / Tối / Theo máy)
- **PWA** — cài được ra màn hình chính, có trang dự phòng khi mất mạng
- **Supabase** — Postgres + Auth (Google OAuth) + RLS
- **DictionaryAPI.dev** — phiên âm / audio / nghĩa tiếng Anh / ví dụ
- **Gemini (free tier) / OpenAI / MyMemory** — dịch nghĩa & ví dụ sang tiếng Việt,
  có **chuỗi dự phòng**: provider chính hết quota thì tự rơi về MyMemory (free, không key)

## Tài liệu

Xem thư mục [`docs/`](./docs):
- [01 — Product Spec](./docs/01-product-spec.md)
- [02 — Architecture](./docs/02-architecture.md)
- [03 — Database Schema](./docs/03-database-schema.md)
- [04 — API Integration](./docs/04-api-integration.md)
- [05 — Roadmap](./docs/05-roadmap.md)
- [06 — Mobile App](./docs/06-mobile.md)
- [07 — Current State & Plan](./docs/07-current-state.md)
- [08 — Tóm tắt tính năng hiện tại](./docs/08-features.md)
- [09 — Thời hạn phiên đăng nhập](./docs/09-auth-session.md)
- [10 — Sơ đồ luồng (Mermaid)](./docs/10-flows.md)
- [11 — Thiết bị đăng nhập & rate limit](./docs/11-devices-rate-limit.md)
- [12 — Bảo mật & quyền riêng tư](./docs/12-bao-mat.md)
- [13 — Phân tích & đề xuất tính năng (free)](./docs/13-de-xuat-tinh-nang.md)

## Bắt đầu

### 1. Cài dependencies
```bash
npm install
```

### 2. Tạo Supabase project
1. Vào https://supabase.com → New Project.
2. Mở **SQL Editor** → chạy lần lượt các file trong [`supabase/migrations/`](./supabase/migrations)
   **theo đúng thứ tự số** (`0001_init.sql` → `0014_daily_heartbeat.sql`): dán nội dung từng file → **Run**.
3. Bật **Google OAuth**: Dashboard → Authentication → Providers → Google
   (tạo OAuth Client ID/Secret ở [Google Cloud Console](https://console.cloud.google.com/),
   thêm redirect URL: `https://<project>.supabase.co/auth/v1/callback`).
4. Authentication → URL Configuration → thêm `http://localhost:3000/auth/callback` vào Redirect URLs.

### 3. Cấu hình môi trường
```bash
cp .env.example .env.local
```
Điền:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Settings → API).
- `AI_PROVIDER` — để trống là tự dò theo key có sẵn (khuyến nghị `gemini`: dòng Flash có
  free tier, lấy key ở [aistudio.google.com/apikey](https://aistudio.google.com/apikey);
  hạn mức free theo phút chặt hơn rate limit của app nên **dự phòng là thành phần chịu tải**).
  *(Không có key nào vẫn chạy: tự dùng MyMemory — free, không cần key. MyMemory cũng là
  provider dự phòng khi provider chính lỗi/hết quota, đổi bằng `AI_FALLBACK`.)*

### 4. Job nền giữ project khỏi ngủ *(khuyến nghị, miễn phí)*

Supabase Free **tạm dừng project sau ~7 ngày không có hoạt động** — nghỉ học một tuần là mở app
lên thấy hỏng. [`.github/workflows/supabase-keepalive.yml`](./.github/workflows/supabase-keepalive.yml)
cập nhật một dòng `system_heartbeat` mỗi ngày lúc **09:17 giờ Việt Nam** và dọn `dictionary_cache` nguội (>90 ngày kể từ lần tra cuối).

Chỉ cần khai hai secret ở **Settings → Secrets and variables → Actions**:

| Secret | Lấy ở đâu |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → **service_role** (không phải anon) |

Chạy migration `0014_daily_heartbeat.sql` trước khi bật job. Job chỉ cập nhật dòng `id = daily`,
không sửa dữ liệu học và không tạo thêm dòng mỗi ngày. Xem thời gian chạy gần nhất ở
`system_heartbeat.last_seen_at`. Có thể chạy script thủ công với hai biến môi trường trên:

```bash
bash scripts/supabase-keepalive.sh
```

Đây là hoạt động database định kỳ, không phải bảo đảm Supabase sẽ không pause project.

Chạy thử ngay: tab **Actions** → *Giữ Supabase sống & dọn dẹp* → **Run workflow**.
Hai bước dọn dẹp cần migration `0013`; chưa chạy thì chúng chỉ cảnh báo, không làm job đỏ.

> GitHub tự tắt workflow theo lịch ở repo **60 ngày không có commit nào** — bỏ hoang lâu thì
> phải vào bật lại bằng tay.

### 5. Chạy dev
```bash
npm run dev
```
Mở http://localhost:3000

## Mobile app 📱

Có app di động (**Expo / React Native**) dùng **chung Supabase và chính các route
handler** của web app — web + mobile là hai client của cùng một backend. Xem
[docs/06-mobile.md](./docs/06-mobile.md) (tầng hệ thống) và
[`mobile/README.md`](./mobile/README.md) (setup, chạy).

### Build lại link APK để cài app

Build APK chạy trên cloud Expo (~10–15 phút), xong sẽ in **link tải `.apk` + QR**.
Project đã cấu hình sẵn (`projectId`, env trên cloud, keystore), nên chỉ cần:

```bash
cd mobile
npx eas-cli@latest build -p android --profile preview
```

Mở link trên điện thoại → tải → cài (cho phép *Cài từ nguồn không xác định* nếu được hỏi).

Muốn **lấy lại link build cũ** (không build lại): `npx eas-cli@latest build:list -p android --limit 5`.
Chi tiết (đăng nhập, tạo env, keystore, tra từ): xem [`mobile/docs/chay-app.md §3`](./mobile/docs/chay-app.md#3-build-apk-cài-điện-thoại-thật).

## Luồng sử dụng

1. Đăng nhập (Google hoặc email).
2. Tạo bộ thẻ (vd "TOEIC 900").
3. Bấm nút **+** góc dưới phải → gõ từ → Enter → sửa nếu cần → **Lưu**.
4. Bấm **Học ngay** → chọn kiểu ôn (để **Tự động** thì mỗi thẻ một kiểu, khó dần theo mức
   thuộc) → lật thẻ: chạm, **kéo/vuốt ngang** (thẻ xoay bám theo tay) hoặc phím Space →
   đánh giá **Chưa thuộc / Tạm nhớ / Đã thuộc** (phím 1/2/3).

Còn một lối vào nhanh hơn: bôi đen một từ ở Chrome/app khác → **Chia sẻ → LinguaCards** →
thẻ được tra sẵn, chỉ bấm Lưu. Chạy được với **bản web đã cài ra màn hình chính** và với
**app Android** (cần APK build từ 2026-09 trở đi).

## Lệnh hữu ích

| Lệnh | Tác dụng |
|------|----------|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production |
| `npm run start` | Chạy bản build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run test` | Chạy unit test (Vitest) — lịch ôn & hàng đợi ôn |
| `node scripts/generate-icons.mjs` | Sinh lại bộ icon PWA (chỉ khi đổi nhận diện) |

> Icon đã được commit sẵn trong `public/` và `src/app/apple-icon.png` nên build bình thường
> không cần chạy lệnh cuối.

## Cấu trúc thư mục

Xem [docs/02-architecture.md §3](./docs/02-architecture.md).

## Định hướng tiếp theo

Xem [Roadmap](./docs/05-roadmap.md): mở khóa đa ngôn ngữ, dark mode cho bản mobile,
học offline thật sự, import Anki.

### Học từ bằng hình ảnh (web)

- Chạy migration `supabase/migrations/0015_card_images.sql` trong Supabase SQL Editor.
- Ảnh được tìm từ Wikimedia Commons, miễn phí và không cần API key.
  Tìm cả ảnh bitmap và sơ đồ SVG; sơ đồ được hiển thị bằng ảnh thu nhỏ bitmap do Commons tạo.
- Khi thêm hoặc sửa từ: chọn nghĩa, bấm **Tìm ảnh**, chọn một trong bốn ảnh gợi ý.
  Có thể sửa từ khóa tiếng Anh để tìm đúng nghĩa (ví dụ `river bank`). Ảnh là tùy chọn.
- Khi ôn ở chế độ lật thẻ: bật **Nhìn ảnh đoán từ** để giấu chữ ở mặt trước.
  Thẻ không có ảnh vẫn hiện từ như thường. Mặt sau hiển thị ảnh, từ, nghĩa và ví dụ.
- App lưu URL ảnh cùng nguồn/tác giả/giấy phép trong thẻ, không upload hay tạo ảnh bằng AI.
  Ảnh cần Internet để tải; tìm kiếm được cache 24 giờ để giảm lượt gọi Wikimedia Commons.
  Nếu nguồn ảnh gặp lỗi, vẫn có thể lưu và học thẻ không ảnh.
- Tính năng chọn/ôn ảnh hiện dành cho web; ứng dụng mobile chưa có giao diện ảnh.
