---
title: "Quét mã QR thiết bị bằng điện thoại"
description: "Dùng ứng dụng camera có sẵn trên điện thoại để mở hồ sơ thiết bị trong ZNTEQR với đúng tổ chức đã được chọn sẵn."
lastReviewed: 2026-07-06
personas: ["technician","requestor"]
---

**Dành cho:** Kỹ thuật viên, Người yêu cầu  
**Rà soát lần cuối:** 2026-07-06
Mã QR của ZNTEQR chỉ là URL thông thường — không cần cài thêm ứng dụng nào. Camera điện thoại sẽ mở hồ sơ trực tiếp trong trình duyệt hoặc trong ứng dụng ZNTEQR nếu đã cài đặt.

![Hồ sơ thiết bị được mở từ một lần quét QR](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/01-scan-qr-landing.png)

![Hồ sơ thiết bị trên di động sau khi quét mã QR](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/mobile/01-mobile-scan-qr-landing.png)

## 1. Mở ứng dụng camera

Giữ điện thoại cách mã QR khoảng một gang tay. iOS và Android tự động nhận diện mã QR — không cần trình quét của bên thứ ba.

## 2. Chạm vào biểu ngữ thông báo

Camera hiển thị một liên kết có dạng `https://eqr.zinitek.com/qr/equipment/<id>`. Chạm vào đó để mở hồ sơ thiết bị.

## 3. Đăng nhập nếu được yêu cầu

Nếu bạn chưa đăng nhập, ZNTEQR sẽ yêu cầu bạn đăng nhập trước. Sau khi xác thực, ứng dụng đưa bạn trở lại thiết bị vừa quét.

::: tip Lưu ý
Nếu bạn thuộc nhiều tổ chức, ZNTEQR tự động chuyển bạn sang tổ chức sở hữu thiết bị vừa quét.
:::

## 4. Kiểm tra phần tiêu đề thiết bị

Trước khi thao tác, hãy kiểm tra tên thiết bị, hãng/model và số sê-ri có khớp với chiếc máy bạn đang đứng trước hay không.

## Bài viết liên quan

- [Tạo lệnh công việc từ thiết bị](./create-work-order-from-equipment)
- [Gửi yêu cầu công việc với vai trò Người yêu cầu](../work-orders/submit-request-as-requestor)
