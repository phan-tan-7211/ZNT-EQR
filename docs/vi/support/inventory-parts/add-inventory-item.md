---
title: "Thêm vật tư vào kho"
description: "Tạo một linh kiện mới với mức tồn kho, quy tắc tương thích và mã QR để kỹ thuật viên có thể quét ngay tại ngăn chứa."
lastReviewed: 2026-07-04
personas: ["admin","owner","manager"]
requirement: "Phải là Chủ sở hữu, Quản trị viên hoặc Người quản lý phụ tùng được chỉ định."
---

**Dành cho:** Quản trị viên, Chủ sở hữu, Quản lý  
**Rà soát lần cuối:** 2026-07-04

::: info Yêu cầu
Phải là Chủ sở hữu, Quản trị viên hoặc Người quản lý phụ tùng được chỉ định.
:::

## 1. Mở Kho vật tư

Chọn Kho vật tư trên thanh bên. Danh sách hiển thị mọi vật tư trong toàn tổ chức của bạn và có thể lọc theo nhóm.

## 2. Nhấp Thêm vật tư

Biểu mẫu mở ra với các trường bắt buộc và tùy chọn. Để nhập hàng chục hoặc hàng trăm linh kiện cùng lúc, hãy dùng tính năng chỉnh sửa kho hàng loạt.


## 3. Điền thông tin cơ bản

- **Tên** — mang tính mô tả, ví dụ "Oil Filter - CAT 320".
- **SKU** — mã linh kiện nội bộ của bạn.
- **Mã ngoài** — mã vạch của nhà sản xuất hoặc UPC để quét.
- **Mô tả** — thông tin tùy chọn giúp nhân viên hiện trường nhận biết linh kiện.

## 4. Đặt mức tồn kho

- **Số lượng tồn** — số lượng tồn kho hiện tại.
- **Ngưỡng tồn kho thấp** — ZNTEQR cảnh báo Người quản lý phụ tùng khi tồn kho giảm xuống bằng hoặc thấp hơn con số này.
- **Đơn giá mặc định** — dùng để điền chi phí cho lệnh công việc.
- **Vị trí** — tên gọi tắt **Tên vị trí** tùy chọn (ví dụ "Shelf A-3"). Nhãn này không đặt ghim trên bản đồ. Hãy đặt **địa chỉ lưu kho** có cấu trúc trên trang chi tiết vật tư hoặc kế thừa [vị trí mặc định của kho vật tư trong tổ chức](../admin-integrations/organization-settings).

## 5. Lưu và in mã QR

Lưu vật tư. Từ trang chi tiết của vật tư, chạm vào biểu tượng QR để in nhãn dán lên ngăn chứa, nhờ đó kỹ thuật viên có thể quét trên đường đi làm việc.

## Bài viết liên quan

- [Điều chỉnh số lượng tồn kho](./adjust-inventory-quantity)
- [Vị trí lưu kho vật tư](./inventory-storage-locations)
- [Ủy quyền quản lý kho bằng Quyền phụ tùng](./parts-managers-setup)
