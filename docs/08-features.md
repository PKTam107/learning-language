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

**Hành động hàng loạt:** bật chế độ **Chọn** để tick nhiều thẻ (hoặc "Chọn tất cả"), rồi thực hiện một lần cho cả nhóm:
- **Xóa** các thẻ đã chọn.
- **Chuyển** sang bộ thẻ khác — thẻ nào trùng từ (đã có ở bộ đích) sẽ được bỏ qua và báo lại số lượng.
- **Reset tiến độ** các thẻ đã chọn về "chưa học".

---

## 6. Học & ôn tập

Một phiên học gồm ba bước: **chọn chế độ → học → xem tóm tắt**.

**Bước chọn chế độ** — người dùng chọn học theo cách nào:
- **Ôn hôm nay:** chỉ những từ đã đến hạn ôn (theo lịch nhớ). *Mặc định chọn sẵn nếu có từ tới hạn.*
- **Ôn tất cả:** toàn bộ thẻ trong bộ.
- **Chỉ từ chưa thuộc:** những từ chưa học và những từ đã bị đánh giá "chưa thuộc".
- **Kiểu ôn:** chọn cách kiểm tra — **Lật thẻ**, **Trắc nghiệm** (chọn nghĩa đúng), **Gõ từ**
  (gõ lại từ tiếng Anh), hoặc **Nghe** (nghe rồi gõ lại). *Trắc nghiệm cần bộ thẻ có ít nhất 4 từ.*
- Tùy chọn thêm: **giới hạn số thẻ** mỗi phiên và **xáo trộn** thứ tự.

**Bước học** — tùy kiểu ôn:
- **Lật thẻ:** xem mặt trước (từ + phiên âm), lật thẻ để xem mặt sau (nghĩa + ví dụ + ghi chú),
  nghe phát âm Anh hoặc Mỹ, rồi **tự đánh giá** bằng ba mức: **Chưa thuộc / Tạm nhớ / Đã thuộc**.
- **Trắc nghiệm / Gõ từ / Nghe:** hệ thống **tự chấm** đúng/sai (gõ cho phép sai 1 ký tự) rồi hiện
  đáp án. Kết quả được quy về đánh giá: **đúng → "Tạm nhớ", sai → "Chưa thuộc"**.
- Có thanh tiến độ cho biết đang ở thẻ thứ mấy. *Bấm nút phát âm chỉ phát tiếng — không làm lật thẻ.*
- Có thể bật **tự phát âm khi lật thẻ / khi lộ đáp án** trong Cài đặt (xem mục 11).

**Bước tóm tắt** — kết thúc phiên, hệ thống tổng kết số từ ở mỗi mức đánh giá trong
phiên vừa rồi, và cho phép học tiếp hoặc quay về.

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

Sau mỗi lần đánh giá, hệ thống tự tính **ngày cần ôn lại** cho từ đó. Nguyên tắc: từ
càng nhớ tốt thì lần ôn sau càng để lâu; nhớ kém thì ôn lại sớm.

- Đánh giá **Chưa thuộc:** hẹn ôn lại **ngày hôm sau**, và giảm độ "dễ" của từ (sau này giãn cách chậm hơn).
- Đánh giá **Tạm nhớ:** hẹn ôn lại xa hơn lần trước một mức vừa phải.
- Đánh giá **Đã thuộc:** hẹn ôn lại **xa hơn hẳn**, và tăng độ "dễ" (những lần sau càng giãn cách lâu).

**Quy tắc "cần ôn hôm nay":** một từ được coi là tới hạn nếu **chưa từng học** hoặc
**đã qua ngày hẹn ôn**. Con số "cần ôn" hiển thị ở bộ thẻ và ở trang tổng quan đếm theo quy tắc này.

---

## 9. Trang tổng quan

Trang chính hiển thị các con số toàn tài khoản: **số bộ thẻ**, **tổng số từ**, **số từ
đã thuộc**, và **số từ cần ôn hôm nay**, kèm một thanh thể hiện tỷ lệ các trạng thái.

Ngoài ra còn có:
- **Chuỗi ngày học (streak):** số ngày liên tiếp có ôn tập, số lượt ôn hôm nay, và biểu đồ
  7 ngày gần nhất. Streak được tính từ nhật ký ôn — mọi kiểu ôn (lật thẻ, trắc nghiệm, gõ,
  nghe) đều được tính. Chuỗi vẫn còn "sống" hết ngày hôm nay nếu hôm nay chưa ôn.
- **Banner nhắc học:** nếu bật nhắc học (mục 11) và đã qua giờ nhắc mà hôm nay chưa ôn từ nào,
  trang chủ hiện lời nhắc dẫn tới danh sách bộ thẻ.
- **Thử thách hôm nay:** 3–4 nhiệm vụ trong ngày kèm thanh tiến độ (xem mục 10).
- **Bạn hay quên:** danh sách các từ bị đánh giá **"Chưa thuộc"** nhiều nhất (từ nhật ký ôn),
  kèm số lần quên — để ưu tiên ôn lại. Có trang riêng **/weak** liệt kê đầy đủ.

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
- **Giao diện (web):** chọn **Sáng**, **Tối**, hoặc **Theo máy** (tự đổi theo cài đặt sáng/tối
  của hệ điều hành — đây là mặc định). Đổi được ngay trên thanh điều hướng bằng nút hình
  mặt trời/mặt trăng, hoặc trong trang Cài đặt. Lựa chọn được nhớ lại và áp dụng **trước khi
  trang hiện ra**, nên không bị nháy nền trắng lúc tải. *(Bản điện thoại hiện chỉ có nền sáng.)*
- **Tự phát âm khi lật thẻ / lộ đáp án:** bật/tắt việc tự đọc từ tiếng Anh khi học (mặc định bật).
- **Nhắc học hằng ngày:** bật/tắt và chọn **giờ nhắc**. Khi bật, đến giờ mà hôm nay chưa ôn thì
  hệ thống hiển thị **lời nhắc ngay trong app** (trên trang chủ).

**Khác biệt web / điện thoại:**
- **Điện thoại** dùng **thông báo hệ thống** (local notification) — hiện cả khi app đang đóng.
- **Web** dùng **banner nhắc trong app** — hiện khi mở trang chủ (trình duyệt không tự bật thông
  báo khi tab đã đóng nếu không có hạ tầng push riêng).

Cài đặt được lưu **trên từng thiết bị** (không đồng bộ qua tài khoản).

---

## 12. Web và điện thoại đồng bộ ra sao

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
- Điểm khác duy nhất còn lại là **cách nhắc học** (xem mục 11): điện thoại dùng thông báo hệ
  thống, web dùng banner trong app. Riêng **cài đặt** (tự phát âm, nhắc học) lưu theo từng
  thiết bị nên không đồng bộ qua tài khoản.

---

## 13. Cài web ra màn hình chính

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

## 14. Chưa có (dự kiến làm sau)

- **Học nhiều ngôn ngữ** ngoài Anh → Việt.
- **Nhập Anki** (`.apkg`) và **chia sẻ bộ thẻ** (đã có nhập Excel + xuất CSV/Excel/JSON).
- **Học offline thật sự** — hiện web đã **cài được ra màn hình chính** (xem mục 14) nhưng
  vẫn cần mạng để tải thẻ và lưu tiến độ; mất mạng chỉ hiện trang báo ngoại tuyến.
- **Đồng bộ cài đặt qua tài khoản** (hiện lưu theo thiết bị) và **nhắc học khi đóng tab trên web**
  (cần hạ tầng push).
