---
title: "Kiểm tra hằng ngày của người vận hành"
description: "Thiết lập danh sách kiểm tra an toàn cho người vận hành, gán cho thiết bị, in liên kết QR và xem lại sổ theo dõi hằng ngày phục vụ kiểm toán."
lastReviewed: 2026-07-06
personas: ["owner", "admin"]
---

**Dành cho:** Chủ sở hữu tổ chức, Quản trị viên  
**Xem xét lần cuối:** 2026-07-06

Chủ sở hữu và quản trị viên của tổ chức thiết lập **Kiểm tra hằng ngày của người vận hành** tại **Vận hành → Kiểm tra hằng ngày** trong bảng điều khiển ZNTEQR. Người vận hành hoàn thành các danh sách kiểm tra được gán thông qua một **liên kết QR công khai riêng** — không cần đăng nhập ZNTEQR.

## Kiểm tra hằng ngày của người vận hành làm được gì

- Tạo các mẫu danh sách kiểm tra tùy chỉnh cho người vận hành (các phần, mục bắt buộc và trường dữ liệu cần thu thập)
- Sao chép các mẫu có sẵn (ví dụ **Nhật ký công tơ mét**) và tùy chỉnh cho đội thiết bị của bạn
- Gán **một danh sách kiểm tra cho nhiều máy** hoặc **nhiều danh sách kiểm tra cho một máy**
- Tạo một **liên kết QR công khai dựa trên token** cho mỗi lượt gán (không thể đoán ra từ mã thiết bị)
- Cho phép người vận hành chưa đăng nhập quét mã, điền các trường do quản trị viên thiết lập và gửi
- Xem lại **Sổ theo dõi hằng ngày** chỉ cho phép ghi thêm và xuất PDF hoặc Excel làm hồ sơ kiểm toán

## Ai có thể quản lý việc kiểm tra

| Vai trò | Quyền truy cập |
| --- | --- |
| Chủ sở hữu / Quản trị viên | Tạo mẫu, gán danh sách kiểm tra, tạo và đổi liên kết QR, xem lại sổ theo dõi, xuất dữ liệu |
| Quản lý / Kỹ thuật viên | Không thể quản lý mẫu hoặc lượt gán; có thể xem các hồ sơ thiết bị mà họ đã có quyền truy cập |

Kỹ thuật viên và quản lý **không** nhìn thấy trang quản lý Kiểm tra hằng ngày trừ khi họ có vai trò Chủ sở hữu hoặc Quản trị viên của tổ chức.

## Bước 1 — Chọn hoặc tạo mẫu

1. Vào **Vận hành → Kiểm tra hằng ngày**.
2. Mở rộng **Danh mục mẫu có sẵn** và sao chép một mẫu dựng sẵn (ví dụ **Nhật ký công tơ mét** hoặc **Kiểm tra an toàn quanh xe hằng ngày**), **hoặc** nhấp vào **Mẫu mới** để tạo từ đầu.
3. Chỉnh sửa mẫu trước khi gán:
   - **Trường dữ liệu** — các giá trị do người vận hành nhập (tên, số công tơ mét, ghi chú), thông tin ngữ cảnh tùy chọn từ thiết bị của người dùng (dấu thời gian, GPS) và bản chụp dữ liệu hồ sơ thiết bị với nhãn riêng cho từng danh sách kiểm tra
   - **Mục kiểm tra** — các phần và các mục bắt buộc dạng đạt/không đạt hoặc hộp kiểm

Mẫu có sẵn **chỉ có thể sao chép** — thao tác sao chép sẽ chép các trường và mục vào tổ chức của bạn; không hỗ trợ chỉnh sửa trực tiếp danh mục mẫu có sẵn.

## Bước 2 — Gán danh sách kiểm tra cho thiết bị

Bạn có thể gán từ một trong hai nơi:

- **Trang quản lý Kiểm tra hằng ngày** — mở **Gán cho thiết bị** trên thẻ mẫu và chọn một hoặc nhiều máy.
- **Chi tiết thiết bị** — cuộn đến **Kiểm tra hằng ngày của người vận hành**, chọn một mẫu và thêm lượt gán ngay tại chỗ.

Mỗi lượt gán có liên kết QR riêng. Gán cùng một mẫu cho mười xe tải sẽ tạo ra mười liên kết độc lập, mỗi liên kết gắn với đúng hồ sơ thiết bị.

## Bước 3 — Tạo và in mã QR

1. Mở hồ sơ thiết bị.
2. Trong **Kiểm tra hằng ngày của người vận hành**, dùng **Xem mã QR** (hoặc nút **Mã QR** ở phần đầu trang thiết bị).
3. Trong hộp thoại QR, chọn **Loại mã QR**:
   - **Quét thiết bị (cần đăng nhập)** — mở hồ sơ thiết bị dành cho người đã đăng nhập (quy trình của kỹ thuật viên).
   - **Kiểm tra hằng ngày: {tên mẫu}** — mở biểu mẫu công khai dành cho người vận hành tại `/qr/operator-check-in/{token}`.

Liên kết QR được tạo tự động khi một danh sách kiểm tra được gán và luôn sẵn sàng cho chủ sở hữu
và quản trị viên của tổ chức **trên mọi thiết bị** — bạn có thể gán trên một máy tính và in từ một máy khác.

Nếu hộp thoại hiển thị thông báo thiếu liên kết (ví dụ, lượt gán được tạo trước khi có tính năng
liên kết QR dùng được trên nhiều thiết bị), chủ sở hữu hoặc quản trị viên có thể dùng **Đổi liên kết QR** trong menu thao tác
của Kiểm tra hằng ngày của người vận hành để tạo liên kết mới. Việc đổi liên kết sẽ thay thế mọi mã QR đã in trước đó.

### Nên đặt mã QR kiểm tra hằng ngày ở đâu

Mã QR kiểm tra hằng ngày **không nhất thiết phải dán trực tiếp lên máy**. Các vị trí thường dùng gồm:

- Nhãn dán trong **cabin xe dịch vụ**
- **Tờ giấy ép plastic** trong sổ hồ sơ của xưởng, sắp xếp theo số hiệu thiết bị
- **Bản để tại quầy** ở văn phòng cho giấy tờ cuối ngày
- Phiếu in kèm theo **bộ hồ sơ tuyến đường hằng ngày**

Điều quan trọng là người vận hành quét **đúng mã QR của thiết bị và danh sách kiểm tra được gán**. Nếu bạn lưu các bản in tập trung tại văn phòng:

- Ghi nhãn rõ ràng trên từng bản in với **tên thiết bị hoặc số hiệu thiết bị** và **tên danh sách kiểm tra**
- In lại sau khi **đổi token** hoặc thay đổi lượt gán
- Loại bỏ các bản cũ khi một mẫu bị xóa (các liên kết QR hiện có sẽ ngừng hoạt động)

Mã QR quét thiết bị cần đăng nhập vẫn nên được đặt trên máy hoặc gần máy để kỹ thuật viên truy cập tại hiện trường.

## Bước 4 — Người vận hành gửi phiếu (không cần đăng nhập)

Khi người vận hành quét mã QR kiểm tra hằng ngày:

1. Trang công khai tải mẫu được gán và thông tin thiết bị.
2. Người vận hành điền các trường dữ liệu bắt buộc và các mục kiểm tra.
3. hCaptcha (khi được cấu hình) và giới hạn tần suất phía máy chủ giúp chống lạm dụng.
4. Việc gửi phiếu **chỉ cho phép thêm mới** — người vận hành không thể chỉnh sửa các dòng đã có trong sổ theo dõi.

Nếu tổ chức của bạn bật **thu thập vị trí khi quét**, GPS chỉ được ghi nhận khi mẫu có trường ngữ cảnh **Vị trí GPS**. Phiếu vẫn được gửi thành công nếu người vận hành từ chối cấp quyền vị trí.

## Bước 5 — Xem lại Sổ theo dõi hằng ngày

1. Quay lại **Vận hành → Kiểm tra hằng ngày**.
2. Mở thẻ **Sổ theo dõi hằng ngày**.
3. Lọc theo khoảng ngày, thiết bị và mẫu (bao gồm các mẫu đã ngừng dùng được đánh dấu **(đã xóa)**).
4. Xuất **PDF** hoặc **Excel** cho chế độ xem đã lọc.

Việc xóa hoặc vô hiệu hóa một mẫu sẽ **vô hiệu hóa các lượt gán và ngừng các liên kết QR** nhưng vẫn **giữ lại các phiếu đã thu thập** trong sổ theo dõi.

## Tình huống thực tế — nhật ký số km của xe dịch vụ

Dùng cách này khi bạn chỉ cần **tên người vận hành + số công tơ mét** vào cuối ngày cho cả đội xe dịch vụ.

1. **Sao chép Nhật ký công tơ mét** từ danh mục mẫu có sẵn trên **Kiểm tra hằng ngày**.
2. Đổi tên bản sao thành tên phù hợp với đội xe, ví dụ **Số km xe dịch vụ hằng ngày**.
3. Xác nhận mẫu thu thập **Tên người vận hành** và **Số công tơ mét** (điều chỉnh nhãn nếu cần).
4. **Gán** mẫu cho mọi xe dịch vụ trong **Gán cho thiết bị** (chọn nhiều).
5. Với từng xe, mở chi tiết thiết bị → **Xem mã QR** → chọn **Kiểm tra hằng ngày: Số km xe dịch vụ hằng ngày** → in hoặc tải xuống.
6. Đặt mã QR theo quy trình của bạn (nhãn dán trong cabin, sổ hồ sơ văn phòng hoặc bộ hồ sơ cuối ngày — xem hướng dẫn về vị trí đặt ở trên).
7. Mỗi buổi tối, người vận hành quét mã QR của xe mình, nhập tên và số công tơ mét rồi gửi.
8. Cuối tháng, mở **Sổ theo dõi hằng ngày**, lọc theo khoảng ngày và thiết bị, sau đó **xuất Excel** để lưu hồ sơ số km.

Quy trình này hỗ trợ **hồ sơ kiểm toán**; nó không thay thế các yêu cầu về sổ nhật ký theo quy định của DOT, FMCSA hay cơ quan khác trừ khi bộ phận tuân thủ của bạn xác nhận như vậy.

## Tình huống thực tế — một máy, nhiều danh sách kiểm tra

Một chiếc máy xúc có thể cần:

- Danh sách **kiểm tra an toàn quanh máy trước ca**
- Danh sách **kiểm tra mỡ bôi trơn / dầu và dung dịch hằng tuần**

Gán cả hai mẫu trên cùng một hồ sơ thiết bị. Mỗi lượt gán có một mục riêng trong danh sách thả xuống của hộp thoại QR. Người vận hành quét mã QR tương ứng với danh sách kiểm tra mà họ đang thực hiện.

## Lưu ý về tuân thủ

Các bản ghi của ZNTEQR hỗ trợ **hồ sơ an toàn và kiểm toán**. Chúng **không** chứng nhận việc tuân thủ OSHA, DOT, FMCSA hay các yêu cầu pháp lý, quy định nào khác. Hãy dùng các tệp xuất làm bằng chứng bổ sung bên cạnh chương trình tuân thủ chính thức của tổ chức bạn.

## Tham chiếu đường dẫn công khai

| Loại QR | Đường dẫn |
| --- | --- |
| Kiểm tra hằng ngày của người vận hành | `/qr/operator-check-in/{token}` |
| Quét thiết bị cần đăng nhập | `/qr/equipment/{id}` |

Các đường dẫn này được tách riêng một cách có chủ đích — token kiểm tra hằng ngày không được tạo ra từ mã thiết bị.

## Bài viết liên quan

- [Tạo và in mã QR thiết bị](../equipment-qr/print-equipment-qr)
- [Thêm thiết bị](../equipment-qr/add-equipment)
- [Vai trò trong tổ chức](../teams-roles/organization-roles)
