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

**Cấu trúc một thẻ:** từ, phiên âm IPA (chung + tách **UK/US** khi có), audio **UK/US**, từ loại, nhiều nghĩa, nhiều ví dụ (kèm bản dịch), và **ghi chú cá nhân** của người dùng.

**Quy tắc tra từ:**
- Nếu từ đã từng được ai đó tra trước đây, hệ thống lấy lại kết quả đã lưu cho nhanh (không tra lại từ đầu).
- Phần nghĩa và ví dụ được **dịch tự động sang tiếng Việt**. Nếu dịch tự động không khả dụng, thẻ vẫn tạo được nhưng nghĩa giữ nguyên tiếng Anh để người dùng tự sửa.
- Nếu gõ vào **một cụm từ không có trong từ điển**, hệ thống vẫn cố dịch cả cụm để tạo được thẻ, thay vì báo lỗi trắng.
- Sau khi lưu, ô tạo thẻ **giữ nguyên** để người dùng gõ từ tiếp theo (nhập liên tục nhanh).

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
- Tùy chọn thêm: **giới hạn số thẻ** mỗi phiên và **xáo trộn** thứ tự.

**Bước học** — với mỗi thẻ, người dùng xem mặt trước (từ + phiên âm), lật thẻ để xem mặt
sau (nghĩa + ví dụ + ghi chú), nghe phát âm Anh hoặc Mỹ, rồi **tự đánh giá** mình nhớ tới
đâu bằng ba mức: **Chưa thuộc / Tạm nhớ / Đã thuộc**. Có thanh tiến độ cho biết đang ở thẻ
thứ mấy. *Bấm nút phát âm chỉ phát tiếng — không làm lật thẻ.*

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

---

## 10. Web và điện thoại đồng bộ ra sao

- Cả hai bản dùng **chung một tài khoản và một kho dữ liệu**. Tạo thẻ trên điện thoại
  thì mở web thấy ngay, và ngược lại — không cần thao tác đồng bộ thủ công.
- Tiến độ học, lịch ôn, trạng thái từng từ đều dùng chung.
- Hiện bản điện thoại **đã ngang bằng web ở phần học** (trạng thái, chế độ học, lịch ôn,
  thống kê), chống trùng từ khi thêm, và **hành động hàng loạt** (chọn nhiều thẻ để xóa /
  chuyển bộ / reset tiến độ). Bản điện thoại còn **thiếu**: đăng nhập Google, và các thao
  tác **sửa / xem chi tiết một thẻ đơn lẻ** (web đã có).

---

## 11. Chưa có (dự kiến làm sau)

- **Chuỗi ngày học liên tục (streak).**
- **Học nhiều ngôn ngữ** ngoài Anh → Việt.
- **Nhập/xuất dữ liệu** (CSV, Anki) và **chia sẻ bộ thẻ**.
- **Kiểu học khác:** gõ lại từ, trắc nghiệm.
- **Dùng offline** (PWA).
