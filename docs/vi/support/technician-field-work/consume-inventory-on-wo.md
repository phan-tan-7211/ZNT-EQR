---
title: "Sử dụng linh kiện trong kho cho lệnh công việc"
description: "Ghi nhận các linh kiện bạn đã dùng khi sửa chữa để tồn kho tự động giảm và chi phí được đưa vào hóa đơn."
lastReviewed: 2026-07-06
personas: ["technician","manager"]
requirement: "Phải là Quản lý, Kỹ thuật viên hoặc Người quản lý phụ tùng được chỉ định."
---

**Dành cho:** Kỹ thuật viên, Quản lý  
**Rà soát lần cuối:** 2026-07-06

::: info Yêu cầu
Phải là Quản lý, Kỹ thuật viên hoặc Người quản lý phụ tùng được chỉ định.
:::

## 1. Mở mục Linh kiện & Chi phí của lệnh công việc

Cuộn đến mục Chi phí trong phần chi tiết lệnh công việc và chạm Thêm khoản chi phí.

## 2. Tìm linh kiện

Nhập tên linh kiện, SKU hoặc số tham chiếu chéo. Các nhóm linh kiện thay thế sẽ hiển thị những linh kiện tương đương ngay trong cùng lượt tìm kiếm.

![Hộp thoại thêm linh kiện từ kho vật tư](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/09-inventory-part-selector.png)

## 3. Nhập số lượng đã dùng

ZNTEQR trừ số lượng đó khỏi tồn kho hiện có và ghi đơn giá vào tổng chi phí của lệnh công việc.

::: tip Lưu ý
Nếu linh kiện giảm xuống dưới ngưỡng tồn kho thấp, Người quản lý phụ tùng và Quản trị viên sẽ nhận được cảnh báo tồn kho thấp.
:::

## 4. Lưu

Mục này xuất hiện trên dòng chi phí của lệnh công việc. Lịch sử giao dịch của vật tư trong kho giờ có thêm một bản ghi gắn với lệnh công việc này.

![Linh kiện đã dùng trên các dòng chi phí của lệnh công việc](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/10-part-consumed-on-work-order.png)

![Thẻ chi phí hiện trường trên di động](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/mobile/05-mobile-field-costs-card.png)

## Bài viết liên quan

- [Thêm vật tư vào kho](../inventory-parts/add-inventory-item)
- [Tìm linh kiện bằng tra cứu linh kiện](../inventory-parts/part-lookup-search)
