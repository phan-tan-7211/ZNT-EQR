---
title: "Quản lý mẫu bảo trì định kỳ trên lệnh công việc đang hoạt động"
description: "Thêm, thay đổi hoặc gỡ bỏ danh sách kiểm tra bảo trì định kỳ trên một lệnh công việc đang mở trước khi lệnh được hoàn thành hoặc bị hủy."
lastReviewed: 2026-07-04
personas: ["technician","manager","admin","owner"]
requirement: "Lệnh công việc phải còn hoạt động (chưa hoàn thành hoặc bị hủy)."
---

**Dành cho:** Kỹ thuật viên, Quản lý, Chủ sở hữu, Quản trị viên  
**Rà soát lần cuối:** 2026-07-04

::: info Yêu cầu
Lệnh công việc phải còn hoạt động — không ở trạng thái **Hoàn thành** hay **Đã hủy**.
:::

Kỹ thuật viên và quản lý có thể sửa một mẫu bảo trì định kỳ (PM) bị chọn sai mà không cần xóa lệnh công việc rồi chụp lại ảnh hay nhập lại ghi chú. Ảnh, ghi chú, chi phí và lịch sử trạng thái của lệnh công việc vẫn được giữ nguyên khi bạn thay đổi hoặc gỡ bỏ danh sách kiểm tra PM.

## 1. Mở lệnh công việc

Từ **Lệnh công việc**, mở công việc đang hoạt động mà bạn cần cập nhật.

## 2. Bắt đầu quản lý PM

Trên trang chi tiết lệnh công việc, chọn:

- **Thêm danh mục kiểm tra bảo trì** khi lệnh công việc được tạo mà không có PM, hoặc
- **Quản lý mẫu bảo trì định kỳ** khi đã có danh sách kiểm tra PM đính kèm.

![Hộp thoại quản lý danh sách kiểm tra PM](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/work-order-pm/desktop/01-add-pm-dialog.png)

## 3. Thêm danh sách kiểm tra PM

1. Chọn đúng mẫu trong danh sách thả xuống **Mẫu bảo trì định kỳ**. Nếu thiết bị có mẫu mặc định nhưng công việc này cần một mẫu khác, bạn có thể thay thế tại đây.
2. Chọn **Lưu thay đổi bảo trì**.

ZNTEQR tạo danh sách kiểm tra PM và đặt lệnh công việc sang chế độ có bật PM.

![Phần danh sách kiểm tra PM sau khi đính kèm mẫu](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/work-order-pm/desktop/02-pm-checklist-after-add.png)

## 4. Thay đổi mẫu bảo trì định kỳ

1. Mở **Quản lý mẫu bảo trì định kỳ**.
2. Chọn một mẫu danh sách kiểm tra khác.
3. Chọn **Lưu thay đổi bảo trì**.

Nếu danh sách kiểm tra hiện tại đã có hạng mục hoàn thành hoặc ghi chú PM, ZNTEQR sẽ cảnh báo bạn trước khi đặt lại dữ liệu PM. Chỉ danh sách kiểm tra PM bị thay thế — ảnh và ghi chú của lệnh công việc vẫn được giữ lại.

::: tip Trước khi bạn đổi mẫu
Hãy tải xuống tệp PDF danh sách kiểm tra PM từ lệnh công việc nếu bạn cần lưu lại các hạng mục kiểm tra đã hoàn thành.
:::

## 5. Gỡ bỏ danh sách kiểm tra PM

1. Mở **Quản lý mẫu bảo trì định kỳ**.
2. Đặt **Mẫu bảo trì định kỳ** thành **Không có** (hoặc dùng nút xóa bên cạnh danh sách thả xuống).
3. Chọn **Lưu thay đổi bảo trì**.

Phần PM biến mất khỏi lệnh công việc. Ghi chú, ảnh và chi phí vẫn nằm trên lệnh công việc.

## Ai có thể quản lý mẫu bảo trì định kỳ

| Vai trò | Thêm / thay đổi / gỡ bỏ PM trên lệnh công việc đang hoạt động |
| --- | --- |
| Chủ sở hữu / Quản trị viên | Có |
| Quản lý / Kỹ thuật viên (thành viên nhóm) | Có |
| Người yêu cầu / Người xem | Không |

## Bài viết liên quan

- [Hoàn thành danh sách kiểm tra PM](../technician-field-work/pm-checklist)
- [Tạo lệnh công việc từ thiết bị](../technician-field-work/create-work-order-from-equipment)
- [Vòng đời lệnh công việc](./work-order-lifecycle)
