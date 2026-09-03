# Đặc tả tính năng — LinguaCards

Tài liệu mô tả **sản phẩm đang làm được gì và theo quy tắc nào**, viết cho người đọc
nghiệp vụ (không cần biết kỹ thuật). Chi tiết triển khai xem [07-current-state.md](./07-current-state.md).

---

## 1. Sản phẩm là gì

LinguaCards là ứng dụng học từ vựng bằng **thẻ ghi nhớ (flashcard) tự sinh**.
Người dùng gõ một từ tiếng Anh, hệ thống tự dựng sẵn một tấm thẻ đầy đủ: phiên âm,
từ loại, nghĩa tiếng Việt, ví dụ và phát âm giọng Anh–Mỹ. Sau đó người dùng học lại
các thẻ theo lịch được sắp xếp để nhớ lâu.

Phiên bản hiện tại chỉ hỗ trợ chiều **Anh → Việt**. Có hai phiên bản dùng chung một
tài khoản và một kho dữ liệu: **bản web** và **bản điện thoại**. Đăng nhập ở đâu cũng
thấy cùng bộ thẻ và cùng tiến độ học.

**Người dùng:** người tự học tiếng Anh, muốn tự tạo bộ từ vựng của riêng mình và ôn
lại theo lịch.

---

## 2. Đăng nhập & tài khoản

- Người dùng phải đăng nhập mới sử dụng được. Có hai cách: **đăng nhập bằng Google**
  (chỉ trên web) hoặc **bằng email và mật khẩu** (cả web lẫn điện thoại).
- Mỗi người chỉ nhìn thấy dữ liệu của chính mình; không ai xem được bộ thẻ của người khác.
- Trên điện thoại, phiên đăng nhập được ghi nhớ — mở lại app không phải đăng nhập lại.

---

## 3. Bộ thẻ (Deck)

Bộ thẻ là một nhóm từ vựng người dùng tự đặt tên (ví dụ "TOEIC 900").

- Người dùng **tạo, đổi tên/mô tả, và xóa** bộ thẻ.
- Danh sách bộ thẻ hiển thị cho mỗi bộ: **tổng số từ**, **tỷ lệ đã thuộc**, và **số từ cần ôn hôm nay**.
- **Quy tắc:** khi tạo bộ thẻ mới, hệ thống mặc định chiều học là Anh → Việt (chưa cho chọn ngôn ngữ khác).
- **Quy tắc:** xóa một bộ thẻ sẽ xóa toàn bộ thẻ bên trong nó. Thao tác xóa cần xác nhận.
  Cả bộ thẻ lẫn các thẻ bên trong vào **Thùng rác**, phục hồi được trong 30 ngày (mục 12).

---

## 4. Tạo thẻ bằng cách tra từ

Đây là tính năng lõi. Từ bất kỳ màn hình chính nào, người dùng bấm nút **"+"** để mở
ô tạo thẻ nhanh, rồi:

1. Chọn bộ thẻ muốn thêm vào.
2. Gõ một từ tiếng Anh và bấm tra.
3. Hệ thống tự điền: phiên âm, từ loại, nghĩa tiếng Việt, các định nghĩa và ví dụ (kèm bản dịch), phát âm Anh–Mỹ.
4. Người dùng xem lại, chỉnh sửa nếu muốn, rồi lưu vào bộ thẻ.

**Quy tắc thêm từ:**
- **Không cho trùng từ trong cùng một bộ thẻ.** Khi kiểm tra trùng, từ được chuẩn hóa trước (bỏ khoảng trắng đầu/cuối, gộp khoảng trắng giữa, không phân biệt hoa/thường). Nếu trùng, hệ thống báo và không lưu.
- **Cùng một từ vẫn được phép nằm ở nhiều bộ thẻ khác nhau.**

**Cấu trúc một thẻ:** từ, phiên âm IPA (chung + tách **UK/US** khi có), audio **UK/US**, từ loại, nhiều nghĩa, nhiều ví dụ (kèm bản dịch), **ghi chú cá nhân**, và các thông tin **làm giàu tự động**: cấp độ **CEFR** (A1–C2), **họ từ** (word family), **kết hợp từ** (collocations).

**Quy tắc tra từ:**
- Nếu từ đã từng được ai đó tra trước đây, hệ thống lấy lại kết quả đã lưu cho nhanh (không tra lại từ đầu).
- Phần nghĩa và ví dụ được **dịch tự động sang tiếng Việt**. Nếu dịch tự động không khả dụng, thẻ vẫn tạo được nhưng nghĩa giữ nguyên tiếng Anh để người dùng tự sửa.
- Nếu gõ vào **một cụm từ không có trong từ điển**, hệ thống vẫn cố dịch cả cụm để tạo được thẻ, thay vì báo lỗi trắng.
- Sau khi lưu, ô tạo thẻ **giữ nguyên** để người dùng gõ từ tiếp theo (nhập liên tục nhanh).
- **Giới hạn tần suất:** mỗi người tra tối đa **30 từ/phút** (chống lạm dụng dịch vụ dịch). Vượt mức sẽ được nhắc thử lại sau ít giây.
- **Làm giàu tự động:** khi tra một **từ đơn tiếng Anh mới**, hệ thống tự bổ sung cấp độ **CEFR**,
  **họ từ** và **collocations** rồi lưu kèm thẻ (xem mục dưới). Chạy nền, không có cũng không sao.
  Từ mới tự có; **thẻ cũ có thể bổ sung bằng nút "Làm giàu"** (xem mục dưới).

**Làm giàu thẻ (CEFR · Word Family · Collocations):**
- **CEFR (A1–C2):** tra theo danh sách CEFR-J miễn phí (offline). Hiện dưới dạng **badge màu** cạnh từ.
- **Họ từ (word family):** các dạng phái sinh — vd *happy → happiness, happily, happier, unhappy*.
  Lấy gần đúng từ nguồn miễn phí (Datamuse) nên **có thể sót hoặc lẫn từ không liên quan**.
- **Collocations:** cụm hay đi cùng — vd *make a decision, strong coffee* (nguồn Datamuse).
- **Bổ sung cho thẻ cũ:** nút **"Làm giàu N thẻ"** (ở mỗi bộ thẻ và trang chủ) làm giàu các thẻ
  tạo trước đây, có thanh tiến độ. Nút hiện **số thẻ còn thiếu** và **tự ẩn khi đã làm giàu hết** —
  vì từ tạo mới đã tự có sẵn, đây là thao tác chuyển đổi **một lần** cho backlog.

---

## 5. Quản lý thẻ trong bộ

Mở một bộ thẻ, người dùng thấy danh sách các từ và có thể:

- **Xem chi tiết** một thẻ (đầy đủ định nghĩa, ví dụ, phát âm).
- **Sửa** nội dung thẻ.
- **Chuyển** thẻ sang bộ thẻ khác.
- **Xóa** thẻ.
- **Tìm** theo từ hoặc nghĩa, và **lọc theo trạng thái học**.
- Mỗi thẻ hiển thị một **chấm màu** thể hiện mức độ thuộc (xem mục 7).

**Quy tắc xóa:** xóa thẻ (một hoặc hàng loạt) **không mất ngay** — thẻ được chuyển vào
**Thùng rác** và phục hồi được trong 30 ngày (xem mục 12).

**Hành động hàng loạt:** bật chế độ **Chọn** để tick nhiều thẻ (hoặc "Chọn tất cả"), rồi thực hiện một lần cho cả nhóm:
- **Xóa** các thẻ đã chọn.
- **Chuyển** sang bộ thẻ khác — thẻ nào trùng từ (đã có ở bộ đích) sẽ được bỏ qua và báo lại số lượng.
- **Reset tiến độ** các thẻ đã chọn về "chưa học".

---

## 6. Học & ôn tập

Một phiên học gồm ba bước: **chọn chế độ → học → xem tóm tắt**.

**Ba lối vào phiên học:**

| Lối vào | Tập thẻ | Mở từ đâu |
|---|---|---|
| **Một bộ thẻ** | thẻ trong bộ đó (còn chọn được chế độ bên dưới) | nút "Học ngay" ở mỗi bộ thẻ |
| **Ôn hôm nay** | thẻ đến hạn ôn lại của **mọi bộ thẻ** + từ mới trong hạn mức hôm nay (mục 8) | nút "Ôn ngay" ở đầu trang chủ |
| **Ôn từ hay quên** | tối đa **30 từ** bị đánh giá "Chưa thuộc" nhiều nhất | nút trong khối "Bạn hay quên" |

Hai lối sau **không có bước chọn chế độ** (tập thẻ đã là lựa chọn rồi) — chỉ còn chọn kiểu ôn,
số thẻ mỗi phiên và xáo trộn.

**Bước chọn chế độ** — người dùng chọn học theo cách nào:
- **Ôn hôm nay:** chỉ những từ đã đến hạn ôn (theo lịch nhớ). *Mặc định chọn sẵn nếu có từ tới hạn.*
- **Ôn tất cả:** toàn bộ thẻ trong bộ.
- **Chỉ từ chưa thuộc:** những từ chưa học và những từ đã bị đánh giá "chưa thuộc".
- **Kiểu ôn:** chọn cách kiểm tra. Năm kiểu, chia theo **chiều** kiểm tra:
  - *Nhận diện* (thấy từ Anh → nhớ nghĩa): **Lật thẻ**, **Trắc nghiệm** (chọn nghĩa đúng).
  - *Sản sinh* (thấy nghĩa Việt → nhớ ra từ Anh — khó hơn, và mới là thứ cần khi nói/viết):
    **Việt → Anh** (chọn từ đúng) và **Gõ từ** (gõ lại từ tiếng Anh).
  - **Nghe** (nghe rồi gõ lại).

  *Hai kiểu trắc nghiệm cần ít nhất 4 từ để dựng đáp án nhiễu.*

  **Quy tắc dựng đáp án nhiễu:** nhiễu lấy từ các thẻ khác trong cùng phiên, ưu tiên **cùng
  từ loại** cho khó hơn. Thẻ nào **cùng đề bài** với thẻ đang hỏi thì bị loại — nếu không sẽ
  ra câu có hai đáp án đúng (vd đề "quyết định" mà cho chọn cả *decision* lẫn *decide*).
  Không còn nhiễu hợp lệ thì hệ thống hiện thẳng đáp án để tự đánh giá, không dựng câu hỏng.
- Tùy chọn thêm: **giới hạn số thẻ** mỗi phiên và **xáo trộn** thứ tự.

**Bước học** — tùy kiểu ôn:
- **Lật thẻ:** xem mặt trước (từ + phiên âm), lật thẻ để xem mặt sau (nghĩa + ví dụ + ghi chú),
  nghe phát âm Anh hoặc Mỹ, rồi **tự đánh giá** bằng ba mức: **Chưa thuộc / Tạm nhớ / Đã thuộc**.
- **Trắc nghiệm / Gõ từ / Nghe:** hệ thống **tự chấm** đúng/sai (gõ cho phép sai 1 ký tự) rồi hiện
  đáp án. Kết quả được quy về đánh giá: **đúng → "Tạm nhớ", sai → "Chưa thuộc"**.
- Có thanh tiến độ cho biết đang ở thẻ thứ mấy. *Bấm nút phát âm chỉ phát tiếng — không làm lật thẻ.*
- **Hoàn tác:** bấm nhầm nút đánh giá thì bấm **"Hoàn tác"** (trên web còn có phím tắt **Z**)
  để quay lại đúng thẻ vừa rồi. Hoàn tác trả lịch ôn của thẻ về nguyên trạng **và** xóa lượt
  ôn đó khỏi nhật ký, nên chuỗi ngày học / heatmap không đếm lượt đã hủy. Dùng được cả ở màn
  tóm tắt cuối phiên (hoàn tác thẻ cuối cùng). Có ở cả web và điện thoại.
- Có thể bật **tự phát âm khi lật thẻ / khi lộ đáp án** trong Cài đặt (xem mục 11).

**Bước tóm tắt** — kết thúc phiên, hệ thống tổng kết số từ ở mỗi mức đánh giá trong
phiên vừa rồi, và cho phép học tiếp hoặc quay về. Có **hiệu ứng pháo giấy ăn mừng**
(cả web lẫn điện thoại) — chỉ bắn khi bạn thực sự có ôn, và tự tắt nếu bạn đã bật
"giảm chuyển động" trong cài đặt hệ điều hành.

**Quy tắc sắp xếp:** khi không xáo trộn, thẻ được ưu tiên theo thứ tự — *chưa thuộc*
trước, rồi *chưa học*, rồi *tạm nhớ*, cuối cùng *đã thuộc* — để người dùng gặp từ khó trước.

---

## 7. Trạng thái học của mỗi từ

Mỗi từ luôn ở một trong bốn trạng thái, dùng thống nhất ở mọi màn hình:

| Trạng thái | Ý nghĩa | Màu |
|---|---|---|
| **Chưa học** | Chưa ôn lần nào | Xám |
| **Chưa thuộc** | Lần gần nhất đánh giá "khó" | Đỏ |
| **Đang thuộc** | Đánh giá "tạm nhớ" | Vàng |
| **Đã thuộc** | Đánh giá "đã thuộc" | Xanh |

Trạng thái này quyết định màu chấm ở danh sách, tỷ lệ "đã thuộc" của bộ thẻ, và bộ lọc.

---

## 8. Lịch ôn tập (nhớ theo khoảng cách)

Sau mỗi lần đánh giá, hệ thống tự tính **thời điểm cần ôn lại** cho từ đó. Nguyên tắc: từ
càng nhớ tốt thì lần ôn sau càng để lâu; nhớ kém thì ôn lại sớm.

Một từ đi qua ba giai đoạn:

| Giai đoạn | Khi nào | Cách hẹn lịch |
|---|---|---|
| **Đang học** | từ mới, chưa qua các bước học | *Chưa thuộc* → gặp lại sau **10 phút**; *Tạm nhớ* → **ngày mai**, rồi lần "Tạm nhớ" kế tiếp là tốt nghiệp với khoảng **3 ngày**; *Đã thuộc* → tốt nghiệp thẳng với **5 ngày** |
| **Ôn giãn cách** | đã tốt nghiệp | *Tạm nhớ* → khoảng cũ **× độ dễ**; *Đã thuộc* → khoảng cũ **× độ dễ × 1,3** và tăng độ dễ |
| **Học lại** | vừa quên một từ đã tốt nghiệp | khoảng bị **rút còn một nửa**, độ dễ giảm, và phải học lại một bước ngắn (10 phút) trước khi quay về ôn giãn cách |

**Các quy tắc chốt:**
- **Khoảng ôn được lưu thẳng vào thẻ**, không suy ra từ ngày hẹn cũ — nên **ôn sớm hay ôn
  muộn cũng không làm lệch lịch** những lần sau.
- **Độ dễ** (ease) nằm trong khoảng 1,3–3,0. Quên thì giảm 0,2; "Đã thuộc" thì tăng 0,15.
- **Nhiễu ±5%:** khoảng ôn từ 4 ngày trở lên được xê dịch ngẫu nhiên trong ±5%, để cả lô từ
  nhập cùng một ngày không tới hạn cùng một ngày mãi mãi (lịch ôn không bị dồn cục).
- **Trần 1 năm:** không hẹn ôn xa hơn 365 ngày.
- Thẻ mới **không nhảy thẳng** vào khoảng nhiều ngày nữa: phải qua bước học đã.

**Quy tắc "cần ôn hôm nay":** hàng đợi hôm nay gồm hai phần:
1. **Thẻ tới hạn ôn lại** — đã học và đã qua thời điểm hẹn. Phần này **không bị giới hạn**:
   đây là việc đã hẹn, cắt bớt chỉ khiến nó dồn sang mai.
2. **Từ mới** — chưa ôn lần nào, lấy tối đa **N từ/ngày** theo cài đặt (mặc định **15**,
   chọn được 5/10/15/20/30/50 hoặc *không giới hạn* — xem mục 11).

**Vì sao có hạn mức từ mới:** trước đây mọi từ chưa học đều bị tính là "cần ôn hôm nay", nên
nhập 200 từ từ Excel là trang chủ báo "200 từ cần ôn hôm nay" — con số không ai học nổi, lại
làm thử thách trong ngày và lịch ôn sai theo. Từ mới chưa tới lượt được **giữ lại chờ ngày
sau**, và app nói rõ "còn N từ mới đang chờ tới lượt".

**Hạn mức tính chung cho cả tài khoản trong một ngày.** Con số "cần ôn" hiện ở mỗi bộ thẻ là
*"học bộ này ngay bây giờ thì được bao nhiêu thẻ"* — nên học bộ nào trước thì bộ đó dùng hạn
mức trước, và tổng các bộ có thể lớn hơn con số ở trang chủ.

## 9. Trang tổng quan

Trang chính xếp theo thứ tự **việc cần làm trước, thống kê sau**:

1. **Việc hôm nay** — nếu còn thẻ đến hạn thì hiện ngay một khối "N từ cần ôn hôm nay" kèm
   nút **"Ôn ngay"** mở phiên gộp mọi bộ thẻ (xem mục 6). Khối này nói rõ N gồm bao nhiêu
   **thẻ ôn lại** và bao nhiêu **từ mới**. Ôn hết rồi thì đổi thành lời chúc — và nếu còn từ
   mới đang chờ vì hết hạn mức (mục 8) thì nói rõ còn bao nhiêu từ chờ tới lượt.
2. **Chuỗi ngày học** (streak).
3. **Bộ thẻ** — các con số toàn tài khoản (**số bộ thẻ**, **tổng số từ**, **số từ đã thuộc**,
   **số từ cần ôn hôm nay**) kèm thanh tỷ lệ trạng thái, rồi danh sách bộ thẻ.
4. Các khối tham khảo: **Thử thách hôm nay**, **Bạn hay quên**.

Ngoài ra còn có:
- **Chuỗi ngày học (streak):** số ngày liên tiếp có ôn tập, số lượt ôn hôm nay, và biểu đồ
  7 ngày gần nhất. Streak được tính từ nhật ký ôn — mọi kiểu ôn (lật thẻ, trắc nghiệm, gõ,
  nghe) đều được tính. Chuỗi vẫn còn "sống" hết ngày hôm nay nếu hôm nay chưa ôn.
- **Banner nhắc học:** nếu bật nhắc học (mục 11) và đã qua giờ nhắc mà hôm nay chưa ôn từ nào,
  trang chủ hiện lời nhắc dẫn tới danh sách bộ thẻ.
- **Thử thách hôm nay:** 3–4 nhiệm vụ trong ngày kèm thanh tiến độ (xem mục 10).
- **Bạn hay quên:** danh sách các từ bị đánh giá **"Chưa thuộc"** nhiều nhất (từ nhật ký ôn),
  kèm số lần quên. Có **nút mở phiên ôn đúng những từ này** (tối đa 30 từ) và trang riêng
  **/weak** liệt kê đầy đủ.

---

## 10. Tiến độ học: thử thách, huy hiệu, lịch học

Trang **Tiến độ** (web: `/progress`; điện thoại: nút "Xem tiến độ học" ở màn chính hoặc
biểu tượng 📈 trên thanh tiêu đề) gom mọi thứ liên quan tới "mình đã học được bao nhiêu".
Toàn bộ số liệu lấy từ dữ liệu đã có (thẻ, tiến độ từng từ, nhật ký ôn) — không phải khai báo tay.

**Thử thách hôm nay** (hiện ở **trang chủ**, cả web và điện thoại)

Mỗi ngày hệ thống tự đặt ra 3–4 nhiệm vụ nhỏ, kèm thanh tiến độ và dấu ✓ khi xong:
- **Giữ chuỗi ngày học:** ôn ít nhất 1 lượt trong hôm nay.
- **Ôn N lượt:** N lấy theo **số thẻ tới hạn hôm nay**, giới hạn trong khoảng 5–20 lượt và
  không vượt số thẻ đang có (kho thẻ nhỏ thì mục tiêu nhỏ theo).
- **Thêm từ mới:** 3 từ, cứ 3 ngày một lần thành 5 từ.
- **Một nhiệm vụ luân phiên** đổi theo ngày: chốt vài từ lên mức *"Đã thuộc"* / ôn đủ số **từ
  khác nhau** / **dọn hết hàng đợi** thẻ tới hạn.

**Quy tắc:** nhiệm vụ được sinh **theo ngày, không ngẫu nhiên** — cùng một ngày thì web và
điện thoại hiện đúng cùng bộ nhiệm vụ. Thử thách **tự đổi lúc 0h** (giờ máy của bạn) và
không lưu vào cơ sở dữ liệu: tiến độ được đo lại từ nhật ký ôn + số thẻ tạo trong ngày.
Nếu chưa có thẻ nào, thử thách chỉ còn một nhiệm vụ: *"Thêm từ đầu tiên"*.

**Huy hiệu (achievement)**

Có **22 mốc** chia 5 nhóm, mốc nào đạt thì "mở" (hiện màu + dấu ✓), chưa đạt thì xám kèm
thanh tiến độ và số còn thiếu. Trang cũng nêu rõ **mốc sắp đạt nhất**.

| Nhóm | Xét theo | Các mốc |
|---|---|---|
| Kho từ vựng | tổng số thẻ đã tạo | 10 · 50 · 100 · 250 · 500 |
| Từ đã thuộc | số thẻ đang ở mức *Đã thuộc* | 10 · 50 · 100 · 250 |
| Chuỗi ngày học | **chuỗi dài nhất** từng đạt | 3 · 7 · 14 · 30 · 100 |
| Lượt ôn | tổng số lượt ôn | 50 · 200 · 500 · 1000 |
| Ngày có học | số ngày khác nhau có ôn tập | 7 · 30 · 100 · 365 |

**Quy tắc:** nhóm *Chuỗi ngày học* xét theo **chuỗi dài nhất** nên huy hiệu **không bị mất**
khi chuỗi hiện tại đứt. Nhóm *Từ đã thuộc* thì lên/xuống theo trạng thái thật của từng từ.

**Heatmap học tập (lịch 1 năm)**

Lưới ô vuông kiểu GitHub: mỗi cột là một tuần (Thứ 2 → Chủ nhật) trong **52 tuần gần nhất**,
ô càng đậm là ngày đó ôn càng nhiều (5 mức, chia theo ngày ôn nhiều nhất trong kỳ). Trên web,
trỏ chuột vào một ô để xem *"số lượt ôn · ngày/tháng/năm"*. Kèm tổng số lượt ôn và số ngày có học.

**Lịch ôn tập (calendar)**

Lịch theo tháng cho biết **ngày nào có nhiều thẻ tới hạn**, xem trước được các tháng sau
để biết lịch có bị dồn. Mỗi ô hiện ngày + số thẻ, tô màu đậm dần theo số lượng (từ 1–3 thẻ
đến trên 25 thẻ). Chạm/bấm một ngày để xem **những từ nào** tới hạn ngày đó (tối đa 12 từ,
bấm vào từ để mở bộ thẻ chứa nó).

**Quy tắc:** thẻ **chưa học** và thẻ **quá hạn** được gom vào ô **hôm nay** (đó là việc cần
làm ngay). Lịch được tính lại sau mỗi lần bạn đánh giá một thẻ, vì ngày hẹn ôn thay đổi theo
đánh giá (xem mục 8).

Ngoài ra trang có 4 ô số nhanh: **chuỗi hiện tại** (kèm chuỗi dài nhất), **tổng lượt ôn**
(kèm số ngày có học), **số thẻ cần ôn ngay** (kèm 7 ngày tới), và **số huy hiệu đã mở**.

---

## 11. Cài đặt & nhắc học

Trang **Cài đặt** cho phép mỗi người tùy chỉnh:
- **Giao diện:** chọn **Sáng**, **Tối**, hoặc **Theo máy** (tự đổi theo cài đặt sáng/tối
  của hệ điều hành — đây là mặc định). **Có ở cả hai bản.** Trên web đổi được ngay trên thanh
  điều hướng bằng nút hình mặt trời/mặt trăng, hoặc trong trang Cài đặt; trên điện thoại thì
  ở trang Cài đặt. Riêng web còn áp dụng lựa chọn **trước khi trang hiện ra** nên không bị
  nháy nền trắng lúc tải.
- **Tự phát âm khi lật thẻ / lộ đáp án:** bật/tắt việc tự đọc từ tiếng Anh khi học (mặc định bật).
- **Từ mới mỗi ngày:** hạn mức từ chưa học được đưa vào phiên "Ôn hôm nay" (mặc định **15**;
  chọn 5/10/15/20/30/50 hoặc *không giới hạn*). Xem mục 8. **Có ở cả hai bản.**
- **Nhắc học hằng ngày:** bật/tắt và chọn **giờ nhắc**. Khi bật, đến giờ mà hôm nay chưa ôn thì
  hệ thống hiển thị **lời nhắc ngay trong app** (trên trang chủ).

**Khác biệt web / điện thoại:**
- **Điện thoại** dùng **thông báo hệ thống** (local notification) — hiện cả khi app đang đóng.
- **Web** dùng **banner nhắc trong app** — hiện khi mở trang chủ (trình duyệt không tự bật thông
  báo khi tab đã đóng nếu không có hạ tầng push riêng).

**Nơi lưu cài đặt:** tự phát âm, từ mới mỗi ngày, bật/tắt và giờ nhắc học được lưu **theo tài
khoản** — đăng nhập ở máy khác vẫn giữ nguyên. Máy tự nhớ một bản để mở app không phải chờ
mạng; khi có mạng thì bản trên tài khoản là bản đúng. Riêng **giao diện sáng/tối** cố tình để
theo từng thiết bị (điện thoại nền tối trong khi máy tính nền sáng là chuyện bình thường).

---

## 12. Thùng rác (phục hồi thẻ đã xóa)

Xóa thẻ, xóa nhiều thẻ cùng lúc, hay xóa cả một bộ thẻ đều **không mất ngay**: bản ghi được
chuyển vào **Thùng rác** và giữ **30 ngày**.

- Mở ở **Cài đặt → Thùng rác** (bản web). Danh sách hiện từng mục kèm: đó là thẻ hay bộ thẻ,
  thuộc bộ nào, và **còn bao nhiêu ngày** trước khi bị dọn hẳn.
- **Phục hồi:** thẻ về đúng bộ thẻ cũ, **kèm tiến độ học và lịch ôn** trước lúc xóa. Phục hồi
  một bộ thẻ thì mọi thẻ bên trong về theo.
- **Xóa hẳn** từng mục, hoặc **Dọn sạch** cả thùng rác. Thao tác này không hoàn tác được.
- Mục quá 30 ngày được **tự dọn** ngay khi mở trang Thùng rác.

**Quy tắc:**
- Thẻ chỉ phục hồi được khi **bộ thẻ gốc còn tồn tại** — nếu bộ thẻ cũng đã bị xóa thì phải
  phục hồi bộ thẻ trước.
- Nếu trong lúc thẻ nằm ở thùng rác bạn đã **tạo lại đúng từ đó** trong bộ, thẻ cũ sẽ được bỏ
  qua để không tạo bản trùng (phục hồi cả bộ thẻ thì app báo số từ bị bỏ qua).
- **Nhật ký ôn** (streak, heatmap) không mất khi xóa thẻ, nhưng thẻ được phục hồi **không nối
  lại** được với các lượt ôn cũ — nên "Bạn hay quên" không tính lại lịch sử quên của thẻ đó.
- Trên **điện thoại**, xóa cũng chuyển vào thùng rác như web; còn **xem/phục hồi** thì hiện
  làm trên bản web.

---

## 13. Web và điện thoại đồng bộ ra sao

- Cả hai bản dùng **chung một tài khoản và một kho dữ liệu**. Tạo thẻ trên điện thoại
  thì mở web thấy ngay, và ngược lại — không cần thao tác đồng bộ thủ công.
- Tiến độ học, lịch ôn, trạng thái từng từ, và **nhật ký ôn (streak)** đều dùng chung.
- Hai bản **đã ngang bằng ở phần học**: trạng thái, các chế độ học, **kiểu ôn đa dạng**
  (lật thẻ / trắc nghiệm / gõ / nghe), lịch ôn, **streak**, tự phát âm, chống trùng từ, và
  **hành động hàng loạt** (chọn nhiều thẻ để xóa / chuyển bộ / reset tiến độ).
- Cũng ngang bằng ở **làm giàu thẻ** (badge CEFR, họ từ, collocations), **"Bạn hay quên"**,
  và nút **"Làm giàu N thẻ"** cho thẻ cũ. *(Bản mobile hiện chưa có sửa/xem chi tiết chỉnh sửa
  một thẻ như web, nhưng phần hiển thị thông tin làm giàu thì có.)*
- Ngang bằng cả ở **Tiến độ học** (mục 10): thử thách hôm nay, huy hiệu, heatmap 1 năm và lịch
  ôn tập — cùng cách tính nên hai bên hiện cùng số liệu.
- Ngang bằng cả ở **giao diện Sáng/Tối** (mục 11) và **hiệu ứng ăn mừng cuối phiên học** (mục 6).
- Ngang bằng cả ở **lịch ôn mới** (mục 8), **hạn mức từ mới mỗi ngày**, **hoàn tác lượt đánh
  giá** (mục 6) và **đưa thẻ đã xóa vào thùng rác** (mục 12).
- **Cài đặt** (tự phát âm, từ mới/ngày, nhắc học) nay đi theo **tài khoản** nên hai bản dùng
  chung một cấu hình; riêng giao diện sáng/tối vẫn theo từng thiết bị.
- Hai điểm khác còn lại: **cách nhắc học** (điện thoại dùng thông báo hệ thống, web dùng
  banner trong app — mục 11) và **quản lý thùng rác** (xem/phục hồi hiện chỉ có trên web).

---

## 14. Cài web ra màn hình chính

Bản web là một **PWA**: mở trên điện thoại hoặc Chrome/Edge trên máy tính, trình duyệt sẽ
mời **"Cài đặt LinguaCards"** (Safari trên iOS: nút Chia sẻ → *Thêm vào Màn hình chính*).
Sau khi cài, app chạy **toàn màn hình, không có thanh địa chỉ**, có icon riêng, và mở thẳng
vào trang chủ. Giữ icon còn có lối tắt nhanh tới **Bộ thẻ** và **Tiến độ học**.

**Quy tắc offline:** app cần mạng để tải thẻ và lưu tiến độ. Khi mất mạng, app hiện một
**trang báo ngoại tuyến** kèm nút thử lại thay vì màn hình lỗi trắng của trình duyệt.
Giao diện (mã nguồn, phông, icon) được lưu sẵn ở máy nên mở lại rất nhanh, nhưng **nội dung
bài học thì không lưu cache** — mỗi trang chứa dữ liệu riêng của tài khoản đang đăng nhập,
lưu lại sẽ rò sang người khác nếu dùng chung máy.

---

## 15. Chưa có (dự kiến làm sau)

- **Học nhiều ngôn ngữ** ngoài Anh → Việt.
- **Nhập Anki** (`.apkg`) và **chia sẻ bộ thẻ** (đã có nhập Excel + xuất CSV/Excel/JSON).
- **Học offline thật sự** — hiện web đã **cài được ra màn hình chính** (xem mục 14) nhưng
  vẫn cần mạng để tải thẻ và lưu tiến độ; mất mạng chỉ hiện trang báo ngoại tuyến.
- **Nhắc học khi đóng tab trên web** (cần hạ tầng push).
- **Phục hồi thùng rác trên điện thoại** (hiện chỉ xóa vào thùng rác được, xem/phục hồi làm trên web).
