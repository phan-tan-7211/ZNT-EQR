---
title: "Bảng điều khiển DSR dành cho người phụ trách quyền riêng tư"
description: "Nơi Quản trị viên và Chủ sở hữu xử lý các yêu cầu của chủ thể dữ liệu qua các bước xác minh, gia hạn, hoàn tất hoặc từ chối."
lastReviewed: 2026-07-19
personas: ["admin","owner"]
requirement: "Bảng điều khiển DSR chỉ dành cho Chủ sở hữu và Quản trị viên của tổ chức."
---

**Dành cho:** Quản trị viên, Chủ sở hữu  
**Rà soát lần cuối:** 2026-07-19

::: info Yêu cầu
Bảng điều khiển DSR chỉ dành cho Chủ sở hữu và Quản trị viên của tổ chức.
:::

## 1. Mở Bảng điều khiển DSR

Mở **Pháp lý** ở chân trang và chọn **Bảng điều khiển DSR**, hoặc vào **Cài đặt → Quyền riêng tư** và nhấp **Bảng điều khiển yêu cầu dữ liệu**. Hàng đợi hiển thị mọi yêu cầu đang mở cần được xử lý.

## 2. Mở một hồ sơ

Nhấp vào một hàng để mở hồ sơ tương ứng. Dòng thời gian hiển thị mọi thay đổi trạng thái, mọi lần thử xuất bằng chứng và mọi thông báo đã gửi cho người tiêu dùng.

## 3. Thực hiện hành động tiếp theo

- **Xác minh** — xác nhận người yêu cầu là chủ sở hữu của dữ liệu.
- **Gia hạn** — gia hạn thời hạn đến mức tối đa theo luật định.
- **Từ chối** — đóng hồ sơ kèm lý do được ghi nhận.
- **Hoàn tất** — đánh dấu đã đáp ứng sau khi dữ liệu đã được cung cấp, chỉnh sửa hoặc xóa.
- **Yêu cầu xuất / Thử xuất lại** — tạo gói bằng chứng.
- **Gửi lại thông báo** — gửi lại thông báo cho người tiêu dùng.

## 4. Người không phải quản trị viên sẽ nhận lỗi 404 hoặc 403

Thành viên không bao giờ thấy đường dẫn đến bảng điều khiển DSR. Các yêu cầu giữa các tổ chức khác nhau trả về 404 để tránh làm lộ việc một tổ chức khác có nhận được yêu cầu hay không.

## Bài viết liên quan

- [Gửi yêu cầu về quyền riêng tư](./submit-privacy-request)
- [Sử dụng nhật ký kiểm toán](./audit-log-basics)
