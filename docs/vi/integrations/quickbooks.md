# QuickBooks Online

Tích hợp QuickBooks đẩy các lệnh công việc đã hoàn thành sang QuickBooks Online dưới dạng **hóa đơn nháp**. Bạn vẫn xem lại và gửi từng hóa đơn từ QuickBooks, nên bạn luôn kiểm soát được việc lập hóa đơn cho khách hàng.

Chủ sở hữu và quản trị viên của tổ chức kết nối công ty, liên kết các nhóm khách hàng với khách hàng trong QuickBooks và xuất các lệnh công việc đã hoàn thành dưới dạng hóa đơn nháp.

Hướng dẫn từng bước nằm trong Trung tâm trợ giúp:

- [Kết nối QuickBooks](/vi/support/admin-integrations/connect-quickbooks)
- [Liên kết nhóm với khách hàng QuickBooks](/vi/support/admin-integrations/map-teams-to-qb-customers)
- [Xuất lệnh công việc sang QuickBooks](/vi/support/admin-integrations/export-work-order-to-qb)

## Kết nối

Từ thanh bên, mở **Tích hợp** (hoặc Tổ chức → Tích hợp). Nhấp **Kết nối với QuickBooks Online**, đăng nhập vào công ty trên QuickBooks và cấp các quyền được yêu cầu. ZNTEQR đọc dữ liệu khách hàng, mặt hàng, hóa đơn và thanh toán. ZNTEQR ghi hóa đơn nháp và có thể tạo các mặt hàng sản phẩm/dịch vụ còn thiếu được dùng trong các hóa đơn nháp đó. ZNTEQR không đụng đến bảng lương hay ngân hàng.

Bạn sẽ quay lại thẻ Tích hợp với huy hiệu **Đã kết nối**. Thẻ này cũng có nút **Ngắt kết nối**.

Refresh token của QuickBooks có hiệu lực khoảng 100 ngày. ZNTEQR tự động làm mới các access token ngắn hạn ở chế độ nền. Nếu chỉ báo tình trạng kết nối trên thanh trên cùng chuyển sang màu đỏ, hãy kết nối lại từ trang này.

## Liên kết nhóm với khách hàng

Để xuất hóa đơn, nhóm cần được gắn với một khách hàng QuickBooks. Mở nhóm khách hàng, tìm thẻ **Tài khoản khách hàng** và liên kết với một khách hàng QuickBooks. Các nhóm đã được liên kết sẽ hiển thị huy hiệu **QuickBooks đã đồng bộ** trong danh sách Nhóm.

## Xuất hóa đơn nháp

Trên một lệnh công việc **đã hoàn thành**, dùng **Xuất → QuickBooks**. Yêu cầu:

- Thiết bị của lệnh công việc thuộc về một nhóm
- Nhóm đó đã được liên kết với một khách hàng QuickBooks
- Bạn có quyền quản lý QuickBooks (chủ sở hữu, quản trị viên hoặc thành viên được cấp quyền)

Hóa đơn nháp được xuất bao gồm các dòng thanh toán tóm tắt từ chi phí lệnh công việc trong ZNTEQR. ZNTEQR vẫn là nguồn dữ liệu gốc cho chi tiết từng khoản về vật tư và nhân công.

- **Labor (nhân công).** Nhân công tính phí lấy từ các dòng chi phí của lệnh công việc.
- **Parts (linh kiện).** Một dòng tóm tắt không thuộc kho cho các chi phí khác của lệnh công việc.

**Private Note** trên hóa đơn QuickBooks vẫn chứa ID lệnh công việc ZNTEQR, các ngày liên quan, ghi chú riêng tư và bảng chi phí chi tiết đầy đủ. **Customer Memo** chứa dòng thời gian và phần tóm tắt cách xử lý.

## Liên quan

- [Kết nối QuickBooks](/vi/support/admin-integrations/connect-quickbooks)
- [Liên kết nhóm với khách hàng QuickBooks](/vi/support/admin-integrations/map-teams-to-qb-customers)
- [Xuất lệnh công việc sang QuickBooks](/vi/support/admin-integrations/export-work-order-to-qb)
