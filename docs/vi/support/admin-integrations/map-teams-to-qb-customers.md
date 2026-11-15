---
title: "Liên kết nhóm với khách hàng QuickBooks"
description: "Liên kết từng nhóm khách hàng với một khách hàng QuickBooks để tính năng xuất hóa đơn biết cần ghi vào đâu."
lastReviewed: 2026-07-07
personas: ["admin","owner"]
requirement: "QuickBooks phải được kết nối. Chỉ Chủ sở hữu và Quản trị viên của Tổ chức mới có thể liên kết tài khoản khách hàng."
---

**Dành cho:** Quản trị viên, Chủ sở hữu  
**Rà soát lần cuối:** 2026-07-07

::: info Yêu cầu
QuickBooks phải được kết nối. Chỉ Chủ sở hữu và Quản trị viên của Tổ chức mới có thể liên kết tài khoản khách hàng.
:::

Trong ZNTEQR, một khách hàng bên ngoài mà bạn phục vụ được thể hiện dưới dạng **nhóm thuộc loại Khách hàng**. Khi bạn liên kết tài khoản khách hàng của nhóm đó với một khách hàng QuickBooks, tính năng xuất hóa đơn sẽ biết cần ghi vào đâu.

## 1. Mở nhóm

Vào **Nhóm** và mở nhóm của khách hàng. Những nhóm đã được liên kết sẽ hiển thị huy hiệu **QuickBooks đã đồng bộ** màu xanh lá trong danh sách Nhóm.

![Danh sách Nhóm với huy hiệu QuickBooks đã đồng bộ trên 3-A Equipment](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-02-teams-list-sync-badge.png)

## 2. Tìm thẻ Tài khoản khách hàng

Với nhóm thuộc loại Khách hàng, thẻ **Tài khoản khách hàng** nằm ở đầu trang nhóm. Đây là thông tin định danh về thanh toán và dịch vụ của nhóm — phần đồng bộ QuickBooks nằm ở đây, không nằm trong Chỉnh sửa nhóm.

## 3. Liên kết khách hàng QuickBooks

Dùng các nút bên dưới **Xuất hóa đơn QuickBooks**:

- **Liên kết tài khoản khác** / **Đổi khách hàng QB** — mở hộp chọn có ô tìm kiếm, lấy danh sách khách hàng trực tiếp từ QuickBooks. Chọn khách hàng mà nhóm này xuất hóa đơn cho.
- **Đồng bộ từ QuickBooks** — làm mới tên, thông tin liên hệ và tình trạng thuế đã lưu tạm từ QuickBooks.
- **Hủy liên kết** — gỡ bỏ liên kết (việc xuất từ nhóm này sẽ bị chặn cho đến khi liên kết lại).

Khi đã liên kết, thẻ sẽ hiển thị huy hiệu **Đã liên kết để xuất hóa đơn** màu xanh lá cùng với mã khách hàng QuickBooks và ngày đồng bộ gần nhất.

![Thẻ Tài khoản khách hàng đã liên kết để xuất hóa đơn](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-03-team-customer-account-linked.png)

Trên thiết bị di động, thẻ này cũng xuất hiện ở đầu trang nhóm:

![Thẻ tài khoản khách hàng trên di động với liên kết QuickBooks](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/mobile/qb-02-team-customer-card.png)

## 4. Liên hệ được đồng bộ tự động

Các liên hệ đồng bộ từ QuickBooks (số di động, email chính, số điện thoại chính) hiển thị ở dạng chỉ đọc trong mục **Liên hệ khách hàng** bên dưới thẻ tài khoản. Quản lý nhóm vẫn có thể thêm thủ công các liên hệ bên ngoài bên cạnh những liên hệ này.

::: tip Lưu ý
Hãy liên kết mọi nhóm khách hàng đang hoạt động trước khi bắt đầu xuất để không bị chặn vào lúc lập hóa đơn. Tình trạng miễn thuế của khách hàng cũng được đồng bộ từ QuickBooks và áp dụng cho các hóa đơn đã xuất.
:::

## Bài viết liên quan

- [Xuất lệnh công việc sang QuickBooks](./export-work-order-to-qb)
- [Kết nối QuickBooks](./connect-quickbooks)
