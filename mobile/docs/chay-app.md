# Hướng dẫn chạy LinguaCards Mobile

Có 3 cách chạy, chọn theo nhu cầu:

| Cách | Dùng khi | Cần build? | Cần PC chạy Metro? |
|------|----------|:---------:|:------------------:|
| [1. Emulator Android Studio](#1-emulator-android-studio-wsl2) | Dev hằng ngày | Không | Có |
| [2. Điện thoại thật + Expo Go](#2-điện-thoại-thật--expo-go--tunnel) | Thử nhanh trên máy thật | Không | Có |
| [3. Build APK (EAS)](#3-build-apk-cài-điện-thoại-thật) | Cài app thật, chạy độc lập | Có (cloud) | Không |

> Yêu cầu chung: **Node ≥ 18.18**, đã `cd mobile && npm install`, và có file `mobile/.env`
> (xem [`.env.example`](../.env.example)).

---

## 1. Emulator Android Studio (WSL2)

Bối cảnh: project nằm trong **WSL2**, Android Studio + SDK nằm bên **Windows**.
Vì vậy cần "bắc cầu" để WSL gọi được `adb` của Windows và để emulator thấy Metro
chạy trong WSL.

### 1.1. Cài đặt một lần

**a) Wrapper `adb`** — cho terminal WSL gọi `adb.exe` của Windows.
Thay `PKTAM` bằng user Windows của bạn (kiểm tra: `ls /mnt/c/Users`):

```bash
mkdir -p ~/.local/bin
cat > ~/.local/bin/adb <<'EOF'
#!/bin/sh
exec "/mnt/c/Users/PKTAM/AppData/Local/Android/Sdk/platform-tools/adb.exe" "$@"
EOF
chmod +x ~/.local/bin/adb
```

**b) "SDK giả"** — để Expo tìm thấy adb qua `ANDROID_HOME`
(Expo ghép `$ANDROID_HOME/platform-tools/adb`):

```bash
mkdir -p ~/.android-sdk-wsl/platform-tools
cp ~/.local/bin/adb ~/.android-sdk-wsl/platform-tools/adb
chmod +x ~/.android-sdk-wsl/platform-tools/adb
```

**c) (Tùy chọn) Thêm vào `~/.bashrc`** để khỏi export mỗi lần:

```bash
export PATH="$HOME/.local/bin:$PATH"
export ANDROID_HOME="$HOME/.android-sdk-wsl"
```

### 1.2. Mỗi lần chạy

1. **Bật emulator** trong Android Studio → **Device Manager** → ▶ (hoặc tạo mới
   bằng *Create Device*). Emulator cần có **Play Store** (icon Play trong danh sách AVD).

2. **Cài Expo Go vào emulator (một lần duy nhất):** mở **Play Store** trong
   emulator → đăng nhập Google → tìm **"Expo Go"** → Install.
   > ⚠️ Đừng để Expo tự cài Expo Go bằng cách bấm `a` khi chưa có sẵn — `adb.exe`
   > (Windows) không đọc được đường dẫn file `/home/...` của WSL nên cài sẽ lỗi.

3. **Kiểm tra adb thấy emulator** + forward cổng:
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   adb devices                      # phải thấy: emulator-5554   device
   adb reverse tcp:8081 tcp:8081    # Metro
   ```
   > Tra từ (gọi web API) **không** dùng `adb reverse` mà đi qua `10.0.2.2` — xem
   > [mục "Tra từ"](#tra-từ-feature-5--chạy-web-song-song) bên dưới.

4. **Khởi động app:**
   ```bash
   cd mobile
   export ANDROID_HOME="$HOME/.android-sdk-wsl"
   export PATH="$HOME/.local/bin:$PATH"
   npx expo start
   ```
   Khi menu Metro hiện → **bấm `a`**. Expo Go mở app LinguaCards.

### 1.3. Phím tắt Metro
- `a` — mở trên Android (lần đầu mỗi phiên)
- `r` — reload (chỉ bấm **sau khi** app đã mở; bấm sớm sẽ báo *No apps connected*)
- `j` — mở React Native DevTools (cần Chrome/Edge)

---

## 2. Điện thoại thật + Expo Go (+ tunnel)

Vì WSL2 ở sau NAT, điện thoại khó với tới Metro qua LAN → dùng **tunnel**
(định tuyến qua server Expo, không phụ thuộc mạng).

1. Cài **Expo Go** từ CH Play / App Store trên điện thoại.
2. Trên PC:
   ```bash
   cd mobile
   npx expo start --tunnel        # lần đầu sẽ tự cài @expo/ngrok
   ```
3. Quét **QR** hiện ở terminal bằng app Expo Go (Android) / Camera (iOS).

> **Tra từ** trên điện thoại thật: đặt `EXPO_PUBLIC_API_BASE_URL` trong `mobile/.env`
> trỏ tới IP LAN máy chạy web (vd `http://192.168.1.x:3000`) thay vì `localhost`.

---

## 3. Build APK (cài điện thoại thật)

APK chạy độc lập, **không cần** Metro/PC. Build trên cloud Expo (~10–15 phút).

```bash
cd mobile

# 1. Đăng nhập (tạo tài khoản free tại expo.dev nếu chưa có)
npx eas-cli@latest login
npx eas-cli@latest whoami          # xác nhận đã login

# 2. Khởi tạo project (ghi projectId vào app.json) — chọn Yes
npx eas-cli@latest init

# 3. Tạo biến môi trường (repo public nên KHÔNG commit key — lưu trên cloud Expo)
npx eas-cli@latest env:create --environment preview \
  --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project>.supabase.co" --visibility plaintext
npx eas-cli@latest env:create --environment preview \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>" --visibility plaintext

# 4. Build APK (chọn Yes khi hỏi tạo Android Keystore)
npx eas-cli@latest build -p android --profile preview
```

Xong sẽ in **link tải `.apk`** + QR. Mở link trên điện thoại → tải → cài
(cho phép *Cài từ nguồn không xác định* nếu được hỏi).

Cấu hình build nằm trong [`eas.json`](../eas.json) (profile `preview` = APK).

> **Tra từ** trên APK chỉ chạy nếu `EXPO_PUBLIC_API_BASE_URL` trỏ tới web đã deploy
> (vd Vercel) hoặc IP LAN — `localhost` trên điện thoại không với tới PC.
> Đăng nhập / bộ thẻ / học / audio thì chạy bình thường (kết nối thẳng Supabase).

---

## Tra từ (Feature 5) — chạy web song song

Chức năng tra & thêm từ gọi API route của **web app**, nên cần web chạy:

```bash
# terminal khác, ở thư mục gốc repo:
npm run dev                        # web ở http://localhost:3000
```

- **Emulator** gọi web qua `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000` trong
  `mobile/.env` (`10.0.2.2` = alias trỏ về máy host từ trong emulator).
- ⚠️ **Bẫy WSL2 + IPv6 (đã từng gây `network request failed`):** `next dev` mặc định
  bind IPv6 (`::`), nhưng WSL2 chỉ "bắc cầu" port **IPv4** sang Windows. Hệ quả: emulator
  gọi `10.0.2.2:3000` bị *Connection refused* → app báo lỗi mạng, mà log web **không**
  thấy request nào. Vì vậy script `dev` (ở [`package.json`](../../package.json) gốc) đã
  đổi thành **`next dev -H 0.0.0.0`** để ép bind IPv4.
  Kiểm tra nhanh: `ss -4tln | grep 3000` **phải có** một dòng (nếu rỗng = vẫn IPv6-only).
- Test đường mạng không cần app (kỳ vọng `401 Unauthorized` = thông):
  ```bash
  adb shell '(printf "GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n"; sleep 5) \
    | toybox nc 10.0.2.2 3000' | head -1     # mong đợi: HTTP/1.1 200 OK
  ```
- Provider dịch mặc định `mymemory` (free, không cần key) → nghĩa VI vẫn ra.

> **Vì sao không dùng `adb reverse tcp:3000`?** Trong setup này `adb reverse` mở được
> kết nối TCP nhưng **không chuyển payload** (kết nối lên nhưng dữ liệu rớt), nên `10.0.2.2`
> + web bind IPv4 là cách chạy ổn định.

---

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân & cách xử lý |
|-------------|--------------------------|
| `No apps connected` khi bấm `r` | App chưa mở. Bấm `a` trước (hoặc mở Expo Go thủ công). |
| `Failed to resolve the Android SDK path` | Chưa `export ANDROID_HOME="$HOME/.android-sdk-wsl"`. |
| `adb: command not found` | Chưa `export PATH="$HOME/.local/bin:$PATH"` (wrapper ở mục 1.1a). |
| Bấm `a` báo lỗi cài Expo Go | Cài Expo Go qua Play Store trong emulator trước (mục 1.2 bước 2). |
| App trắng / không tải bundle | Chạy lại `adb reverse tcp:8081 tcp:8081`, rồi `r` để reload. |
| Tra từ báo `network request failed` (log web không thấy request) | Web bind IPv6-only → WSL2 không forward sang Windows. Đảm bảo script là `next dev -H 0.0.0.0`, restart `npm run dev`, kiểm tra `ss -4tln \| grep 3000` phải có dòng. Và `mobile/.env` = `http://10.0.2.2:3000`. |
| Tra từ báo lỗi mạng (lý do khác) | Chưa chạy `npm run dev` ở repo gốc. |
| `Not logged in` khi build | Chạy `npx eas-cli@latest login` trước các lệnh eas khác. |
