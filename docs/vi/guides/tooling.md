---
title: Quản lý dụng cụ công nghệ
description: Quản lý jig, đồ gá, khuôn và khuôn dập trong ZNTEQR - tương thích, cấp phát và thu hồi, tuổi thọ dụng cụ, kiểm tra và phiên bản bản vẽ.
---

# Quản lý dụng cụ công nghệ

Trang **Dụng cụ công nghệ** quản lý dụng cụ sản xuất và kiểm tra: jig, đồ gá, khuôn, khuôn dập, đồ gá kiểm tra và dụng cụ chung. Mở trang này từ **Thiết bị → Dụng cụ công nghệ** trên thanh bên.

Mỗi dụng cụ là một bản ghi thiết bị thuộc nhóm thiết bị **TL**. Dụng cụ vẫn có mã quản lý (ví dụ `EQ-TL-000001`), mã QR, ảnh và lệnh công việc như mọi thiết bị khác. Phần dụng cụ công nghệ bổ sung thêm tính tương thích, cấp phát và thu hồi, tuổi thọ dụng cụ và kiểm tra.

::: info
ZNTEQR hỗ trợ các thực hành quản lý dụng cụ theo IATF 16949. Việc sử dụng mô-đun này tự nó không chứng nhận sự tuân thủ.
:::

## Đăng ký dụng cụ

Chủ sở hữu và quản trị viên có thể đăng ký dụng cụ.

1. Mở **Dụng cụ công nghệ** và chọn **Đăng ký dụng cụ**.
2. Chọn **Tài sản TL mới** để tạo bản ghi thiết bị mới, hoặc **Đưa thiết bị TL hiện có vào quản lý** để chuyển một tài sản TL hiện có thành dụng cụ.
3. Điền loại, quyền sở hữu, vị trí lưu trữ, người phụ trách và thông tin bản vẽ.
4. Đặt đơn vị sử dụng (chu kỳ, lần ép, hành trình hoặc sản phẩm) và, nếu đã biết, giới hạn cảnh báo, giới hạn tuổi thọ, chu kỳ bảo dưỡng và chu kỳ kiểm tra.
5. Tắt **Cần máy** đối với dụng cụ thao tác bằng tay.

Dụng cụ mới bắt đầu ở trạng thái **Chờ phê duyệt**. Chủ sở hữu hoặc quản trị viên phải chọn **Phê duyệt sử dụng** trên thẻ Tổng quan thì dụng cụ mới có thể được cấp phát.

## Sản phẩm, công đoạn và tương thích

Dùng các thẻ **Sản phẩm**, **Công đoạn** và **Thiết kế** trên trang Dụng cụ công nghệ để duy trì các danh mục.

Trên thẻ **Tương thích** của dụng cụ, hãy thêm quy tắc liên kết dụng cụ với một sản phẩm, một công đoạn (không bắt buộc) và một hoặc nhiều máy. Chọn **Không máy (thủ công)** đối với dụng cụ thao tác bằng tay.

- Quy tắc mới bắt đầu ở trạng thái **Chờ phê duyệt**. Chủ sở hữu hoặc quản trị viên sẽ phê duyệt, từ chối hoặc ngừng kích hoạt từng quy tắc.
- Quy tắc cho biết dụng cụ **được phép** sử dụng ở đâu. Quy tắc không bao giờ gán dụng cụ cho một máy.

## Cấp phát và thu hồi

Quét mã QR của dụng cụ. Trên trang thiết bị, chọn **Cấp phát / Thu hồi** trong dải thông tin dụng cụ, hoặc mở thẻ **Cấp phát / Thu hồi** của dụng cụ.

- **Cấp phát dụng cụ** ghi lại người nhận, bối cảnh sản phẩm / công đoạn / máy (không bắt buộc), vị trí và tình trạng.
- Khi bạn nhập bối cảnh sản xuất, ZNTEQR sẽ đối chiếu với các quy tắc tương thích đã được phê duyệt và đang hoạt động.
- Mỗi dụng cụ chỉ có thể được cấp phát một lần tại một thời điểm.
- Không thể cấp phát dụng cụ khi dụng cụ chưa được phê duyệt, không sẵn sàng, bị hư hỏng, đã vượt giới hạn tuổi thọ hoặc quá hạn kiểm tra.
- **Thu hồi dụng cụ** ghi lại tình trạng, vị trí và mức sử dụng (không bắt buộc). Dụng cụ được thu hồi với tình trạng **Hư hỏng** sẽ tự động bị cách ly.

## Tuổi thọ dụng cụ

Thẻ **Sử dụng & Tuổi thọ** hiển thị mức sử dụng tích lũy, tuổi thọ còn lại và mức sử dụng kể từ lần bảo dưỡng gần nhất.

- Ghi nhận mức sử dụng bất cứ lúc nào, hoặc nhập khi thu hồi dụng cụ.
- Khi mức sử dụng đạt giới hạn cảnh báo, chủ sở hữu, quản trị viên và người phụ trách sẽ nhận được thông báo.
- Khi mức sử dụng đạt giới hạn tuổi thọ, dụng cụ không thể được cấp phát lại cho đến khi chủ sở hữu hoặc quản trị viên ghi nhận một **quyết định xử lý**: gia hạn giới hạn tuổi thọ hoặc ngừng sử dụng dụng cụ.
- Việc điều chỉnh mức sử dụng cần do chủ sở hữu hoặc quản trị viên thực hiện và phải có lý do. Mức sử dụng trọn đời không bao giờ bị đặt lại khi bảo dưỡng.

## Bảo dưỡng, sửa chữa và kiểm tra

Thẻ **PM / Sửa chữa / Kiểm tra** liệt kê các lệnh công việc và lần kiểm tra của dụng cụ.

- Tạo lệnh công việc sửa chữa hoặc bảo trì định kỳ (PM) bằng **Tạo lệnh công việc**. Đây là các lệnh công việc thông thường trên bản ghi thiết bị của dụng cụ.
- Chủ sở hữu và quản trị viên có thể chuyển dụng cụ đi sửa chữa, đánh dấu chờ kiểm tra, khóa hoặc ngừng sử dụng dụng cụ.
- **Ghi nhận kiểm tra** lưu lại kết quả. Đánh dấu **Đã hoàn thành bảo dưỡng** chỉ đặt lại bộ đếm kể từ lần bảo dưỡng.
- Chỉ chủ sở hữu hoặc quản trị viên mới có thể đánh dấu **Phê duyệt đưa trở lại sử dụng**, và chỉ khi kết quả đạt. Đây là cách duy nhất để dụng cụ trở về trạng thái **Sẵn sàng** sau khi bị cách ly hoặc sửa chữa.

## Phiên bản bản vẽ

Thẻ **Tài liệu & Phiên bản** lưu sổ theo dõi phiên bản bản vẽ của dụng cụ. Chủ sở hữu và quản trị viên chọn **Ban hành phiên bản mới**, nhập phiên bản và mô tả thay đổi, khi đó phiên bản trước chuyển sang **Đã bị thay thế**.

## Báo cáo, nhập dữ liệu và nhãn

Từ trang Dụng cụ công nghệ, bạn có thể:

- Xuất sổ đăng ký dụng cụ hoặc báo cáo dụng cụ của khách hàng ra CSV, Excel hoặc PDF.
- Xuất toàn bộ lịch sử của một dụng cụ từ trang của dụng cụ đó.
- Nhập dụng cụ, sản phẩm và công đoạn từ mẫu Excel hoặc CSV.
- In nhãn QR cho nhiều dụng cụ cùng lúc.

## Lịch sử và kiểm toán

Thẻ **Lịch sử / Kiểm toán** liệt kê mọi sự kiện liên quan đến dụng cụ. Các sự kiện này cũng được ghi vào nhật ký kiểm toán của tổ chức (dành cho chủ sở hữu và quản trị viên).

Xem [Vai trò và quyền hạn](/vi/guides/permissions#tooling-management) để biết ai có thể làm gì.
