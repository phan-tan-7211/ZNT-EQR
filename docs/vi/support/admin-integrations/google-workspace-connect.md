---
title: "Kết nối Google Workspace"
description: "Dùng danh bạ Google Workspace của bạn để đồng bộ người dùng, nhóm và các quyền kiểm soát quản trị vào ZNTEQR."
lastReviewed: 2026-06-13
personas: ["admin","owner"]
requirement: "Phải là quản trị viên cấp cao (super-admin) Google Workspace của miền và là Chủ sở hữu hoặc Quản trị viên của tổ chức trên ZNTEQR."
---

**Dành cho:** Quản trị viên, Chủ sở hữu\
**Xem xét lần cuối:** 2026-06-13

::: info Yêu cầu
Phải là quản trị viên cấp cao (super-admin) Google Workspace của miền và là Chủ sở hữu hoặc Quản trị viên của tổ chức trên ZNTEQR.
:::

## Kết nối Google Workspace

1. Mở **Tổng quan → Tổ chức → Tích hợp** (hoặc **Tổng quan → Thiết lập → Không gian làm việc** khi thiết lập lần đầu).
2. Nhấp vào **Kết nối Google Workspace** và đăng nhập bằng tài khoản quản trị viên Google Workspace.
3. Phê duyệt các phạm vi quyền **danh bạ** trên màn hình đồng ý của Google. Trước tiên ZNTEQR yêu cầu thông tin danh tính cùng với `admin.directory.user.readonly` để việc nhập thành viên và đồng bộ danh bạ có thể bắt đầu ngay sau khi thiết lập.
4. Khi bạn cấu hình đích xuất Google Drive hoặc nhấp vào **Hoàn tất cấp quyền** trên trang Tích hợp, ZNTEQR yêu cầu các phạm vi quyền Drive, Docs và Sheets **đúng theo ngữ cảnh** bằng cơ chế cấp quyền tăng dần (`include_granted_scopes=true`).

## Hoàn tất cấp quyền (phạm vi quyền xuất)

Nếu Google Workspace hiển thị **Cần cấp quyền**, nghĩa là đồng bộ danh bạ đã được kết nối nhưng vẫn còn thiếu các phạm vi quyền xuất. Nhấp vào **Hoàn tất cấp quyền** để cấp quyền Drive, Docs và Sheets mà không phải lặp lại bước đồng ý cho danh bạ.

## Đồng bộ và nhập thành viên

Sau khi kết nối, hãy dùng **Đồng bộ danh bạ** trên trang Tích hợp hoặc trang thiết lập không gian làm việc, rồi chọn những người dùng cần nhập vào ZNTEQR.

## Ngắt kết nối Google Workspace

Chủ sở hữu và quản trị viên của tổ chức có thể **Ngắt kết nối** Google Workspace từ trang Tích hợp hoặc trang thiết lập không gian làm việc. Khi ngắt kết nối:

- Quyền truy cập Google OAuth của ZNTEQR bị thu hồi
- Bản chụp danh bạ Workspace đã lưu trong bộ nhớ đệm bị xóa
- **Quyền xác nhận miền của không gian làm việc được giải phóng** để quá trình thiết lập có thể bắt đầu lại từ đầu

Các thành viên của tổ chức và dữ liệu ZNTEQR vẫn được giữ nguyên. Sau khi ngắt kết nối, hãy quay lại **Thiết lập không gian làm việc** và kết nối lại khi bạn sẵn sàng.

::: tip Lưu ý
Đồng bộ Workspace là tùy chọn — bạn vẫn có thể tiếp tục mời người dùng thủ công và phần còn lại của ZNTEQR hoạt động y như cũ.
:::
