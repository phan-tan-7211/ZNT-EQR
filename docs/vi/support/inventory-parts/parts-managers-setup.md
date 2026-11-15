---
title: "Ủy quyền quản lý kho bằng Quyền phụ tùng"
description: "Cấp quyền Người quản lý phụ tùng (chỉnh sửa) và Người sử dụng phụ tùng (xem + tra cứu linh kiện) tại cùng một nơi mà không cần đưa ai lên làm quản trị viên."
lastReviewed: 2026-07-06
personas: ["admin","owner"]
requirement: "Phải là Chủ sở hữu hoặc Quản trị viên của tổ chức."
---

**Dành cho:** Quản trị viên, Chủ sở hữu  
**Rà soát lần cuối:** 2026-07-06

::: info Yêu cầu
Phải là Chủ sở hữu hoặc Quản trị viên của tổ chức.
:::

Theo mặc định, chỉ Chủ sở hữu và Quản trị viên mới có thể xem hoặc chỉnh sửa kho vật tư. Bảng **Quyền phụ tùng** cấp hai mức truy cập để xưởng vẫn hoạt động trôi chảy mà không cần mở rộng đặc quyền quản trị:

- **Người quản lý phụ tùng** có thể tạo, chỉnh sửa, xóa và điều chỉnh vật tư trong kho.
- **Người sử dụng phụ tùng** có thể xem kho vật tư và dùng tính năng tra cứu linh kiện, nhưng không thể chỉnh sửa vật tư.

Thành viên không được cấp quyền nào trong hai quyền trên hoàn toàn không thể truy cập kho vật tư.

## 1. Mở Kho vật tư → Quyền phụ tùng

Từ Kho vật tư, nhấp nút **Quyền phụ tùng** bên cạnh Thêm vật tư. Trên điện thoại, dùng liên kết **Cập nhật quyền phụ tùng** ở cuối danh sách kho vật tư.

## 2. Thêm thành viên vào một vai trò

Mỗi phần vai trò có một nút **Thêm**, mở ra bộ chọn thành viên có thể tìm kiếm với các nút chọn tất cả / bỏ chọn tất cả / đảo lựa chọn. Chọn một hoặc nhiều thành viên rồi xác nhận — quyền truy cập có hiệu lực ngay lập tức.

## 3. Gỡ quyền truy cập khi cần

Nhấp biểu tượng thùng rác trên hàng của thành viên ở một trong hai phần rồi xác nhận. Quyền truy cập của họ trở về không có (hoặc về quyền còn lại của họ).

::: tip Cũng có trên trang Thành viên
Các nút bật/tắt Người phụ trách vật tư và Người dùng vật tư cũng xuất hiện cho từng thành viên tại **Tổ chức → Thành viên**, nhờ đó bạn có thể xem xét quyền truy cập kho vật tư cùng với các quyền khác của thành viên.
:::

## Bài viết liên quan

- [Thêm vật tư vào kho](./add-inventory-item)
