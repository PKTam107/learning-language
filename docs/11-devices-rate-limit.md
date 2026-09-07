# 11 — Thiết bị đăng nhập & rate limit theo user/thiết bị

Hai tính năng dùng chung một mẩu dữ liệu: **id thiết bị** do client sinh và gửi
kèm mọi request.

- **Thiết bị đăng nhập** — tài khoản đang được đăng nhập ở những máy nào, máy nào
  hoạt động gần đây, và gỡ (đăng xuất từ xa) một máy lạ.
- **Rate limit** — hạn mức cho các route gọi dịch vụ ngoài, đếm theo **tài khoản**
  *và* theo **từng thiết bị**, cộng một trần theo **ngày**.

## 1. Id thiết bị

| | Web | Mobile |
| --- | --- | --- |
| Sinh | `crypto.randomUUID()` | `Crypto.randomUUID()` (expo-crypto) |
| Lưu | `localStorage["lc-device-id"]` | `AsyncStorage["lc-device-id"]` |
| Code | [`src/lib/device.ts`](../src/lib/device.ts) | [`mobile/src/lib/device.ts`](../mobile/src/lib/device.ts) |

Id đi kèm header `x-device-id` trong mọi lời gọi `/api/*` — web qua
[`src/lib/api.ts`](../src/lib/api.ts), mobile qua `apiFetch` trong
[`mobile/src/lib/api.ts`](../mobile/src/lib/api.ts).

Đây **không phải fingerprint**: xóa dữ liệu trình duyệt hoặc gỡ app là thành máy
mới. Đủ cho mục đích "nhận ra cùng một máy giữa các phiên", không theo dõi được
người dùng qua ứng dụng khác.

## 2. Ghi nhận thiết bị

```
client (web/mobile) ──POST /api/devices { deviceId, name, platform, appVersion }
                            │
                            ├─ getRequestContext(): xác thực cookie HOẶC Bearer,
                            │  trả về client Supabase mang danh tính user đó
                            │
                            └─ rpc touch_user_device(...)  [SECURITY DEFINER]
                                   auth.uid()              → user nào
                                   auth.jwt()->>'session_id' → phiên nào
                                   upsert user_devices (user_id, device_id)
```

Vì RPC lấy danh tính từ JWT chứ không dùng `service_role`, **một endpoint duy
nhất phục vụ cả web lẫn mobile** và không ai giả danh user khác được.

Nhịp ping: sau khi đăng nhập, rồi tối đa 1 giờ/lần
([`DevicePing`](../src/components/DevicePing.tsx) trên web,
`pingDevice()` gọi từ `AuthContext` trên mobile).

## 3. Xem & gỡ thiết bị

Cài đặt → **Thiết bị đăng nhập** (web:
[`DeviceList`](../src/components/DeviceList.tsx), mobile:
[`mobile/src/components/DeviceList.tsx`](../mobile/src/components/DeviceList.tsx)).

- `list_user_devices()` trả thêm `is_current` (chính máy đang xem) và `is_active`
  (phiên còn sống — join sang `auth.sessions`).
- `revoke_user_device(device_id)` **xóa dòng `auth.sessions`** của máy đó → refresh
  token thành vô hiệu, lần gia hạn kế tiếp máy đó bị đá ra (xem
  [09 — Thời hạn phiên](./09-auth-session.md) để biết nhịp gia hạn). Phiên hiện
  tại không bao giờ bị giết — tự đăng xuất thì dùng nút Đăng xuất.

> Gỡ thiết bị **không** đổi mật khẩu. Nếu nghi lộ mật khẩu thì gỡ xong hãy đổi,
> vì kẻ kia vẫn đăng nhập lại được bằng mật khẩu cũ.

## 4. Rate limit

Bộ đếm cửa sổ cố định trong Postgres (migration `0005`), tăng atomic bằng RPC
`consume_rate_limit` nên đúng cả khi chạy nhiều instance serverless. Bộ đếm khóa
theo `(user_id, bucket)`, mà `bucket` là text tự do — nên hạn mức theo thiết bị
chỉ là nhét device id vào tên bucket, **không phải đổi schema**:

| Bucket | Ý nghĩa |
| --- | --- |
| `lookup` | tổng của cả tài khoản trong 1 phút |
| `lookup:d:<device_id>` | riêng một thiết bị trong 1 phút |
| `lookup:day` | tổng của cả tài khoản trong 1 ngày |

Hạn mức hiện tại ([`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts) —
`standardRules(bucket, /phút, /phút/máy, /ngày)`):

| Route | Phút (tài khoản) | Phút (mỗi máy) | Ngày | Vì sao |
| --- | --- | --- | --- | --- |
| `/api/lookup` | 30 | 20 | 500 | tra từ → DictionaryAPI + dịch AI |
| `/api/enrich` | 60 | 40 | 1000 | backfill theo lô ≤10 từ → Datamuse |
| `/api/translate` | 20 | 15 | 300 | ≤20 chuỗi/lượt → tới 20 request ra provider dịch |
| `/api/devices` | 20 | — | — | chống spam ping |

> Provider dịch do `AI_PROVIDER` quyết định. Mặc định hiện tại là **MyMemory**
> (free, không cần key) — quota ~50.000 từ/ngày **tính chung cho cả app** theo
> `MYMEMORY_EMAIL`, và MyMemory dịch một chuỗi mỗi request nên một lượt gọi 20
> chuỗi là 20 request. Vì quota dùng chung, một người gọi nhiều là cả app hết
> dịch — đó là lý do `/api/translate` chặt tay hơn `/api/lookup`. Đổi sang
> OpenAI/Gemini (điền key) thì hạn mức còn là chuyện tiền.

Ba tầng bù nhau: hạn mức **máy** giữ cho một thiết bị bị lạm dụng không nuốt trọn
hạn mức tài khoản; hạn mức **ngày** chặn kiểu gọi đều tay 24/7 mà không lần nào
vượt ngưỡng phút.

Vượt hạn → **429** kèm `Retry-After` và `message` tiếng Việt; client hiện thẳng
`message` đó.

**Fail-open có chủ ý**: thiếu `SUPABASE_SERVICE_ROLE_KEY` hoặc RPC lỗi (vd chưa
chạy migration) thì request được cho qua. Chặn oan người dùng thật tệ hơn là để
lọt vài lượt.

Client không gửi `x-device-id` (trình duyệt chặn storage, client tự viết) vẫn bị
hạn mức tài khoản và hạn mức ngày — chỉ bỏ qua tầng theo máy.

### Dọn bộ đếm

Số dòng giờ là user × máy × route. `prune_rate_limit_counters()` (migration
`0010`) xóa dòng cũ hơn 2 ngày; hẹn giờ bằng pg_cron nếu muốn:

```sql
select cron.schedule('prune-rate-limit', '0 3 * * *',
                     $$select public.prune_rate_limit_counters()$$);
```

## 5. Đổi hạn mức

Sửa đúng một dòng ở đầu route, vd trong
[`src/app/api/lookup/route.ts`](../src/app/api/lookup/route.ts):

```ts
const LOOKUP_RULES = standardRules("lookup", 30, 20, 500);
```

Đổi tên bucket = mở bộ đếm mới (mọi người được reset). Muốn thêm một hạn mức lạ
(vd theo giờ) thì truyền thẳng mảng `RateRule` thay cho `standardRules`.
