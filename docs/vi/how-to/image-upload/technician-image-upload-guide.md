# Hướng dẫn cho kỹ thuật viên: Tải ảnh lên hồ sơ thiết bị

## Tổng quan

Ảnh được lưu trong ghi chú của lệnh công việc. Ảnh cũng hiển thị trong thẻ Hình ảnh của thiết bị.

## Điều kiện cần có

- Có quyền truy cập ứng dụng di động hoặc giao diện web của ZNTEQR™
- Đã quét mã QR của thiết bị hoặc có sẵn ID thiết bị
- Camera hoặc các tệp ảnh sẵn sàng để tải lên
- Tài khoản kỹ thuật viên hợp lệ với quyền hạn phù hợp

## Quy trình từng bước

### Bước 1: Mở hồ sơ thiết bị

1. **Quét mã QR** trên thiết bị bằng ứng dụng di động ZNTEQR™
2. **Hoặc đi thẳng** đến trang thiết bị nếu bạn có ID thiết bị
3. Trang thiết bị sẽ hiển thị thông tin cơ bản về máy

> **Hình 1:** Trang thiết bị ban đầu hiển thị thông tin cơ bản.
> *(Ảnh chụp màn hình cho hướng dẫn này nằm trong `docs/how-to/image-upload/screenshots/`; hãy thêm tệp PNG theo README của thư mục nếu bạn cần chèn hình minh họa vào trang được xuất bản.)*

### Bước 2: Tạo lệnh công việc

1. Nhấp vào thẻ **"Lệnh công việc"** trên trang thiết bị
2. Nhấp nút **"Tạo lệnh công việc"** hoặc **"Tạo lệnh công việc đầu tiên"**
3. Điền thông tin lệnh công việc:
   - **Tiêu đề**: Nhập tiêu đề mô tả rõ công việc (ví dụ: "Sửa hệ thống thủy lực - Thay xích")
   - **Ưu tiên**: Chọn mức ưu tiên phù hợp
   - **Mô tả**: Mô tả chi tiết công việc cần làm

> **Hình 2:** Tạo lệnh công việc mới.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/03-work-order-creation-form.png` — tài nguyên tùy chọn.)*

### Bước 3: Tải ảnh lên kèm ghi chú

1. Sau khi tạo lệnh công việc, cuộn xuống phần **"Thêm ghi chú đầu tiên"**
2. Điền thông tin ghi chú:
   - **Nội dung ghi chú**: Mô tả những gì bạn phát hiện, những gì bạn đã làm và mọi nhận xét quan trọng
   - **Giờ đã làm**: Nhập thời gian đã dành cho công việc
   - **Ghi chú riêng tư**: Bật nếu ghi chú này chỉ nên hiển thị với bạn

3. **Tải ảnh lên**:
   - Trong phần **"Hình ảnh (tùy chọn)"**, nhấp **"Chọn ảnh"**
   - Chọn một hoặc nhiều ảnh từ thiết bị của bạn
   - Ảnh sẽ tự động được tải lên khi bạn lưu ghi chú

> **Hình 3:** Tải ảnh lên kèm ghi chú chi tiết.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/09-notes-section-with-image-upload.png` — tài nguyên tùy chọn.)*

### Bước 4: Đặt ảnh đại diện cho thiết bị

1. Sau khi tải ảnh lên, vào thẻ **"Hình ảnh"** trên trang thiết bị
2. Tìm ảnh bạn muốn dùng làm ảnh đại diện chính
3. Nhấp nút **"Đặt làm ảnh đại diện"** trên ảnh mong muốn
4. Ảnh đó sẽ hiển thị làm ảnh chính của thiết bị

> **Hình 4:** Đặt một ảnh làm ảnh đại diện của thiết bị.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/final-images-tab-state.png` — tài nguyên tùy chọn.)*

## Làm việc với danh mục kiểm tra bảo trì định kỳ (PM)

### Bước 5: Tạo lệnh công việc có danh mục kiểm tra bảo trì

1. Khi tạo lệnh công việc, đánh dấu tùy chọn **"Kèm danh mục kiểm tra bảo trì"**
2. Chọn một mẫu bảo trì định kỳ (ví dụ: "Forklift PM Checklist")
3. Lệnh công việc sẽ kèm theo một danh mục kiểm tra bảo trì

> **Hình 5:** Tạo lệnh công việc có danh mục kiểm tra bảo trì.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/04-work-order-form-with-pm-checklist.png` — tài nguyên tùy chọn.)*

### Bước 6: Hoàn thành các mục trong danh mục kiểm tra bảo trì

1. Trong chi tiết lệnh công việc, cuộn đến phần **"Danh mục kiểm tra bảo trì"**
2. Nhấp **"Đặt tất cả là OK"** để nhanh chóng đánh dấu mọi mục là đạt
3. Với các mục cần lưu ý:
   - Chọn trạng thái phù hợp (Cần chú ý, Nghiêm trọng, v.v.)
   - Thêm ghi chú chi tiết giải thích vấn đề
   - Tải lên ảnh cho thấy vấn đề

> **Hình 6:** Hoàn thành các mục trong danh mục kiểm tra bảo trì kèm ghi chú và ảnh.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/06-pm-checklist-section.png` — tài nguyên tùy chọn.)*

### Bước 7: Lưu tiến độ

1. Nhấp **"Lưu thay đổi"** sau khi cập nhật các mục trong danh mục
2. Hệ thống sẽ tự động lưu tiến độ của bạn
3. Bạn có thể quay lại danh mục sau để làm tiếp

> **Hình 7:** Lưu tiến độ danh mục kiểm tra bảo trì.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/08-pm-checklist-after-set-all-ok.png` — tài nguyên tùy chọn.)*

## Quản lý trạng thái lệnh công việc

### Bước 8: Cập nhật trạng thái lệnh công việc

1. Trong chi tiết lệnh công việc, tìm phần **"Trạng thái"**
2. Nhấp vào danh sách thả xuống trạng thái để đổi trạng thái lệnh công việc:
   - **Chờ thực hiện**: Lệnh công việc đã được tạo nhưng chưa bắt đầu
   - **Đang thực hiện**: Công việc đang được tiến hành
   - **Hoàn thành**: Mọi công việc đã xong
   - **Đã hủy**: Lệnh công việc đã bị hủy

> **Hình 8:** Cập nhật trạng thái lệnh công việc.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/work-order-complete-view.png` — tài nguyên tùy chọn.)*

## Thêm hạng mục và chi phí

### Bước 9: Thêm linh kiện và chi phí

1. Trong chi tiết lệnh công việc, cuộn đến phần **"Chi phí"**
2. Nhấp **"Thêm khoản chi phí"** để thêm linh kiện hoặc dịch vụ
3. Điền thông tin:
   - **Tên hạng mục**: Tên linh kiện hoặc dịch vụ
   - **Số lượng**: Số lượng đã dùng
   - **Đơn giá**: Chi phí cho mỗi đơn vị
   - **Mô tả**: Thông tin bổ sung

> **Hình 9:** Thêm linh kiện và chi phí vào lệnh công việc.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/work-order-add-note-form.png` — tài nguyên tùy chọn.)*

## Ghi chú riêng tư

### Bước 10: Thêm ghi chú riêng tư

1. Khi thêm ghi chú, bật tùy chọn **"Ghi chú riêng tư"**
2. Ghi chú riêng tư chỉ hiển thị với bạn và các kỹ thuật viên khác
3. Dùng ghi chú riêng tư cho:
   - Nhận xét nội bộ
   - Lời nhắc cá nhân
   - Thông tin nhạy cảm

> **Hình 10:** Thêm ghi chú riêng tư mà khách hàng sẽ không thấy.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/note-with-uploaded-image.png` — tài nguyên tùy chọn.)*

## Xem tất cả ảnh của thiết bị

### Bước 11: Mở thư viện ảnh của thiết bị

1. Vào thẻ **"Hình ảnh"** trên trang thiết bị
2. Xem tất cả ảnh đã tải lên qua lệnh công việc và ghi chú thiết bị
3. Ảnh được sắp xếp theo ngày và nguồn
4. Nhấp vào bất kỳ ảnh nào để xem ở kích thước đầy đủ

> **Hình 11:** Xem tất cả ảnh của thiết bị trong thư viện ảnh.
> *(Đường dẫn ảnh chụp màn hình: `screenshots/images-tab-with-both-images.png` — tài nguyên tùy chọn.)*

## Khắc phục sự cố

### Ảnh không xuất hiện trong thư viện ảnh

Nếu ảnh tải lên qua lệnh công việc không xuất hiện trong thẻ Hình ảnh của thiết bị:

1. Kiểm tra xem lệnh công việc đã được lưu đúng cách chưa
2. Xác nhận việc tải ảnh lên đã hoàn tất thành công
3. Tải lại trang để xem ảnh mới cập nhật
4. Liên hệ quản trị viên nếu sự cố vẫn tiếp diễn

### Sự cố khi tải lên

Nếu bạn gặp khó khăn khi tải ảnh lên:

1. Kiểm tra kết nối internet
2. Bảo đảm ảnh ở định dạng được hỗ trợ (JPG, PNG, GIF)
3. Thử giảm dung lượng tệp ảnh nếu tải lên chậm
4. Liên hệ bộ phận hỗ trợ nếu sự cố vẫn còn

## Cách làm tốt nhất

1. **Luôn thêm ghi chú mô tả** kèm theo ảnh
2. **Dùng ảnh rõ nét, đủ sáng** cho thấy rõ vấn đề
3. **Chụp từ nhiều góc** với các vấn đề phức tạp
4. **Đặt ảnh đẹp nhất làm ảnh đại diện** để dễ nhận biết
5. **Dùng ghi chú riêng tư** cho thông tin nhạy cảm
6. **Lưu công việc thường xuyên** để tránh mất tiến độ

## Hỗ trợ

Các hướng dẫn thao tác tại hiện trường nằm trong Trung tâm trợ giúp. Hãy bắt đầu với [Thêm ghi chú và ảnh](/vi/support/technician-field-work/add-notes-and-photos). Người dùng đã đăng nhập có thể mở phiếu hỗ trợ tại [eqr.zinitek.com/dashboard/support](https://eqr.zinitek.com/dashboard/support).
