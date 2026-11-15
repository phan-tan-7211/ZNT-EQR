---
title: "Nguồn vị trí thiết bị và bản đồ"
description: "Tìm hiểu về vị trí hiệu lực, vị trí dự phòng theo nhóm, ghi đè ở cấp thiết bị, GPS khi quét, bộ lọc trên Bản đồ thiết bị, chỉnh sửa địa chỉ tại chỗ và lấy vị trí trực tiếp."
lastReviewed: 2026-07-04
personas: ["admin","owner","manager","technician"]
---

**Dành cho:** Quản trị viên, Chủ sở hữu, Quản lý, Kỹ thuật viên  
**Xem xét lần cuối:** 2026-07-04

ZNTEQR xác định ghim của thiết bị từ nhiều nguồn. Bạn có thể xem trước từng nguồn trên bản đồ ở trang chi tiết thiết bị, trên Bản đồ thiết bị và trên trang chi tiết lệnh công việc mà không làm thay đổi hồ sơ gốc cho đến khi bạn lưu một giá trị ghi đè.

## Thứ tự xác định vị trí hiệu lực

1. **GPS của lần quét gần nhất** — khi tính năng thu thập vị trí lúc quét QR được bật và một lần quét gần đây đã ghi nhận tọa độ.
2. **Địa chỉ được gán cho thiết bị** — địa chỉ đường phố hoặc ghim bản đồ đã lưu trên hồ sơ thiết bị.
3. **Văn bản vị trí cũ** — các giá trị vị trí dạng văn bản tự do trước đây, kèm tọa độ nếu có.
4. **Vị trí nhóm** — chỉ khi nhóm đã bật **Ghi đè vị trí thiết bị** và thiết bị vẫn chọn dùng vị trí dự phòng theo nhóm.

Nguồn **Vị trí hiệu lực** hiển thị nguồn được ưu tiên trong chuỗi trên. Các nguồn khác trong danh sách thả xuống ở tiêu đề cho phép bạn so sánh trụ sở nhóm, địa chỉ thiết bị và lần quét gần nhất cạnh nhau.

## Bộ lọc nguồn trên Bản đồ thiết bị

Dùng **Nguồn vị trí** trên Bản đồ thiết bị để tô màu và lọc các điểm đánh dấu theo đúng các nhãn nguồn mà bạn thấy trên trang chi tiết thiết bị.

![Bộ lọc nguồn vị trí trên Bản đồ thiết bị](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/01-fleet-map-source-filter.png)

## Thẻ bản đồ trên trang chi tiết thiết bị

Tiêu đề của thẻ vị trí là một danh sách thả xuống. Chọn **Vị trí hiệu lực**, **Vị trí nhóm**, **Vị trí thiết bị** hoặc **Vị trí quét gần nhất** để thay đổi nội dung mà bản đồ thu nhỏ và dòng địa chỉ hiển thị.

![Danh sách thả xuống nguồn vị trí trên trang chi tiết thiết bị](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/02-equipment-detail-location-source.png)

### Thao tác với địa chỉ tại chỗ

Di chuột lên dòng địa chỉ (trên di động luôn hiển thị) để thấy:

- **Bút chì** — nhập hoặc tìm địa chỉ đường phố bằng Google Places.
- **Biểu tượng điều hướng** — mở tính năng lấy vị trí trực tiếp từ GPS của thiết bị đang dùng.

![Thao tác với địa chỉ thiết bị tại chỗ](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/03-equipment-inline-address-actions.png)

### Lấy vị trí trực tiếp

Tính năng lấy vị trí trực tiếp mở ra bản đồ có ghim ở chính giữa. Kéo bản đồ để điều chỉnh, sau đó xác nhận. Trường hợp chỉ lưu tọa độ (không có địa chỉ đường phố) vẫn được ghi nhận là vị trí được gán cho thiết bị và sẽ tắt vị trí dự phòng theo nhóm.

![Hộp thoại lấy vị trí trực tiếp](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/04-live-location-modal.png)

### Vị trí dự phòng theo nhóm

Khi một nhóm ghi đè vị trí thiết bị, hãy chuyển danh sách thả xuống ở tiêu đề sang **Vị trí nhóm** để xem trước ghim trụ sở nhóm mà không xóa địa chỉ riêng đã lưu của thiết bị.

![Xem trước vị trí dự phòng theo nhóm](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/05-equipment-team-location-fallback.png)

## Bản đồ nhúng trong lệnh công việc

Lệnh công việc có liên kết thiết bị sẽ hiển thị cùng danh sách thả xuống nguồn vị trí và bản đồ thu nhỏ trên máy tính. Trên di động, mở rộng **Chi tiết thiết bị** để thấy các điều khiển bản đồ.

![Bản đồ vị trí trong lệnh công việc](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/09-work-order-location-map.png)

## Chế độ xem hiện trường trên di động

Trang chi tiết thiết bị trên di động giờ đã có cùng thẻ vị trí nằm bên dưới tiêu đề. Kỹ thuật viên có thể đổi nguồn, chỉnh sửa tại chỗ và lấy vị trí GPS trực tiếp ngay tại hiện trường.

![Nguồn vị trí thiết bị trên di động](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/mobile/01-equipment-detail-location-source.png)

![Thao tác với địa chỉ tại chỗ trên di động](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/mobile/02-equipment-inline-address-actions.png)

## Video hướng dẫn trên máy tính

https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/demo.mp4

## Video hướng dẫn trên di động

https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/mobile/demo.mp4

## Bài viết liên quan

- [Sử dụng bản đồ thiết bị](./fleet-map-basics)
- [Thêm một thiết bị](./add-equipment)
- [Câu hỏi thường gặp về nhóm và vai trò](../teams-roles/multi-team-questions)
- [Tham chiếu vòng đời lệnh công việc](../work-orders/work-order-lifecycle)
- [Vị trí lưu trữ kho vật tư](../inventory-parts/inventory-storage-locations)
