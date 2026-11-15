---
title: "Vị trí lưu kho vật tư"
description: "Phân biệt tên gọi tắt Tên vị trí với địa chỉ lưu kho có cấu trúc, vị trí mặc định của tổ chức, địa chỉ ghi đè của từng linh kiện và chỉ đường từ bản đồ."
lastReviewed: 2026-07-04
personas: ["admin","owner","manager"]
requirement: "Phải là Chủ sở hữu, Quản trị viên hoặc Người quản lý phụ tùng được chỉ định để chỉnh sửa địa chỉ lưu kho."
---

**Dành cho:** Quản trị viên, Chủ sở hữu, Quản lý  
**Rà soát lần cuối:** 2026-07-04

::: info Yêu cầu
Phải là Chủ sở hữu, Quản trị viên hoặc Người quản lý phụ tùng được chỉ định để chỉnh sửa địa chỉ lưu kho.
:::

Vật tư trong kho có hai khái niệm vị trí khác nhau:

| Trường | Mục đích |
| --- | --- |
| **Tên vị trí** trên biểu mẫu vật tư | Tên gọi tắt dễ nhớ như "Kệ A-3" hoặc "Xe 4". Không dùng để đặt ghim trên bản đồ. |
| **Địa chỉ lưu kho** | Địa chỉ đường phố có cấu trúc hoặc tọa độ bản đồ, dùng cho bản đồ, việc kế thừa và chỉ đường trên Google Maps. |

## Vị trí mặc định của tổ chức

Chủ sở hữu và Quản trị viên đặt vị trí mặc định cho toàn tổ chức tại **Tổ chức → Cài đặt → Vị trí mặc định cho vật tư**. Mọi linh kiện đều kế thừa địa chỉ đó cho đến khi linh kiện lưu địa chỉ ghi đè của riêng mình.

![Vị trí mặc định cho vật tư của tổ chức](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/07-organization-inventory-default.png)

Vị trí mặc định hỗ trợ tìm kiếm Places, điều chỉnh bản đồ bằng ghim ở giữa và **Dùng vị trí hiện tại**, giống như vị trí của nhóm.

## Địa chỉ ghi đè của từng linh kiện

Mở trang chi tiết của một vật tư. Khối **Địa chỉ lưu kho** cho biết linh kiện đang kế thừa vị trí mặc định của tổ chức hay dùng các trường có cấu trúc của riêng nó. Chọn **Ghi đè địa chỉ** để đặt tọa độ riêng cho linh kiện; **Sửa địa chỉ vật tư** dùng để cập nhật địa chỉ ghi đè đã có.

![Vị trí lưu kho thực tế của vật tư](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/06-inventory-item-effective-location.png)

## Bản đồ và chỉ đường

Khi có tọa độ, trang chi tiết hiển thị một bản đồ thu nhỏ chỉ để xem. Chạm vào bản đồ hoặc địa chỉ để mở chỉ đường trên Google Maps — hữu ích khi kỹ thuật viên cần tìm đến kho hoặc khu lưu trữ ngoài bãi chứ không chỉ là một nhãn kệ.

![Bản đồ và chỉ đường đến vật tư trên di động](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/mobile/04-inventory-item-map-directions.png)

## Mã QR không thay đổi vị trí

Việc quét mã QR của vật tư chỉ điều chỉnh số lượng hoặc ngữ cảnh tra cứu. Thao tác này không bao giờ ghi vào các trường địa chỉ lưu kho.

## Bài viết liên quan

- [Thêm vật tư vào kho](./add-inventory-item)
- [Tham quan phần cài đặt tổ chức](../admin-integrations/organization-settings)
- [Nguồn vị trí thiết bị và bản đồ](../equipment-qr/location-sources-and-maps)
