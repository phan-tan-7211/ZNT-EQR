# Vai trò và quyền hạn

ZNTEQR có hai lớp vai trò: vai trò trong tổ chức (Chủ sở hữu, Quản trị viên, Thành viên) và vai trò trong nhóm (Quản lý, Kỹ thuật viên, Người yêu cầu, Người xem). Để biết ai nên giữ vai trò nào, hãy xem [Nhóm và vai trò](/vi/support/teams-roles/) trong Trung tâm trợ giúp.

## Ma trận quyền

### Quản lý tổ chức

| Thao tác | Chủ sở hữu | Quản trị viên | Thành viên | Quản lý | Kỹ thuật viên | Người yêu cầu | Người xem |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Tạo tổ chức | ❌* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cập nhật cài đặt tổ chức | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xóa tổ chức | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xem thông tin tổ chức | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chuyển đổi tổ chức | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

\*Tổ chức mới do quản trị viên nền tảng tạo (Quản trị nền tảng), không phải do các vai trò trong tổ chức tạo.

> Các chức năng thanh toán đã được gỡ khỏi ZNTEQR vào tháng 1 năm 2025; không còn
> giao diện thanh toán nào cần phân quyền. Các bảng thanh toán cũ
> (`billing_events`, `organization_subscriptions`, v.v.) chỉ được giữ lại để
> phục vụ kiểm toán và không hiển thị trên giao diện.

### Quản lý thành viên

| Thao tác | Chủ sở hữu | Quản trị viên | Thành viên | Quản lý | Kỹ thuật viên | Người yêu cầu | Người xem |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Mời thành viên | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xóa thành viên | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Thay đổi vai trò thành viên | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xem danh sách thành viên | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gửi lại lời mời | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

\*Chủ sở hữu và quản trị viên có thể thay đổi các vai trò không phải chủ sở hữu. Vai trò chủ sở hữu chỉ thay đổi thông qua việc chuyển quyền sở hữu.

Vai trò Người xem và Người yêu cầu ở cấp tổ chức có cùng quyền trong tổ chức như Thành viên; quyền truy cập thiết bị và lệnh công việc đến từ vai trò trong nhóm.

### Quản lý nhóm

| Thao tác | Chủ sở hữu | Quản trị viên | Thành viên | Quản lý | Kỹ thuật viên | Người yêu cầu | Người xem |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Tạo nhóm | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xóa nhóm | ✅ | ✅ | ❌ | ⚙️ | ⚙️ | ⚙️ | ⚙️ |
| Cập nhật cài đặt nhóm | ✅ | ✅ | ❌ | ✅**** | ❌ | ❌ | ❌ |
| Thêm thành viên nhóm | ✅ | ✅ | ❌ | ✅**** | ❌ | ❌ | ❌ |
| Xóa thành viên nhóm | ✅ | ✅ | ❌ | ✅**** | ❌ | ❌ | ❌ |
| Xem nhóm | ✅ | ✅ | ❌** | ✅** | ✅** | ✅** | ✅** |
| Phân công lệnh công việc | ✅ | ✅ | ❌ | ✅*** | ❌ | ❌ | ❌ |

\*\*Người không phải quản trị viên chỉ thấy các nhóm mà họ tham gia.

\*\*\*Chỉ từ danh sách lệnh công việc, đối với các nhóm mà người dùng là quản lý.

\*\*\*\*Chỉ đối với các nhóm mà người dùng là quản lý (mặc định); quản lý nhóm không thể cấp hoặc thay đổi vai trò chủ sở hữu nhóm, cũng không thể thêm người ngoài tổ chức.

⚙️ Mặc định tắt; chủ sở hữu tổ chức có thể bật cho từng vai trò trong nhóm tại **Tổ chức → Ma trận quyền**.

### Quản lý thiết bị

| Thao tác | Chủ sở hữu | Quản trị viên | Thành viên | Quản lý | Kỹ thuật viên | Người yêu cầu | Người xem |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Tạo thiết bị | ✅ | ✅ | ❌ | ✅† | ✅† | ❌ | ❌ |
| Cập nhật thiết bị | ✅ | ✅ | ❌ | ✅‡ | ✅‡ | ❌ | ❌ |
| Xóa thiết bị | ✅ | ✅ | ❌ | ⚙️ | ⚙️ | ⚙️ | ⚙️ |
| Xem thiết bị | ✅ | ✅ | ❌§ | ✅§ | ✅§ | ✅§ | ✅§ |
| Tạo mã QR | ✅ | ✅ | ❌§ | ✅§ | ✅§ | ✅§ | ✅§ |
| Quét mã QR | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cập nhật thuộc tính tùy chỉnh | ✅ | ✅ | ❌ | ✅‡ | ✅‡ | ❌ | ❌ |

† Giới hạn theo nhóm (vai trò quản lý hoặc kỹ thuật viên trong nhóm được gán). Thiết bị được tạo mà không gán nhóm chỉ dành cho chủ sở hữu/quản trị viên (issue #650).

‡ Chỉ đối với thiết bị thuộc các nhóm của chính người dùng (mặc định là quản lý hoặc kỹ thuật viên).

**Quyền nhóm tùy chỉnh.** Chủ sở hữu tổ chức có thể thay đổi những vai trò trong nhóm nào được phép tạo và cập nhật thiết bị (Tổ chức → Ma trận quyền). Cơ sở dữ liệu thực thi thiết lập đang có hiệu lực (`has_team_permission`); chủ sở hữu và quản trị viên luôn giữ các quyền này. Việc xóa thiết bị, lệnh công việc và nhóm mặc định chỉ dành cho chủ sở hữu/quản trị viên và cũng có thể được bật cho từng vai trò trong nhóm (⚙️). Thao tác xóa thiết bị và lệnh công việc chạy dưới dạng xóa dây chuyền phía máy chủ (`delete_equipment_cascade`, `delete_work_order_cascade`).

§ Chỉ thiết bị thuộc các nhóm của người dùng; thiết bị chưa gán nhóm chỉ hiển thị với chủ sở hữu/quản trị viên.

### Quản lý lệnh công việc

| Thao tác | Chủ sở hữu | Quản trị viên | Thành viên | Quản lý | Kỹ thuật viên | Người yêu cầu | Người xem |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Tạo lệnh công việc | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cập nhật trạng thái lệnh công việc | ✅ | ✅ | ❌ | ✅**** | ✅**** | ❌ | ❌ |
| Phân công lệnh công việc | ✅ | ✅ | ❌ | ✅*** | ❌ | ❌ | ❌ |
| Xóa lệnh công việc | ✅ | ✅ | ❌ | ⚙️ | ⚙️ | ⚙️ | ⚙️ |
| Xem lệnh công việc | ✅ | ✅ | ❌***** | ✅***** | ✅***** | ✅***** | ✅***** |
| Hoàn thành lệnh công việc | ✅ | ✅ | ❌ | ✅**** | ✅**** | ❌ | ❌ |
| Hủy lệnh công việc | ✅ | ✅ | ✅****** | ✅****** | ✅****** | ✅****** | ✅****** |
| Mở lại lệnh công việc (đã hoàn thành/đã hủy) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Hoàn tác bảo trì | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

\*\*\*Chỉ từ danh sách lệnh công việc, đối với các nhóm mà người dùng là quản lý.

\*\*\*\*Chỉ các lệnh công việc được phân công

\*\*\*\*\*Chỉ các lệnh công việc của các nhóm mà người dùng tham gia và thiết bị của các nhóm đó

\*\*\*\*\*\*Các lệnh công việc được phân công, hoặc các yêu cầu do chính người dùng gửi

**Lưu ý về hoàn tác của quản trị viên.** **Hoàn tác bảo trì** (danh mục kiểm tra PM đã hoàn thành) và **Mở lại lệnh công việc** (lệnh công việc đã hoàn thành/đã hủy) chỉ dành cho chủ sở hữu/quản trị viên tổ chức (`is_org_admin`). Với lệnh công việc đã hoàn thành có PM đã hoàn thành, **Hoàn tác bảo trì** cũng mở lại lệnh công việc về trạng thái `accepted` trong cùng thao tác để có thể chỉnh sửa lại danh mục kiểm tra. **Mở lại lệnh công việc** vẫn dùng được khi bạn chỉ muốn mở lại lệnh công việc mà không thay đổi PM.

### Kho vật tư và phạm vi hiển thị chi phí nội bộ

Quyền truy cập kho vật tư/phụ tùng được cấp thông qua hai quyền cấp riêng (không phải
giá trị `organization_members.role`): **Người phụ trách vật tư** và **Người dùng
vật tư**. Chủ sở hữu và quản trị viên mặc định có quyền truy cập. Các **dòng chi phí**
của lệnh công việc (phụ tùng, đơn giá, giờ công/đơn giá nhân công) là dữ liệu nội bộ:
các vai trò tiếp xúc với khách hàng (Người yêu cầu và Người xem trong nhóm) và thành viên thường
**không được thấy bất kỳ dấu vết nào** về phụ tùng, mức tồn kho, giá hoặc nhân công ở bất cứ đâu
trong ứng dụng. Chi phí nội bộ và giá cuối cùng được xử lý sau,
ở giai đoạn lập hóa đơn trên QuickBooks.

| Dữ liệu / Thao tác | Chủ sở hữu | Quản trị viên | Người phụ trách vật tư | Người dùng vật tư | Quản lý* | Kỹ thuật viên* | Người yêu cầu | Người xem | Thành viên thường |
| ------------- | ----- | ----- | ------------- | -------------- | -------- | ----------- | --------- | ------ | ------------ |
| Xem kho vật tư, tra cứu linh kiện, linh kiện thay thế | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quản lý kho vật tư (tạo/sửa/điều chỉnh) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Thẻ "Phụ tùng" của thiết bị | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sử dụng phụ tùng trên lệnh công việc ("Thêm từ kho") | ✅ | ✅ | ✅ | ✅† | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xem các dòng chi phí của lệnh công việc (phụ tùng, giá, nhân công) | ✅ | ✅ | ❌‡ | ❌‡ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tổng phụ chi phí trên thẻ lệnh công việc / tiện ích chi phí trên trang tổng quan | ✅ | ✅ | ❌‡ | ❌‡ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Giờ công trên ghi chú lệnh công việc / số giờ ước tính | ✅ | ✅ | ❌‡ | ❌‡ | ✅ | ✅ | ❌ | ❌ | ❌ |

\* Vai trò cấp nhóm trong nhóm của lệnh công việc. `Manager`/`Technician` ở đây chỉ vai trò trong nhóm, không phải quyền cấp về kho vật tư.

† Người dùng vật tư chỉ có thể sử dụng/hoàn trả vật tư trong kho thông qua các lệnh công việc mà họ có quyền truy cập chi phí vận hành (chủ sở hữu nhóm/quản lý/kỹ thuật viên trong nhóm của lệnh công việc, hoặc người được phân công lệnh công việc). RPC `adjust_inventory_quantity` thực thi điều này ở phía máy chủ.

‡ Trừ khi chính người dùng đó cũng giữ một vai trò vận hành trong nhóm (hoặc là chủ sở hữu/quản trị viên tổ chức). Quyền cấp về kho vật tư tự nó không bao giờ mở rộng phạm vi hiển thị chi phí lệnh công việc.

**Các lớp thực thi:**

- **RLS.** Các chính sách của `work_order_costs` dùng `can_access_work_order_costs(work_order_id, user_id)`. Điều kiện này bao gồm chủ sở hữu/quản trị viên tổ chức, người được phân công lệnh công việc, hoặc chủ sở hữu nhóm/quản lý/kỹ thuật viên trong nhóm của lệnh công việc. Các bảng kho vật tư dùng `can_access_inventory` / `can_manage_inventory`.
- **Ứng dụng.** `useCanViewWorkOrderCosts()` kiểm soát mọi giao diện hiển thị chi phí (mục chi phí, tổng phụ trên thẻ, tiện ích chi phí trên trang tổng quan, giờ công trên ghi chú). `useInventoryAccess()` kiểm soát mọi giao diện kho vật tư (tuyến đường, thanh bên, thẻ Phụ tùng của thiết bị, bộ chọn phụ tùng trên lệnh công việc, nút FAB trên trang tổng quan).
- **Xuất dữ liệu.** Báo cáo dịch vụ PDF an toàn cho khách hàng không bao giờ chứa chi phí/nhân công đối với người xem không phải quản trị viên. Xuất hàng loạt chỉ dành cho quản trị viên tổ chức (edge `verifyOrgAdmin`).

Cả hai quyền cấp được quản lý từ bảng **Quyền truy cập phụ tùng** trên trang Kho vật tư (hoặc theo từng thành viên tại Tổ chức → Thành viên). Chỉ chủ sở hữu/quản trị viên mới có thể cấp hoặc thu hồi hai vai trò này.

### Quản lý dụng cụ công nghệ {#tooling-management}

Dụng cụ là các dòng thiết bị thuộc nhóm TL, vì vậy quy tắc hiển thị thiết bị vẫn áp dụng cho bản ghi thiết bị. Các thao tác riêng của dụng cụ công nghệ dùng hai cấp: **chủ sở hữu/quản trị viên**, và **vận hành**, tức là vai trò trong nhóm có quyền `equipment.update` (có thể cấu hình) trong nhóm của dụng cụ (mặc định là quản lý và kỹ thuật viên).

| Dữ liệu / Thao tác | Chủ sở hữu | Quản trị viên | Quản lý* | Kỹ thuật viên* | Người yêu cầu | Người xem | Thành viên thường |
| ------------- | ----- | ----- | -------- | ----------- | --------- | ------ | ------------ |
| Xem dụng cụ công nghệ, tính tương thích, lịch sử | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Đăng ký / đưa dụng cụ vào quản lý, sửa thông tin dụng cụ, phê duyệt sử dụng | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quản lý sản phẩm, công đoạn, thiết kế; phê duyệt tương thích | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cấp phát, thu hồi, chuyển vị trí, ghi nhận sử dụng, ghi nhận kiểm tra, cách ly | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Điều chỉnh mức sử dụng, đặt giới hạn tuổi thọ, quyết định xử lý giới hạn tuổi thọ, các trạng thái ngừng phục vụ khác | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Phê duyệt đưa trở lại sử dụng, ban hành phiên bản bản vẽ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

\* Vai trò trong nhóm của dụng cụ, với thiết lập `equipment.update` mặc định. Chủ sở hữu tổ chức có thể thay đổi thiết lập đó cho từng vai trò trong nhóm.

**Các lớp thực thi:**

- **Cơ sở dữ liệu.** Các bảng lịch sử dụng cụ ở chế độ chỉ đọc đối với client. Mọi thay đổi đều đi qua một RPC SECURITY DEFINER, RPC này kiểm tra cấp quyền, khóa dòng dụng cụ và ghi lịch sử trong cùng một giao dịch. Các liên kết chéo giữa các tổ chức bị từ chối nhờ khóa ngoại tổ hợp.
- **Ứng dụng.** `useToolingPermissions()` ẩn các điều khiển mà cơ sở dữ liệu sẽ từ chối.

### Phạm vi hiển thị nhật ký kiểm toán (#1122)

Nhật ký kiểm toán của tổ chức chỉ dành cho **chủ sở hữu và quản trị viên** ở mọi lớp: trang nằm tại **Tổ chức → Nhật ký kiểm toán** và có kiểm tra vai trò ngay trong trang, RLS SELECT của `audit_log` yêu cầu tư cách thành viên chủ sở hữu/quản trị viên đang hoạt động, và RPC `get_audit_log_timeline` kiểm tra lại `is_org_admin`. Các mục kiểm toán không bao giờ xuất hiện trên các trang vận hành (chi tiết lệnh công việc hoặc kho vật tư) và không bao giờ có trong dữ liệu xuất ngoài luồng xuất CSV/JSON kiểm toán chuyên dụng, luồng này thông báo cho quản trị viên mỗi lần xuất.

## Quyền đối với bảng điều khiển DSR (Giai đoạn một)

### Chính sách về tuyến đường và thao tác

| Khả năng | Chủ sở hữu | Quản trị viên | Thành viên |
|------------|-------|-------|--------|
| Xem hàng đợi DSR (`/dashboard/dsr`) | ✅ | ✅ | ❌ |
| Mở hồ sơ DSR (`/dashboard/dsr/:requestId`) | ✅ | ✅ | ❌ |
| Thực hiện các thao tác vòng đời (`verify`, `deny`, `extend`, `complete`) | ✅ | ✅ | ❌ |
| Kích hoạt xuất bằng chứng (`request_export`, `retry_export`) | ✅ | ✅ | ❌ |
| Gửi lại thông báo cho người tiêu dùng (`resend_notice`) | ✅ | ✅ | ❌ |

### Quy tắc cô lập đối tượng thuê

- Các hồ sơ DSR được giới hạn phạm vi theo `dsr_requests.organization_id`.
- Việc kiểm tra quyền truy cập được thực thi ở cả ranh giới edge function lẫn chính sách cơ sở dữ liệu.
- Các yêu cầu nằm ngoài tổ chức của người thực hiện được trả về là `404` (che giấu ngữ nghĩa liên tổ chức).
- Việc từ chối theo vai trò trong cùng tổ chức được trả về là `403`.

### Các mặc định tường minh

- Trong giai đoạn một, thành viên mặc định bị từ chối.
- Bản phát hành này không bật vai trò vận hành nào không phải quản trị viên.
- Mọi việc mở rộng vai trò trong tương lai phải cập nhật tài liệu này cùng các kiểm tra RLS + edge function tương ứng trong cùng một PR.
