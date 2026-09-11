# 13 — Phân tích & đề xuất tính năng (ràng buộc: $0)

Tài liệu **phân tích nghiệp vụ (BA)**: sản phẩm đang thiếu gì, tính năng nào đáng làm
tiếp, và làm được **hoàn toàn miễn phí** (không thêm một đồng chi phí vận hành nào).
Viết cho người đọc nghiệp vụ; chi tiết kỹ thuật hiện trạng xem
[07-current-state.md](./07-current-state.md), tính năng đang có xem [08-features.md](./08-features.md).

---

## 1. Ràng buộc "free" nghĩa là gì

Mọi đề xuất dưới đây phải nằm trong hạ tầng và nguồn dữ liệu **đang dùng hoặc tương đương**:

| Thành phần | Gói | Trần thực tế (cần kiểm chứng lại khi triển khai) |
|---|---|---|
| Supabase | Free | ~500 MB Postgres, ~1 GB storage, ~50k MAU, **project ngủ sau ~7 ngày không hoạt động** |
| Vercel | Hobby | ~100 GB băng thông, cron rất hạn chế (cỡ 1 lần/ngày), **không dùng cho mục đích thương mại** |
| DictionaryAPI.dev | Free, không key | Không cam kết SLA, có thể bị chặn khi gọi dồn |
| Datamuse | Free, không key | ~100k request/ngày |
| MyMemory (dịch) | Free | ~5k từ/ngày ẩn danh, ~50k nếu khai email |
| Gemini / OpenAI | Free tier / trả tiền | Gemini có free tier; OpenAI **không** — hiện đang để tùy chọn |
| CEFR-J, Tatoeba, NGSL | Dữ liệu mở (CC) | Tải một lần, bundle offline hoặc đổ vào DB |

**Ba luật chơi rút ra:**
1. **Ưu tiên dữ liệu tải-một-lần** (bundle/DB) hơn là gọi API mỗi lần dùng — vừa nhanh, vừa không đụng quota, vừa chạy được offline.
2. **Mọi thứ gọi mạng phải best-effort**: hỏng thì bỏ qua, không chặn việc học. (Nguyên tắc này code đã theo ở `enrich.ts`, cần giữ.)
3. **Cẩn thận với cron và job nền** — đây là chỗ gói free bóp chặt nhất, và cũng là chỗ tính năng "web push" phụ thuộc.

---

## 2. Khoảng trống theo hành trình người học

Sản phẩm đã rất đầy đủ ở khúc **giữa** (học & ôn: SRS thật, 5 kiểu ôn, hoàn tác, thùng rác,
huy hiệu, heatmap). Hai đầu phễu mới là chỗ hụt.

| Giai đoạn | Hiện trạng | Khoảng trống |
|---|---|---|
| **1. Nạp từ vào kho** | Gõ **từng từ một** qua nút "+", hoặc import Excel | Người học gặp từ **trong lúc đọc/xem**, không phải lúc mở app. Mỗi từ tốn 1 vòng gõ–chờ–lưu. **Đây là nút thắt lớn nhất.** |
| **2. Chất lượng thẻ** | DictionaryAPI + dịch máy (MyMemory mặc định) + CEFR/word family/collocations | Nghĩa và ví dụ dịch máy **hay ngô nghê**; ví dụ lấy từ từ điển Anh–Anh thường khô và ít ngữ cảnh đời thường |
| **3. Học** | 5 kiểu ôn, chọn **một kiểu cho cả phiên** | Thiếu **cloze** (điền chỗ trống), thiếu **trộn kiểu ôn**, thiếu xử lý **thẻ khó kinh niên** (leech) — dù `isLeech()` đã viết sẵn nhưng **chưa dùng ở đâu** |
| **4. Giữ thói quen** | Streak, thử thách, huy hiệu; nhắc học = banner trong app (web) | Web **không nhắc được khi đóng tab** — đúng lúc cần nhắc nhất thì im lặng. Streak đứt một ngày là mất sạch động lực |
| **5. Tin cậy / sở hữu** | Thùng rác 30 ngày, export CSV/Excel/JSON | Mất mạng là **không học được**. Không có bản sao lưu định kỳ |

---

## 3. Danh mục đề xuất

Mỗi mục ghi: **vấn đề → giải pháp → quy tắc nghiệp vụ → vì sao free**.

### Nhóm A — Nạp từ (gỡ nút thắt lớn nhất)

**A1. Tra hàng loạt từ một đoạn văn ("mining")** — *giá trị cao, công vừa*

- **Vấn đề:** đọc một bài báo gặp 15 từ mới → hiện phải mở app 15 lần, gõ 15 lượt.
- **Giải pháp:** dán cả đoạn văn → app tách từ, **bỏ từ đã có trong kho**, bỏ stopword,
  xếp ứng viên theo cấp độ CEFR (đã có dữ liệu offline) → người dùng tick chọn → tra và tạo hàng loạt.
- **Quy tắc:**
  - Chuẩn hóa và **gộp về dạng gốc** (running → run) trước khi đối chiếu kho, nếu không sẽ đề xuất trùng.
  - Mặc định **bỏ tick** những từ A1–A2 (người học đã biết) và những từ chỉ xuất hiện 1 lần trong bài nếu là tên riêng.
  - Tra theo lô **có tiết lưu**, tôn trọng đúng hạn mức 30 lượt/phút đang có; hiện thanh tiến độ và **cho hủy giữa chừng**, thẻ đã tạo thì giữ lại.
  - Không thu về được thẻ nào cũng không báo lỗi đỏ — liệt kê từ nào hỏng để tạo tay.
- **Free:** tách từ + CEFR chạy **offline**; phần tra dùng lại đúng `/api/lookup` sẵn có.

**A2. Chia sẻ từ ngoài app vào LinguaCards ("share target")** — *giá trị cao, công thấp — nên làm trước*

- **Vấn đề:** khoảnh khắc gặp từ mới xảy ra ở Chrome/Kindle/YouTube, không phải trong app.
- **Giải pháp:** khai báo `share_target` trong manifest PWA + `intent-filter` bên Android →
  bôi đen từ ở bất kỳ app nào → **Chia sẻ → LinguaCards** → mở thẳng ô tạo thẻ đã điền sẵn từ đó.
- **Quy tắc:** nếu văn bản chia sẻ **dài hơn một cụm từ**, chuyển thẳng sang màn hình mining (A1) thay vì cố tra cả đoạn.
- **Free:** thuần khai báo manifest + một route mới. Đây là **tỷ lệ giá trị/công tốt nhất trong toàn bộ tài liệu này.**

**A3. Bộ thẻ khởi đầu có sẵn** — *giá trị vừa, công thấp*

- **Vấn đề:** tài khoản mới là kho rỗng — chưa có gì để học thì mọi tính năng học đều vô dụng.
- **Giải pháp:** vài bộ dựng sẵn từ **danh sách tần suất mở** (NGSL ~2.8k từ thông dụng, NAWL học thuật),
  cắt theo cấp CEFR: "600 từ nền A1–A2", "1000 từ B1", "Từ học thuật".
- **Quy tắc:** nhập bộ khởi đầu là **sao chép vào kho riêng** của người dùng (sửa/xóa được), không phải bộ dùng chung chỉ đọc.
  Chống trùng theo đúng luật hiện có; báo số từ bị bỏ qua.
- **Free:** bundle JSON tĩnh; **chú ý giấy phép** — dùng NGSL/NAWL/CEFR-J (mở), **không** chép danh sách Oxford 3000.

### Nhóm B — Chất lượng thẻ

**B1. Ví dụ song ngữ thật thay cho dịch máy** — *giá trị cao, công vừa*

- **Vấn đề:** MyMemory dịch ví dụ ra tiếng Việt **thường sai sắc thái**; người dùng phải sửa tay, mà sửa tay thì mất luôn lý do dùng app.
- **Giải pháp:** dựng **kho câu song ngữ** từ Tatoeba (CC BY) — chọn cặp câu Anh–Việt **do người thật dịch**,
  lọc câu 5–15 từ, đổ vào một bảng có index theo từ. Khi tạo thẻ: ưu tiên câu có sẵn trong kho, hết mới rơi về dịch máy.
- **Quy tắc:** mỗi thẻ lấy tối đa 2 câu; **ghi nguồn** theo yêu cầu giấy phép CC BY; câu không có bản dịch VI thì không lấy.
- **Free:** dump Tatoeba tải một lần; lọc còn cỡ vài chục nghìn cặp là vừa gói Supabase free. **Rủi ro cần canh: dung lượng DB 500 MB.**

**B2. Đổi provider dịch mặc định sang Gemini free tier** — *giá trị cao, công rất thấp*

- **Vấn đề:** mặc định hiện là MyMemory vì "free không cần key", nhưng chất lượng nghĩa/ví dụ kém rõ rệt so với LLM.
- **Giải pháp:** khuyến nghị `AI_PROVIDER=gemini` với key free tier; **MyMemory tự động làm phương án dự phòng** khi hết quota/lỗi.
- **Quy tắc:** phải **xâu chuỗi dự phòng** (Gemini → MyMemory → giữ tiếng Anh), không được để hết quota là thẻ tạo hỏng.
- **Free:** code provider **đã có sẵn cả hai**; việc còn lại là chuỗi fallback + tài liệu. Gần như chỉ tốn công cấu hình.

**B3. Ghi nhớ bằng hình ảnh & mẹo nhớ** — *giá trị vừa, công vừa*

- Thêm trường **mnemonic** (mẹo nhớ tự viết) và **một ảnh minh họa** chọn từ nguồn ảnh mở (Openverse/Wikimedia).
- **Quy tắc:** chỉ **lưu URL ảnh**, không tải file về (tránh đụng Storage free); ảnh hỏng thì ẩn, không vỡ thẻ.
- Ảnh + mẹo nhớ là đòn bẩy mạnh cho **từ trừu tượng** — đúng nhóm từ mà "Bạn hay quên" đang gom lại.

### Nhóm C — Học sâu hơn

**C1. Kiểu ôn "điền chỗ trống" (cloze)** — *giá trị cao, công thấp*

- Khoét từ đang học khỏi chính **câu ví dụ đã có trong thẻ** → người học điền lại.
- **Vì sao đáng:** đây là kiểu ôn gần với **dùng từ thật** nhất (đúng ngữ pháp, đúng ngữ cảnh),
  mà **không cần thêm một byte dữ liệu nào** — tận dụng ví dụ đã lưu.
- **Quy tắc:** thẻ **không có ví dụ thì loại khỏi phiên cloze** (nói rõ còn bao nhiêu thẻ hợp lệ, giống cách MCQ đang xử lý khi thiếu nhiễu);
  chấm cho phép sai 1 ký tự như kiểu "Gõ từ"; chấp nhận biến thể chia động từ/số nhiều.

**C2. Trộn kiểu ôn trong một phiên (chế độ "Tự động")** — *giá trị cao, công thấp*

- **Vấn đề:** hiện chọn một kiểu cho cả phiên; ôn 30 thẻ cùng một kiểu vừa nhàm vừa dễ **nhớ vẹt theo hình thức câu hỏi**.
- **Giải pháp:** thêm lựa chọn **"Tự động"** — hệ thống chọn kiểu theo trạng thái từng thẻ:
  *chưa học* → Lật thẻ; *chưa thuộc* → Trắc nghiệm (nhẹ, gây dựng lại); *đang thuộc* → Việt→Anh hoặc Cloze; *đã thuộc* → Gõ từ / Nghe.
- **Quy tắc:** thẻ thiếu dữ liệu cho kiểu được chọn thì **tự hạ xuống kiểu khả thi**, không bỏ thẻ.

**C3. Xử lý thẻ khó kinh niên (leech)** — *giá trị vừa, công rất thấp*

- **Đã có sẵn `isLeech()` và cột `lapses` từ migration 0009, nhưng chưa nơi nào dùng.** Chỉ còn phần hiển thị và hành động.
- **Giải pháp:** quên ≥ 6 lần → gắn cờ, gợi ý ba lối thoát: **tạm treo** (rút khỏi hàng đợi, không mất thẻ),
  **sửa thẻ** (nghĩa quá dài/mơ hồ là nguyên nhân thường gặp), hoặc **thêm mẹo nhớ** (B3).
- **Quy tắc:** treo là **có thể bỏ treo**; thẻ bị treo không tính vào "cần ôn hôm nay" nhưng vẫn nằm trong bộ thẻ và vẫn đếm ở tổng số từ.

**C4. Luyện phát âm** — *giá trị vừa, công vừa, rủi ro tương thích*

- Dùng nhận dạng giọng nói sẵn có của trình duyệt/hệ điều hành: người học đọc từ → so khớp kết quả nhận dạng.
- **Quy tắc:** **tính năng phụ, không chấm điểm SRS** — nhận dạng sai lệch nhiều, không được để nó hạ trạng thái thẻ.
  Thiết bị không hỗ trợ thì **ẩn hẳn**, không hiện nút hỏng.

### Nhóm D — Giữ thói quen

**D1. Nhắc học thật trên web (web push)** — *giá trị cao, công cao*

- **Vấn đề tồn đọng lâu nhất:** web chỉ nhắc được khi người dùng **đã mở app** — tức là nhắc đúng người không cần nhắc.
- **Giải pháp:** Web Push chuẩn (VAPID) + service worker đã có; lưu đăng ký đẩy vào một bảng; một job định kỳ quét ai đã qua giờ nhắc mà chưa ôn.
- **Rủi ro free lớn nhất trong tài liệu này:** cron trên gói Hobby **quá thưa** để tôn trọng "giờ nhắc" của từng người.
  → **Khuyến nghị:** chạy job bằng **pg_cron trên Supabase** (chạy dày hơn), hoặc chấp nhận **gom vào 1–2 khung giờ cố định** thay vì giờ tùy chọn.
  Đây là đánh đổi cần chốt **trước khi** làm, không phải sau.
- **Quy tắc:** hết hạn đăng ký/người dùng chặn quyền → **xóa bản ghi**, không thử lại vô hạn. Đã ôn hôm nay thì không nhắc.

**D2. "Ngày nghỉ" giữ chuỗi (streak freeze)** — *giá trị vừa, công thấp*

- **Vấn đề:** chuỗi 40 ngày đứt vì một ngày bận là **thời điểm bỏ app** kinh điển.
- **Giải pháp:** mỗi 7 ngày học tích được 1 "ngày nghỉ", tối đa giữ 2; nghỉ đúng một ngày thì chuỗi được nối lại.
- **Quy tắc:** ngày nghỉ **tự động dùng**, có báo lại ("Đã dùng 1 ngày nghỉ để giữ chuỗi 40 ngày").
  **Không** tính ngày nghỉ vào heatmap và **không** tính vào huy hiệu "ngày có học" — đó là số liệu thật, không được bơm.

**D3. Phiên siêu ngắn "5 thẻ / 60 giây"** — *giá trị vừa, công thấp*

- Một lối vào ở trang chủ + lối tắt trên icon màn hình chính: lấy đúng 5 thẻ đến hạn gấp nhất.
- **Vì sao:** rào cản thật không phải 20 phút học, mà là **quyết định bắt đầu**. Việc nhỏ tới mức không từ chối được sẽ cứu chuỗi ngày.

### Nhóm E — Tin cậy & sở hữu dữ liệu

**E1. Học offline thật** — *giá trị vừa, công cao*

- Cache thẻ của bộ đang học vào máy + **hàng đợi ghi tạm** để lượt ôn khi mất mạng được gửi lên khi có mạng lại.
- **Quy tắc bắt buộc:** **xóa sạch cache khi đăng xuất** — lý do docs đã nêu ở mục PWA (máy dùng chung sẽ rò dữ liệu) vẫn nguyên giá trị;
  lượt ôn offline vẫn giữ **đúng dấu thời gian lúc ôn**, nếu không streak và heatmap sẽ sai.

**E2. Tự nhắc sao lưu** — *giá trị thấp–vừa, công rất thấp*

- Mỗi 30 ngày, nhắc một lần: "Kho từ của bạn đã có 640 từ — tải bản sao lưu?" (dùng lại export JSON đã có).
- Gói free **có thể ngủ hoặc mất project**; đây là bảo hiểm rẻ nhất có thể mua bằng $0.

**E3. Chia sẻ bộ thẻ bằng link** — *giá trị vừa, công vừa*

- Link công khai chỉ-đọc + nút "sao chép về kho của tôi".
- **Quy tắc:** chia sẻ **chỉ nội dung thẻ**, tuyệt đối không kèm tiến độ học; **tắt chia sẻ được** và link cũ chết ngay khi tắt.

### Nhóm F — Hiểu chính việc học của mình

**F1. Báo cáo "tỷ lệ nhớ thật"** — *giá trị vừa, công thấp*

- Từ nhật ký ôn đã có, tính **% thẻ nhớ được khi tới hạn**. Khỏe mạnh là ~85–90%.
- **Hành động kèm theo, không chỉ là con số:** thấp hơn → gợi ý **giảm hạn mức từ mới/ngày**;
  cao hơn nhiều → gợi ý tăng, vì đang ôn dày hơn mức cần (tốn thời gian vô ích).
- Đây là thứ biến trang Tiến độ từ **trưng bày thành tích** thành **công cụ điều chỉnh**.

**F2. Cân nhắc đổi lịch ôn sang FSRS** — *giá trị vừa, công cao, để sau*

- SM-2 rút gọn hiện tại **đang chạy tốt và đã có 24 test bảo vệ**. FSRS hiện đại hơn (dự đoán theo xác suất quên) và **miễn phí**,
  nhưng là **đại phẫu phần lõi**. Chỉ nên làm khi F1 cho thấy tỷ lệ nhớ lệch xa mục tiêu — **có dữ liệu rồi mới đổi.**

---

## 4. Ưu tiên

> **Trạng thái:** đợt 1 (A2, C1, C2, B2, C3) **đã triển khai** — chi tiết as-built ở
> [07-current-state.md](./07-current-state.md#đợt-1-của-13-de-xuat-tinh-nangmd--migration-0012).
> Việc kế tiếp là đợt 2, mở đầu bằng **A1 — mining từ đoạn văn** (share target hiện đã tách
> đoạn thành chip chọn từng từ, A1 là bản đầy đủ: lọc từ đã có, xếp theo CEFR, tạo hàng loạt).



Xếp theo **giá trị cho người học / công bỏ ra**, tất cả đều $0.

| Đợt | Mã | Tính năng | Giá trị | Công | Ghi chú |
|---|---|---|---|---|---|
| **1** ✅ | A2 | Chia sẻ từ vào app | Cao | Rất thấp | Đòn bẩy tốt nhất; chạm đúng khoảnh khắc gặp từ |
| **1** ✅ | C1 | Cloze (điền chỗ trống) | Cao | Thấp | Không cần dữ liệu mới |
| **1** ✅ | C2 | Trộn kiểu ôn ("Tự động") | Cao | Thấp | Dùng lại toàn bộ kiểu ôn đã có |
| **1** ✅ | B2 | Gemini free tier + chuỗi dự phòng | Cao | Rất thấp | Code provider đã sẵn |
| **1** ✅ | C3 | Xử lý leech | Vừa | Rất thấp | `isLeech()` đã viết, chỉ thiếu UI |
| **2** | A1 | Mining từ đoạn văn | Cao | Vừa | Nút thắt nạp từ; cần canh rate limit |
| **2** | D2 | Ngày nghỉ giữ chuỗi | Vừa | Thấp | Chống bỏ cuộc |
| **2** | D3 | Phiên 5 thẻ / 60 giây | Vừa | Thấp | |
| **2** | F1 | Tỷ lệ nhớ thật + gợi ý chỉnh hạn mức | Vừa | Thấp | Chỉ đọc dữ liệu sẵn có |
| **2** | A3 | Bộ thẻ khởi đầu | Vừa | Thấp | Chú ý giấy phép danh sách từ |
| **3** | B1 | Ví dụ song ngữ Tatoeba | Cao | Vừa | Canh dung lượng DB free |
| **3** | D1 | Web push | Cao | Cao | **Chốt cách chạy job trước khi làm** |
| **3** | B3 | Ảnh + mẹo nhớ | Vừa | Vừa | |
| **3** | E3 | Chia sẻ bộ thẻ | Vừa | Vừa | |
| **3** | E1 | Offline thật | Vừa | Cao | Rủi ro rò dữ liệu nếu làm ẩu |
| **Sau** | C4 | Luyện phát âm | Vừa | Vừa | Tương thích thiết bị lệch nhau |
| **Sau** | F2 | FSRS | Vừa | Cao | Chỉ khi F1 chỉ ra vấn đề |

**Đợt 1 gộp lại là một chủ đề rõ ràng:** *"vào nhanh hơn, học đa dạng hơn"* — và toàn bộ đợt 1
**không cần thêm bảng mới, không thêm nguồn dữ liệu mới, không đụng trần quota nào**.

---

## 5. Rủi ro cần theo dõi

| Rủi ro | Ảnh hưởng | Cách phòng |
|---|---|---|
| Project Supabase **ngủ khi vắng người dùng** | App chết lâm sàng, người dùng tưởng hỏng | E2 (sao lưu) + màn hình báo lỗi tử tế thay vì trắng |
| **Dung lượng DB free** (B1 kho câu, `dictionary_cache` phình theo thời gian) | Chạm trần 500 MB | Lọc kho câu trước khi nạp; đặt **hạn dọn `dictionary_cache`** theo tuổi |
| **Quota dịch** (MyMemory / Gemini free) | Thẻ tạo ra thiếu nghĩa tiếng Việt | Chuỗi dự phòng B2 + cache đã có |
| **Cron gói free quá thưa** cho D1 | Nhắc học sai giờ → phản tác dụng | Chốt phương án job trước; hoặc công khai rằng chỉ có khung giờ cố định |
| **Giấy phép dữ liệu** (A3, B1) | Rủi ro pháp lý dù là app cá nhân | Chỉ dùng nguồn CC/mở, ghi nguồn đầy đủ |
| Vercel Hobby **cấm dùng thương mại** | Nếu sau này thu phí là phải đổi gói | Biết trước, không phải xử lý bây giờ |

---

## 6. Đề nghị **không** làm bây giờ

- **Đa ngôn ngữ (P3 trong roadmap):** DB đã sẵn sàng nên nghe rất "đáng làm", nhưng người dùng chính là
  **người Việt học tiếng Anh**. Chi phí thật nằm ở *dictionary provider cho từng ngôn ngữ nguồn* + i18n giao diện —
  công lớn, phục vụ nhóm người dùng hiện **chưa tồn tại**. Để sau A1/A2.
- **Nhập Anki (.apkg):** định dạng nặng (SQLite trong zip, kèm media, nhiều phiên bản schema),
  trong khi **import Excel đã che gần hết nhu cầu thực tế**.
- **Marketplace bộ thẻ:** cần kiểm duyệt nội dung, chống spam, xử lý báo cáo vi phạm — đó là **vận hành**, không phải tính năng.
  E3 (chia sẻ bằng link) lấy được 80% giá trị với 5% công.
