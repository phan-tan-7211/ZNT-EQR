# Tài liệu tham chiếu quy trình

Tài liệu này là tài liệu tham chiếu kỹ thuật chính thức về vòng đời lệnh công việc,
quyền hạn của từng vai trò và các quy tắc chuyển trạng thái trong ZNTEQR. Đây không phải
là hướng dẫn từng bước dành cho người dùng cuối — các hướng dẫn đó nằm trong **Trung tâm trợ giúp ZNTEQR** tại
**`https://eqrdocs.zinitek.com/support/`**. Người dùng đã đăng nhập báo cáo sự cố tại
**`https://eqr.zinitek.com/dashboard/support`**.

## Tìm hướng dẫn dành cho người dùng ở đâu

- **Trung tâm trợ giúp** — `https://eqrdocs.zinitek.com/support/` (nguồn thông tin chính cho
  các hướng dẫn từng bước, được sắp xếp theo vai trò và quy trình).
- **[Thẻ tham khảo nhanh về tải ảnh lên](../how-to/image-upload/quick-reference-card.md)**
  — bảng tóm tắt một trang dành cho kỹ thuật viên làm việc tại hiện trường.
- **[Hướng dẫn tải ảnh lên cho kỹ thuật viên](../how-to/image-upload/technician-image-upload-guide.md)**
  — hướng dẫn theo từng bước đánh số, có ảnh chụp màn hình, cho quy trình lệnh công việc kèm ảnh.

Phần còn lại của tài liệu được trình bày dưới dạng tài liệu tham chiếu cho lập trình viên,
quản trị viên và kỹ sư hỗ trợ, những người cần nắm toàn bộ vòng đời và sơ đồ phân quyền
ở cùng một nơi.

## Vòng đời lệnh công việc

### Luồng trạng thái

Lệnh công việc đi qua bảy trạng thái:

1. **Đã gửi** — trạng thái ban đầu khi tạo.
2. **Đã chấp nhận** — đã được xem xét và phê duyệt để lên lịch.
3. **Đã giao** — đã được giao cho một kỹ thuật viên hoặc một nhóm cụ thể.
4. **Đang thực hiện** — công việc đã bắt đầu.
5. **Tạm dừng** — đang tạm ngưng (chờ linh kiện, chờ khách hàng hoặc chờ quyền tiếp cận).
6. **Hoàn thành** — trạng thái kết thúc. `completed_date` và `completed_day` được
   đặt tự động khi chuyển trạng thái.
7. **Đã hủy** — trạng thái kết thúc. `completed_day` vẫn là `NULL`.

### Chuyển trạng thái

| Hiện tại | Trạng thái tiếp theo | Vai trò được phép | Ghi chú |
|---------|-------------|---------------|-------|
| Đã gửi | Đã chấp nhận, Đã hủy | Quản lý, Quản trị viên, Chủ sở hữu | Xem xét ban đầu |
| Đã chấp nhận | Đã giao, Đã hủy | Quản lý, Quản trị viên, Chủ sở hữu | Sẵn sàng để giao việc |
| Đã giao | Đang thực hiện, Tạm dừng, Đã hủy | Quản lý, Quản trị viên, Chủ sở hữu, Kỹ thuật viên được giao | Có thể bắt đầu công việc |
| Đang thực hiện | Hoàn thành, Tạm dừng, Đã hủy | Quản lý, Quản trị viên, Chủ sở hữu, Kỹ thuật viên được giao | Giai đoạn đang làm việc |
| Tạm dừng | Đang thực hiện, Đã hủy | Quản lý, Quản trị viên, Chủ sở hữu, Kỹ thuật viên được giao | Tiếp tục hoặc chấm dứt |
| Hoàn thành | (kết thúc) | — | Cuối cùng |
| Đã hủy | (kết thúc) | — | Cuối cùng |

### Quyền thay đổi trạng thái (tóm tắt)

```
Submitted → Accepted:      Manager+
Accepted → Assigned:       Manager+
Assigned → In Progress:    Manager+ or Assigned Technician
In Progress → Completed:   Manager+ or Assigned Technician
Any → On Hold:             Manager+ or Assigned Technician
Any → Cancelled:           Manager+
```

## Vai trò và quyền hạn

Phần này tóm tắt các quyền hạn theo vai trò quyết định việc truy cập lệnh công việc.
Để xem ma trận RBAC đầy đủ (bao gồm thiết bị, kho vật tư và quản lý
thành viên), hãy xem [Phân quyền](./permissions.md).

### Vai trò cấp tổ chức

| Vai trò | Phạm vi | Quyền hạn với lệnh công việc |
|------|-------|-------------------------|
| Chủ sở hữu | Toàn tổ chức | Tạo, xem, sửa, xóa, giao và thay đổi trạng thái của mọi lệnh công việc. |
| Quản trị viên | Toàn tổ chức | Giống Chủ sở hữu, trừ việc xóa tổ chức và chuyển quyền sở hữu. |
| Thành viên | Tổ chức (giới hạn) | Tạo lệnh công việc; xem các lệnh do mình tạo hoặc được giao; xem lệnh công việc của nhóm. |

### Vai trò cấp nhóm

| Vai trò | Phạm vi | Quyền hạn với lệnh công việc |
|------|-------|-------------------------|
| Quản lý | Nhóm | Tạo, giao, thay đổi trạng thái, quản lý thành viên nhóm, xem mọi lệnh công việc của nhóm. |
| Kỹ thuật viên | Nhóm | Tạo, cập nhật trạng thái các lệnh công việc được giao, ghi nhận việc hoàn thành. Không thể giao việc. |
| Người yêu cầu | Nhóm | Tạo lệnh công việc (gửi yêu cầu). Sau khi gửi, chỉ được xem lệnh công việc của nhóm. |
| Người xem | Nhóm | Chỉ được xem lệnh công việc của nhóm. Không thể tạo hoặc chỉnh sửa. |

## Các cách tạo lệnh công việc

### 1. Tạo trực tiếp
- **Truy cập**: trang Lệnh công việc (`/dashboard/work-orders`).
- **Điểm bắt đầu**: nút "Tạo lệnh công việc".
- **Biểu mẫu**: hộp thoại `WorkOrderForm` gồm tiêu đề, mô tả, thiết bị
  (bắt buộc), cùng các mục tùy chọn là mức ưu tiên, người được giao, nhóm, ngày đến hạn và
  số giờ dự kiến.
- **Trạng thái ban đầu**: Đã gửi.

### 2. Tạo từ một thiết bị cụ thể
- **Truy cập**: trang Chi tiết thiết bị (`/dashboard/equipment/:equipmentId`).
- **Vị trí**: thẻ Lệnh công việc.
- **Cách hoạt động**: Biểu mẫu mở ra với thiết bị đã được chọn sẵn và khóa lại.

### 3. Quét mã QR
- **Truy cập**: Dùng camera gốc của điện thoại để quét mã QR của thiết bị.
- **Luồng thao tác**:
  1. Người dùng quét mã QR bằng camera điện thoại.
  2. URL mở ra dưới dạng `/qr/equipment/{id}` (hoặc `/qr/inventory/{id}`,
     `/qr/work-order/{id}`).
  3. `EquipmentQRScan` xác thực thông tin đăng nhập và ngữ cảnh tổ chức, sau đó chuyển hướng
     đến bản ghi đích.
  4. Người dùng có thể tạo lệnh công việc ngay từ thiết bị đó.

## Giao lệnh công việc

### Giao cho cá nhân
- Vai trò được phép: Chủ sở hữu, Quản trị viên, Quản lý của nhóm.
- Người được giao sẽ thấy lệnh trong chế độ xem "Lệnh công việc của tôi".
- Việc giao cho cá nhân được ưu tiên khi cập nhật trạng thái.

### Giao cho nhóm
- Vai trò được phép: Chủ sở hữu, Quản trị viên, Quản lý của nhóm.
- Mọi thành viên trong nhóm đều thấy lệnh công việc.
- Quản lý có thể giao lại trong phạm vi nhóm.

### Giao kết hợp
- Có thể đặt cả cá nhân lẫn nhóm. Việc giao cho cá nhân vẫn được
  ưu tiên đối với các thao tác trạng thái; việc giao cho nhóm mở rộng phạm vi hiển thị.

## Tải ảnh lên

Việc tải ảnh lên được hướng dẫn từng bước trong [Trung tâm trợ giúp](https://eqrdocs.zinitek.com/support/technician-field-work/add-notes-and-photos),
mục Công việc hiện trường của kỹ thuật viên. Quy ước
kỹ thuật dành cho lập trình viên như sau:

- Ảnh được đính kèm vào ghi chú của lệnh công việc (hoặc ghi chú của thiết bị).
- Định dạng được hỗ trợ: JPG, PNG, GIF, WebP.
- Dung lượng tối đa: 10 MB mỗi tệp.
- Số lượng tối đa mỗi ghi chú: 10 ảnh.
- Ảnh tải lên được lưu vào Supabase Storage và được tham chiếu qua
  `equipment_note_images.uploaded_by`, trường liên kết với người dùng đã tải lên.
- Ảnh tải lên trong lệnh công việc cũng hiển thị trong thẻ Hình ảnh của thiết bị.

## Khắc phục sự cố

### Các sự cố thường gặp với lệnh công việc
1. **Không có quyền truy cập** — kiểm tra vai trò của người dùng trong tổ chức và tư cách
   thành viên nhóm. Các thao tác trong phạm vi nhóm yêu cầu vai trò nhóm phù hợp.
2. **Không tìm thấy thiết bị** — xác nhận thiết bị tồn tại và người dùng là
   thành viên của nhóm quản lý thiết bị đó.
3. **Giao việc thất bại** — người được giao phải thuộc tổ chức và
   (khi giao cho nhóm) thuộc nhóm đó.
4. **Lỗi chuyển trạng thái** — kiểm tra bảng chuyển trạng thái ở trên. Giao diện
   chỉ hiển thị các trạng thái tiếp theo hợp lệ, nhưng các lệnh gọi API trực tiếp cũng phải tuân theo
   cùng quy tắc.

### Các sự cố thường gặp khi tải ảnh lên
- **Không tải được ảnh lên** — kiểm tra dung lượng tệp (< 10 MB), định dạng (JPG, PNG, GIF,
  WebP) và kết nối mạng.
- **Ảnh không xuất hiện trong thư viện ảnh** — xác nhận lệnh công việc đã được lưu; thẻ
  Hình ảnh của thiết bị tổng hợp ảnh từ ghi chú lệnh công việc và ghi chú thiết bị nên có thể mất
  vài giây sau khi tải lên.
- **Chất lượng ảnh kém** — bảo đảm đủ ánh sáng và ống kính sạch; giữ
  chắc thiết bị khi chụp.

Với nội dung khắc phục sự cố dành cho người dùng mà nhóm hỗ trợ có thể gửi cho khách hàng,
hãy hướng họ đến [Trung tâm trợ giúp](https://eqrdocs.zinitek.com/support/) hoặc trang
Hỗ trợ công khai (`https://eqr.zinitek.com/support`, có email liên hệ và thời gian phản hồi;
ZNTEQR không có trang trạng thái). Người dùng đã đăng nhập có thể báo cáo sự cố tại
`https://eqr.zinitek.com/dashboard/support`.

## Tài liệu liên quan

- [Phân quyền](./permissions.md). Ma trận RBAC đầy đủ.
- [Hướng dẫn tải ảnh lên cho kỹ thuật viên](../how-to/image-upload/technician-image-upload-guide.md). Hướng dẫn theo từng bước đánh số, có ảnh chụp màn hình.
- [QuickBooks Online](../integrations/quickbooks.md). Kết nối, liên kết nhóm, xuất hóa đơn nháp.

---

*Rà soát lần cuối: 2026-05-01. Tài liệu này là tài liệu tham chiếu kỹ thuật. Các hướng dẫn từng bước
dành cho người dùng nằm trong [Trung tâm trợ giúp](https://eqrdocs.zinitek.com/support/).*
