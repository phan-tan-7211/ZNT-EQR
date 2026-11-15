---
title: "Xuất lệnh công việc sang QuickBooks"
description: "Hoàn thành một lệnh công việc bảo trì định kỳ (PM) và gửi sang QuickBooks Online dưới dạng hóa đơn nháp kèm các dòng nhân công và phụ tùng, ghi chú và ghi chú cho khách hàng."
lastReviewed: 2026-07-07
personas: ["admin","owner"]
requirement: "Chỉ Chủ sở hữu và Quản trị viên (hoặc thành viên được cấp quyền truy cập QuickBooks) mới có thể xuất. Lệnh công việc phải đã hoàn thành và thiết bị của lệnh phải thuộc một nhóm được liên kết với khách hàng QuickBooks."
---

**Dành cho:** Quản trị viên, Chủ sở hữu\
**Xem xét lần cuối:** 2026-07-07

::: info Yêu cầu
Chỉ Chủ sở hữu và Quản trị viên (hoặc thành viên được cấp quyền truy cập QuickBooks) mới có thể xuất. Lệnh công việc phải **đã hoàn thành** và thiết bị của lệnh phải thuộc một nhóm được liên kết với khách hàng QuickBooks.
:::

Hướng dẫn này đi theo một công việc bảo trì định kỳ từ đầu đến cuối: tạo lệnh công việc PM, hoàn thành danh mục kiểm tra, ghi nhận các chi phí tính tiền, hoàn thành lệnh công việc và xuất sang QuickBooks dưới dạng hóa đơn nháp.

## Video hướng dẫn trên máy tính

<https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-demo.mp4>

## 1. Tạo lệnh công việc (kèm danh mục kiểm tra PM)

Từ trang thiết bị, mở thẻ **Lệnh công việc** và nhấp vào **Tạo lệnh công việc**. Đặt tiêu đề và mô tả rõ ràng, phân công một kỹ thuật viên và chọn **Mẫu bảo trì định kỳ** của thiết bị trong danh sách thả xuống ngay bên dưới tiêu đề (mặc định là mẫu đã được gán nếu có).

![Hộp thoại Tạo lệnh công việc, thông tin chung](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-04-create-work-order-general.png)

![Hộp thoại Tạo lệnh công việc với mẫu bảo trì định kỳ được chọn bên dưới tiêu đề](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-05-create-work-order-pm-type.png)

Nếu bạn chưa cập nhật số giờ hoạt động của thiết bị, ZNTEQR sẽ hỏi trước khi tạo:

![Xác nhận số giờ hoạt động trước khi tạo lệnh công việc](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-06-create-work-order-hours-guard.png)

Lệnh công việc mới mở ra với danh mục kiểm tra PM đính kèm và các liên hệ của khách hàng ở thanh bên.

![Lệnh công việc mới đã được phân công kèm danh mục kiểm tra PM](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-07-work-order-assigned.png)

## 2. Hoàn thành danh mục kiểm tra PM

Nhấp vào **Bắt đầu công việc**, rồi lần lượt thực hiện các phần của danh mục kiểm tra. Khi máy đạt yêu cầu, **Đặt tất cả là OK** sẽ hoàn thành các mục còn lại chỉ trong một bước. **Hoàn tất bảo trì** được mở khóa khi mọi mục đã được đánh giá.

![Danh mục kiểm tra PM với tất cả các phần đã hoàn thành](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-08-pm-checklist-complete.png)

::: tip Điều kiện PM
Lệnh công việc có danh mục kiểm tra PM không thể hoàn thành cho đến khi chính phần PM được hoàn tất — thao tác **Hoàn thành** vẫn bị vô hiệu hóa cho đến lúc đó.
:::

## 3. Ghi nhận các chi phí tính tiền

Dùng **Thêm công lao động** cho số giờ tính tiền × đơn giá theo giờ, và **Thêm khoản chi phí** cho phụ tùng và vật tư. Những khoản này trở thành các dòng chi tiết trên hóa đơn, vì vậy hãy chốt chúng trước khi hoàn thành.

![Hộp thoại Thêm công lao động với số giờ và đơn giá theo giờ](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-09-add-labor-dialog.png)

![Chi phí chi tiết với các dòng nhân công và phụ tùng](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-10-itemized-costs.png)

## 4. Hoàn thành lệnh công việc

Nhấp vào **Hoàn thành** và xác nhận. Sau khi hoàn thành, ghi chú, hình ảnh và chi phí sẽ bị khóa.

![Xác nhận hoàn thành lệnh công việc](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-11-complete-work-order-confirm.png)

## 5. Xuất → QuickBooks → Tạo hóa đơn mới

Mở trình đơn **Xuất** ở phần đầu trang lệnh công việc và chọn **QuickBooks → Tạo hóa đơn mới**.

![Trình đơn Xuất với trình đơn con QuickBooks](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-12-export-menu-quickbooks.png)

Trên thiết bị di động, các thao tác này nằm trong bảng thao tác nhanh của lệnh công việc, dưới mục **QuickBooks**:

![Bảng thao tác trên di động với mục QuickBooks](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/mobile/qb-04-action-sheet-quickbooks.png)

Khi xuất xong, phần đầu trang lệnh công việc hiển thị huy hiệu hóa đơn với tổng tiền nháp và số hóa đơn:

![Phần đầu trang lệnh công việc với huy hiệu Hóa đơn nháp](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-13-invoice-draft-badge.png)

Sau lần xuất đầu tiên, trình đơn con QuickBooks chuyển thành **Cập nhật hóa đơn #…** và **Mở hóa đơn**:

![Trình đơn Xuất sau khi đã có hóa đơn](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-14-export-menu-post-invoice.png)

## 6. Xem xét hóa đơn nháp trong QuickBooks

**Mở hóa đơn** đưa bạn thẳng đến bản nháp trong QuickBooks Online. ZNTEQR ánh xạ lệnh công việc như sau:

| Dữ liệu lệnh công việc | Vị trí trong QuickBooks |
| --- | --- |
| Các dòng chi phí nhân công | Một dòng dịch vụ **Labor** (nhân công, đã cộng gộp) |
| Tất cả các dòng chi phí khác | Một dòng **Parts** (phụ tùng, đã cộng gộp) |
| Tóm tắt danh mục kiểm tra PM + ghi chú công khai | Mô tả trên dòng chính |
| Lịch sử trạng thái + ghi chú công khai | Lời nhắn khách hàng nhìn thấy được |
| Bảng phân tích chi phí đầy đủ + ghi chú riêng tư | Ghi chú riêng tư (khách hàng không nhìn thấy) |
| Hãng/mẫu/số sê-ri/số giờ của thiết bị | Trường tùy chỉnh của hóa đơn |
| Mã lệnh công việc và các ngày | Ghi chú trên bảng sao kê (ẩn) |
| Tình trạng thuế của khách hàng | Thuế bán hàng (tính tự động, tôn trọng trường hợp miễn thuế) |

![Hóa đơn nháp trong QuickBooks với các dòng nhân công và phụ tùng](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-15-qbo-invoice-top.png)

![Tổng tiền hóa đơn nháp, ghi chú cho khách hàng và ghi chú sao kê ẩn](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-16-qbo-invoice-totals.png)

::: tip Chỉ tạo bản nháp
ZNTEQR luôn tạo một **bản nháp**. Bạn xem xét và gửi từ QuickBooks — không có gì được tự động gửi email cho khách hàng của bạn. Khi hóa đơn đã được gửi hoặc thanh toán, trạng thái hóa đơn (và số dư) sẽ tự động được phản ánh ngược lại trên lệnh công việc.
:::

## 7. Xuất lại nếu lệnh công việc thay đổi

**Cập nhật hóa đơn** đẩy dữ liệu mới nhất của lệnh công việc vào cùng bản nháp đó. Một khi bạn đã gửi hóa đơn trong QuickBooks, lần xuất sau sẽ tạo một hóa đơn mới thay vì chỉnh sửa hóa đơn đã gửi.

## Khắc phục sự cố

Nếu tùy chọn QuickBooks bị thiếu hoặc bị vô hiệu hóa trong trình đơn Xuất, hãy xác nhận:

1. QuickBooks đã được kết nối (trang Tích hợp hiển thị **Đã kết nối**).
2. Trạng thái lệnh công việc là **Hoàn thành**.
3. Thiết bị thuộc một nhóm có tài khoản khách hàng hiển thị **Đã liên kết để xuất hóa đơn**.
4. Bạn là Chủ sở hữu/Quản trị viên hoặc đã được cấp quyền truy cập QuickBooks trên trang Thành viên.

## Bài viết liên quan

- [Kết nối QuickBooks](./connect-quickbooks)
- [Liên kết nhóm với khách hàng QuickBooks](./map-teams-to-qb-customers)
- [Hoàn thành danh mục kiểm tra PM](../technician-field-work/pm-checklist)
