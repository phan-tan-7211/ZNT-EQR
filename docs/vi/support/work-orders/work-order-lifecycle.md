---
title: "Tham khảo vòng đời lệnh công việc"
description: "Toàn bộ luồng trạng thái và ai được phép chuyển lệnh công việc giữa từng trạng thái."
lastReviewed: 2026-07-04
personas: ["manager","admin","owner","technician"]
---

**Dành cho:** Quản lý, Quản trị viên, Chủ sở hữu, Kỹ thuật viên  
**Rà soát lần cuối:** 2026-07-04
Mọi lệnh công việc đều đi qua cùng một vòng đời. Trang chi tiết chỉ hiển thị các nút chuyển sang trạng thái tiếp theo hợp lệ, vì vậy các quy tắc phân quyền dưới đây được áp dụng ở cả giao diện lẫn cơ sở dữ liệu.

## 1. Luồng trạng thái

- **Đã gửi** — đã tạo, chưa được xem xét.
- **Đã chấp nhận** — đã được xem xét và phê duyệt để lên lịch.
- **Đã giao** — đã giao cho một kỹ thuật viên hoặc nhóm cụ thể.
- **Đang thực hiện** — công việc đã bắt đầu.
- **Tạm dừng** — đang tạm ngưng (chờ linh kiện, khách hàng hoặc quyền tiếp cận).
- **Hoàn thành** — công việc đã xong và được ghi nhận đầy đủ.
- **Đã hủy** — trạng thái kết thúc khi công việc không còn cần thiết.

## 2. Ai được thay đổi gì

| Chuyển trạng thái | Vai trò được phép |
| --- | --- |
| Đã gửi → Đã chấp nhận | Quản lý, Quản trị viên, Chủ sở hữu |
| Đã chấp nhận → Đã giao | Quản lý, Quản trị viên, Chủ sở hữu |
| Đã giao → Đang thực hiện | Quản lý trở lên hoặc Kỹ thuật viên được giao |
| Đang thực hiện → Hoàn thành | Quản lý trở lên hoặc Kỹ thuật viên được giao |
| Bất kỳ → Tạm dừng | Quản lý trở lên hoặc Kỹ thuật viên được giao |
| Bất kỳ → Đã hủy | Quản lý, Quản trị viên, Chủ sở hữu |

## 3. Đã hủy so với Hoàn thành

Hoàn thành tự động ghi nhận ngày kết thúc, là dữ liệu phục vụ báo cáo và việc tính toán quá hạn. Đã hủy là trạng thái kết thúc, giữ lệnh công việc trong lịch sử nhưng không tính là công việc đã hoàn tất.

## 4. Vị trí thiết bị trên trang chi tiết lệnh công việc

Khi lệnh công việc liên kết với thiết bị, trang chi tiết nhúng cùng danh sách thả xuống nguồn vị trí và bản đồ thu nhỏ được dùng trên hồ sơ thiết bị. Người điều phối có thể xem trước các nguồn hiệu lực, nhóm, thiết bị và lần quét trước khi cử kỹ thuật viên đi.

![Bản đồ vị trí của lệnh công việc](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/09-work-order-location-map.png)

Trên di động, mở rộng **Chi tiết thiết bị** để hiện bản đồ. Xem [Nguồn vị trí thiết bị và bản đồ](../equipment-qr/location-sources-and-maps).

## Bài viết liên quan

- [Giao lệnh công việc](./assign-work-order)
- [Phân loại các yêu cầu công việc đã gửi](./triage-submitted-requests)
- [Nguồn vị trí thiết bị và bản đồ](../equipment-qr/location-sources-and-maps)
