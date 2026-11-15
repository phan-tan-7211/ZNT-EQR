---
title: "Sử dụng nhật ký kiểm toán"
description: "Quản trị viên và Chủ sở hữu có thể xem ai đã làm gì và khi nào — hữu ích cho việc điều tra và làm bằng chứng tuân thủ."
lastReviewed: 2026-07-06
personas: ["admin","owner"]
requirement: "Phải là Chủ sở hữu hoặc Quản trị viên của tổ chức."
---

**Dành cho:** Quản trị viên, Chủ sở hữu  
**Rà soát lần cuối:** 2026-07-06

::: info Yêu cầu
Phải là Chủ sở hữu hoặc Quản trị viên của tổ chức. Nhật ký kiểm toán chứa thông tin nhạy cảm, có đặc quyền cao và không hiển thị với bất kỳ vai trò nào khác — cả trong ứng dụng lẫn ở cấp cơ sở dữ liệu.
:::

## 1. Mở Nhật ký kiểm toán trong phần cài đặt tổ chức

Vào **Tổ chức → Nhật ký kiểm toán**. Nhật ký kiểm toán được chủ ý đặt bên trong phần cài đặt tổ chức thay vì trong thanh điều hướng chính: khi bạn đang xem nhật ký, bạn đang xem toàn bộ lịch sử thay đổi của đúng một tổ chức.

Các dấu trang cũ trỏ đến vị trí trước đây trên thanh bên sẽ tự động chuyển hướng.

## 2. Lọc chế độ xem

Lọc theo loại đối tượng, hành động, người thực hiện hoặc khoảng thời gian, và dùng biểu đồ dòng thời gian để phóng to vào một khoảng hoạt động. Dùng bộ lọc để thu hẹp vào một sự cố cụ thể hoặc để tập hợp bằng chứng tuân thủ.

Các trang chi tiết (lệnh công việc, vật tư trong kho) liên kết thẳng đến nhật ký kiểm toán đã được lọc sẵn theo bản ghi đó, nhờ vậy bạn không bao giờ lẫn dữ liệu kiểm toán với dòng thời gian vận hành.

## 3. Mở một sự kiện để xem chi tiết

Nhấp vào bất kỳ hàng nào để xem toàn bộ nội dung sự kiện, bao gồm ai đã thực hiện, những gì đã thay đổi và bản ghi liên quan.

## 4. Xuất bằng chứng kiểm toán

Dùng menu tải xuống để xuất chế độ xem đã lọc dưới dạng CSV hoặc JSON. Việc xuất nhật ký kiểm toán đi theo một luồng riêng — các mục kiểm toán không bao giờ được đưa vào dữ liệu xuất của lệnh công việc, báo cáo hay các loại dữ liệu khác. Mỗi lần xuất đều gửi thông báo đến các quản trị viên của tổ chức.

::: tip Lưu ý
Sự kiện kiểm toán là bất biến sau khi đã được ghi. Bạn không thể xóa hoặc chỉnh sửa một mục, và chính điều đó khiến nhật ký có giá trị làm bằng chứng.
:::

## Bài viết liên quan

- [Bảng điều khiển DSR dành cho người phụ trách quyền riêng tư](./dsr-cockpit-overview)
