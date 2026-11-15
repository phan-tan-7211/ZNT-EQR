export type PrivacyPolicyLocalizedSection = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

const viSections: readonly PrivacyPolicyLocalizedSection[] = [
  {
    title: '1. Giới thiệu',
    paragraphs: [
      'ZNTEQR™ (chúng tôi) do ZNT LLC phát triển và vận hành, cam kết bảo vệ quyền riêng tư của mọi cá nhân và tổ chức sử dụng nền tảng quản lý thiết bị đội xe. Chính sách này giải thích chúng tôi thu thập thông tin gì, vì sao thu thập, nhà cung cấp nào xử lý, cách bảo vệ và các quyền của bạn.',
      'Chính sách áp dụng cho ứng dụng web ZNTEQR tại eqr.zinitek.com, gồm trải nghiệm quét mã QR, API và các chức năng ứng dụng di động hoặc PWA liên quan. Việc sử dụng dịch vụ cũng chịu sự điều chỉnh của Điều khoản dịch vụ.',
    ],
  },
  {
    title: '2. Thông tin thu thập — cấp người dùng cá nhân',
    paragraphs: [
      'Khi bạn tạo tài khoản hoặc tương tác với ZNTEQR, chúng tôi thu thập thông tin gắn với bạn. Thông tin có thể gồm họ tên, email, mật khẩu đã băm, hồ sơ Google nếu bạn chọn đăng nhập Google, tên hiển thị, tùy chọn ẩn email, token phiên, dữ liệu quét QR, báo lỗi, đăng ký thông báo đẩy, CAPTCHA và tùy chọn thông báo.',
      'Khi quét mã ZNTEQR, chúng tôi ghi nhận thời gian quét và danh tính người dùng. Tọa độ GPS chỉ được thu thập khi quản trị viên tổ chức bật tính năng này; mặc định tính năng bị tắt.',
      'Báo lỗi có thể kèm chẩn đoán phiên đã ẩn danh như phiên bản ứng dụng, trình duyệt, hệ điều hành, kích thước màn hình, múi giờ, trạng thái online/offline và thời gian tải trang; không gồm tên, email hoặc tên tổ chức.',
    ],
  },
  {
    title: '3. Thông tin thu thập — cấp tổ chức',
    paragraphs: [
      'Tổ chức sử dụng ZNTEQR lưu dữ liệu kinh doanh trong nền tảng. Dữ liệu thuộc tổ chức và được cô lập với tổ chức khác bằng Row Level Security ở cấp cơ sở dữ liệu.',
      'Dữ liệu có thể gồm hồ sơ tổ chức; hồ sơ thiết bị và lịch sử vị trí; lệnh công việc, nhân công, chi phí, ảnh và checklist; đội và thành viên; kho; khách hàng; lời mời; tệp tải lên; nhật ký kiểm toán; thông báo trong ứng dụng và mẫu bảo dưỡng định kỳ.',
    ],
  },
  {
    title: '4. Nhà cung cấp dịch vụ bên ngoài',
    paragraphs: [
      'ZNTEQR sử dụng các nhà cung cấp bên thứ ba để vận hành dịch vụ. Với mỗi nhà cung cấp, chúng tôi công bố mục đích, dữ liệu gửi đi, dữ liệu nhận về và dữ liệu được lưu trong ZNTEQR. Tích hợp tùy chọn chỉ hoạt động khi quản trị viên tổ chức chủ động kết nối.',
    ],
    bullets: [
      'Supabase: cơ sở dữ liệu PostgreSQL, xác thực, lưu tệp, realtime và edge functions; hạ tầng AWS tại Hoa Kỳ.',
      'Google Maps: hiển thị bản đồ, gợi ý địa chỉ và geocoding; không gửi danh tính, email hoặc thông tin tài khoản đến API bản đồ.',
      'hCaptcha: bảo vệ biểu mẫu đăng ký; token xác minh được kiểm tra rồi loại bỏ.',
      'Resend: gửi email giao dịch cho lời mời thành viên; không lưu dữ liệu Resend trong ZNTEQR.',
      'Cloudflare: lưu trữ và CDN cho frontend; có thể xử lý log truy cập máy chủ theo chính sách riêng.',
      'Stripe: tích hợp thanh toán hiện đã tắt; một số ID lịch sử có thể còn để phục vụ đối soát.',
      'QuickBooks Online và Google Workspace: tích hợp tùy chọn, chỉ chia sẻ dữ liệu sau khi quản trị viên kết nối OAuth.',
      'GitHub và dịch vụ Web Push: đồng bộ báo lỗi đã loại bỏ PII và gửi thông báo đẩy đến thiết bị.',
    ],
  },
  {
    title: '5. Cookie, bộ nhớ cục bộ và dữ liệu phiên',
    paragraphs: [
      'ZNTEQR chỉ dùng bộ nhớ trình duyệt tối thiểu cho chức năng ứng dụng. Chúng tôi không dùng cookie theo dõi bên thứ ba, pixel quảng cáo hoặc kỹ thuật fingerprinting.',
      'Thông báo cookie cho phép bạn Chấp nhận hoặc Từ chối. Lựa chọn được lưu trong localStorage với khóa znteqr:cookie-consent. Token đăng nhập, chuyển hướng đăng nhập QR, hàng đợi offline và lựa chọn đồng ý vẫn hoạt động khi bạn Từ chối để các luồng cốt lõi không bị gián đoạn.',
      'Cookie sidebar:state ghi nhớ trạng thái mở rộng của thanh điều hướng trong 7 ngày và không chứa thông tin cá nhân. localStorage còn có thể lưu tổ chức đã chọn, bộ nhớ phiên đã làm sạch, bố cục dashboard, trạng thái bộ tính giờ, quyền quản trị và bản sao nháp editor. Dữ liệu này nằm trong trình duyệt và có thể xóa từ cài đặt trình duyệt.',
      'sessionStorage chỉ lưu URL chuyển hướng đang chờ khi lần quét QR yêu cầu đăng nhập. Supabase Auth lưu JWT và refresh token để duy trì phiên đăng nhập; dữ liệu này không được chia sẻ với script bên thứ ba.',
    ],
  },
  {
    title: '6. Cách chúng tôi sử dụng thông tin',
    paragraphs: ['Chúng tôi sử dụng thông tin đã mô tả cho các mục đích cụ thể sau:'],
    bullets: [
      'Cung cấp dịch vụ: vận hành thiết bị, lệnh công việc, cộng tác nhóm, kho, quét QR và bản đồ đội xe.',
      'Xác thực và kiểm soát truy cập: xác minh danh tính, quản lý phiên và thực thi quyền theo vai trò.',
      'Thông báo: gửi thông báo trong ứng dụng, thông báo đẩy khi bạn đồng ý và email giao dịch.',
      'Thực hiện tích hợp: xuất dữ liệu sang QuickBooks hoặc Google Workspace khi tổ chức đã kết nối.',
      'Xử lý lỗi: chẩn đoán và giải quyết lỗi được gửi từ chức năng báo lỗi.',
      'Tuân thủ và kiểm toán: duy trì nhật ký bất biến cho yêu cầu OSHA, DOT, ISO và các yêu cầu tương tự.',
      'Bảo mật và ngăn lạm dụng: phát hiện truy cập trái phép, bot và hoạt động gian lận.',
      'Cải thiện dịch vụ: phân tích mẫu sử dụng tổng hợp, đã khử định danh; không dùng dịch vụ analytics bên thứ ba.',
      'Nghĩa vụ pháp lý: tuân thủ luật, quy định, quy trình pháp lý và yêu cầu hợp lệ của cơ quan nhà nước.',
    ],
  },
  {
    title: '7. Cách chúng tôi chia sẻ thông tin',
    paragraphs: [
      'Chúng tôi không bán thông tin cá nhân. Chúng tôi chỉ chia sẻ dữ liệu trong các trường hợp cần thiết để cung cấp dịch vụ, quản lý tổ chức, thực hiện tích hợp mà tổ chức đã đồng ý, tuân thủ yêu cầu pháp lý, chuyển giao kinh doanh hoặc khi bạn cho phép rõ ràng.',
      'Chúng tôi không chia sẻ dữ liệu với mạng quảng cáo, nhà môi giới dữ liệu hoặc bên khác cho mục đích tiếp thị.',
    ],
  },
  {
    title: '8. Bảo mật dữ liệu',
    paragraphs: [
      'Chúng tôi triển khai nhiều lớp biện pháp kỹ thuật và tổ chức để bảo vệ dữ liệu.',
    ],
    bullets: [
      'Mã hóa khi truyền bằng TLS/HTTPS và HSTS.',
      'Mã hóa dữ liệu lưu trữ bởi PostgreSQL và Supabase Storage.',
      'Mã hóa bổ sung token OAuth QuickBooks và Google Workspace bằng AES.',
      'Cô lập nhiều tổ chức bằng PostgreSQL Row Level Security.',
      'Content Security Policy và các HTTP security headers để giảm rủi ro XSS, clickjacking và tải tài nguyên trái phép.',
      'hCaptcha, rate limiting, kiểm tra đầu vào bằng Zod và máy chủ, che PII trước khi gửi báo lỗi sang GitHub.',
      'Xác minh webhook bằng HMAC-SHA256 và quét lỗ hổng dependency, CodeQL trong CI.',
    ],
  },
  {
    title: '9. Lưu giữ, xuất và xóa dữ liệu',
    paragraphs: [
      'Chúng tôi lưu thông tin trong thời gian cần thiết để thực hiện mục đích đã nêu và tuân thủ nghĩa vụ pháp lý.',
    ],
    bullets: [
      'Tài khoản đang hoạt động: lưu trong thời gian tài khoản và gói đăng ký của tổ chức còn hoạt động.',
      'Cửa sổ xuất sau khi kết thúc: bạn có thể xuất Customer Data trong 30 ngày sau khi gói đăng ký kết thúc hoặc hết hạn; sau đó dữ liệu có thể bị xóa hoặc khử định danh khỏi hệ thống hoạt động.',
      'Nhật ký kiểm toán: có thể được lưu lâu hơn theo quy định hoặc nhu cầu lưu hồ sơ kinh doanh hợp pháp.',
      'Bản sao lưu: do Supabase quản lý theo chính sách hạ tầng và sẽ tự động loại bỏ sau thời hạn giới hạn.',
      'Lưu giữ pháp lý: có thể kéo dài hơn thời hạn thông thường khi pháp luật yêu cầu hoặc để thiết lập, thực hiện hay bảo vệ yêu cầu pháp lý.',
    ],
  },
  {
    title: '10. Quyền và lựa chọn của bạn',
    paragraphs: [
      'Tùy nơi cư trú, bạn có thể có quyền truy cập, chỉnh sửa, xóa, chuyển dữ liệu, hạn chế xử lý hoặc phản đối việc xử lý dữ liệu cá nhân.',
      'Bạn có thể điều chỉnh hiển thị email, thông báo đẩy và danh mục thông báo trong cài đặt. Quản trị viên tổ chức kiểm soát việc thu thập vị trí GPS và kết nối các tích hợp tùy chọn. Nếu cần DPA, hãy liên hệ để nhận bản tiêu chuẩn.',
      'Để thực hiện quyền, hãy gửi yêu cầu qua biểu mẫu privacy request hoặc thông tin liên hệ ở cuối chính sách. Chúng tôi sẽ phản hồi yêu cầu đã xác minh trong 45 ngày theo luật áp dụng.',
    ],
  },
  {
    title: '10A. Quyền riêng tư California (CCPA/CPRA)',
    paragraphs: [
      'Phần này áp dụng cho cư dân California và bổ sung các công bố theo CCPA/CPRA.',
      'Trong 12 tháng trước, chúng tôi có thể thu thập các nhóm thông tin như định danh, dữ liệu thương mại, hoạt động internet, dữ liệu địa lý chính xác khi được bật, thông tin nghề nghiệp và dữ liệu suy luận cần cho vận hành dịch vụ.',
      'Thông tin nhạy cảm gồm tọa độ GPS chỉ khi quản trị viên bật thu thập vị trí và thông tin đăng nhập do Supabase Auth quản lý. Chúng tôi không bán thông tin cá nhân và không chia sẻ cho quảng cáo hành vi theo ngữ cảnh chéo.',
      'Bạn có thể gửi yêu cầu qua eqr.zinitek.com/privacy-request hoặc privacy@zinitek.com. Người dùng đã xác thực cũng có thể gửi từ cài đặt tài khoản. Chúng tôi xác minh danh tính trước khi xử lý và thường phản hồi trong 45 ngày; trường hợp cần thiết có thể gia hạn thêm 45 ngày.',
    ],
  },
  {
    title: '11. Quyền riêng tư của trẻ em',
    paragraphs: [
      'ZNTEQR là nền tảng B2B dành cho tổ chức và nhân viên. Dịch vụ không hướng tới người dưới 16 tuổi và chúng tôi không cố ý thu thập thông tin của trẻ em. Nếu phát hiện đã thu thập nhầm dữ liệu của trẻ dưới 16 tuổi, chúng tôi sẽ nhanh chóng xóa dữ liệu đó.',
    ],
  },
  {
    title: '12. Chuyển dữ liệu quốc tế',
    paragraphs: [
      'ZNTEQR được vận hành từ Hoa Kỳ. Dữ liệu được xử lý và lưu trữ tại Hoa Kỳ thông qua Supabase trên AWS và Cloudflare. Nếu truy cập từ ngoài Hoa Kỳ, dữ liệu của bạn có thể được chuyển, lưu trữ và xử lý tại Hoa Kỳ, nơi luật bảo vệ dữ liệu có thể khác nơi bạn sống.',
      'Bằng việc sử dụng dịch vụ, bạn đồng ý với việc chuyển dữ liệu này. Nếu tổ chức cần cơ chế chuyển dữ liệu cụ thể như Standard Contractual Clauses, hãy liên hệ để trao đổi.',
    ],
  },
  {
    title: '13. Thay đổi Chính sách quyền riêng tư',
    paragraphs: [
      'Chúng tôi có thể cập nhật chính sách để phản ánh thay đổi về hoạt động, công nghệ, yêu cầu pháp lý hoặc lý do vận hành. Chúng tôi sẽ cập nhật ngày sửa đổi; với thay đổi quan trọng, chúng tôi sẽ thông báo trong ứng dụng hoặc qua email ít nhất 30 ngày trước khi có hiệu lực.',
      'Chính sách cập nhật sẽ được đăng trên trang này. Việc tiếp tục sử dụng dịch vụ sau ngày hiệu lực đồng nghĩa với việc bạn chấp nhận chính sách cập nhật. Hãy xem lại chính sách định kỳ.',
    ],
  },
  {
    title: '14. Liên hệ',
    paragraphs: [
      'Nếu có câu hỏi, muốn thực hiện quyền dữ liệu hoặc lo ngại về hoạt động xử lý dữ liệu, hãy liên hệ chúng tôi.',
      'Email: phantan7211@gmail.com · Website: eqr.zinitek.com · Công ty: ZNT LLC. Vui lòng liên hệ để nhận thông tin địa chỉ doanh nghiệp. Chúng tôi hướng tới việc phản hồi yêu cầu liên quan đến quyền riêng tư trong 45 ngày.',
    ],
  },
];

const koSections: readonly PrivacyPolicyLocalizedSection[] = [
  {
    title: '1. 소개',
    paragraphs: [
      'ZNTEQR™(이하 “당사”)는 ZNT LLC가 개발하고 운영하며, 차량·장비 관리 플랫폼을 이용하는 개인과 조직의 개인정보를 보호하기 위해 노력합니다. 이 정책은 수집 정보, 수집 목적, 처리 업체, 보호 방법 및 사용자의 권리를 설명합니다.',
      '이 정책은 QR 스캔, API 및 관련 모바일/PWA 기능을 포함한 eqr.zinitek.com의 ZNTEQR 웹 애플리케이션에 적용됩니다. 서비스 이용에는 서비스 약관도 적용됩니다.',
    ],
  },
  {
    title: '2. 수집 정보 — 개인 사용자 수준',
    paragraphs: [
      '계정을 만들거나 ZNTEQR을 이용할 때 이름, 이메일, 해시된 비밀번호, 선택한 Google 프로필, 표시 이름, 이메일 공개 설정, 세션 토큰, QR 스캔, 버그 신고, 푸시 구독, CAPTCHA 및 알림 설정을 수집할 수 있습니다.',
      'ZNTEQR 코드를 스캔하면 스캔 시간과 사용자 신원을 기록합니다. GPS 좌표는 조직 관리자가 기능을 켠 경우에만 수집되며 기본값은 꺼짐입니다.',
      '버그 신고에는 앱 버전, 브라우저, 운영체제, 화면 크기, 시간대, 온라인 상태 및 페이지 로드 시간 같은 익명화된 세션 진단 정보가 포함될 수 있습니다. 이름, 이메일 및 조직명은 포함하지 않습니다.',
    ],
  },
  {
    title: '3. 수집 정보 — 조직 수준',
    paragraphs: [
      'ZNTEQR을 사용하는 조직은 플랫폼에 업무 데이터를 저장합니다. 데이터는 조직에 귀속되며 데이터베이스 수준의 Row Level Security로 다른 조직과 격리됩니다.',
      '조직 프로필, 장비와 위치 이력, 작업 지시와 비용, 팀과 구성원, 재고, 고객, 초대, 업로드 파일, 감사 로그, 알림 및 예방정비 템플릿이 포함될 수 있습니다.',
    ],
  },
  {
    title: '4. 외부 서비스 제공업체',
    paragraphs: [
      'ZNTEQR 운영을 위해 제3자 서비스 제공업체를 사용합니다. 각 업체의 목적, 전송 데이터, 수신 데이터 및 ZNTEQR에 저장되는 결과를 공개합니다. 선택적 통합은 조직 관리자가 명시적으로 연결한 경우에만 활성화됩니다.',
    ],
    bullets: [
      'Supabase: PostgreSQL 데이터베이스, 인증, 파일 저장, realtime 및 edge functions; 미국 AWS 리전.',
      'Google Maps: 지도, 주소 자동완성 및 geocoding; 사용자 신원과 계정 정보는 지도 API로 보내지 않습니다.',
      'hCaptcha: 가입 양식의 봇 방지; 검증 토큰은 확인 후 폐기합니다.',
      'Resend: 조직 초대용 거래 이메일 전송; Resend 전용 데이터는 ZNTEQR에 저장하지 않습니다.',
      'Cloudflare: frontend 호스팅 및 CDN; 자체 개인정보 처리방침에 따라 표준 접속 로그를 처리할 수 있습니다.',
      'Stripe: 결제 통합은 현재 비활성화되어 있으며 회계 연속성을 위해 과거 ID가 남을 수 있습니다.',
      'QuickBooks Online 및 Google Workspace: 관리자가 OAuth로 연결한 경우에만 선택적으로 데이터를 공유합니다.',
      'GitHub 및 Web Push 서비스: PII를 제거한 버그 신고 동기화와 기기 알림 전송에 사용합니다.',
    ],
  },
  {
    title: '5. 쿠키, 로컬 저장소 및 세션 데이터',
    paragraphs: [
      'ZNTEQR은 애플리케이션 기능에 필요한 최소한의 브라우저 저장소만 사용합니다. 제3자 추적 쿠키, 광고 픽셀 또는 브라우저 지문 기술은 사용하지 않습니다.',
      '첫 방문 시 쿠키 및 브라우저 저장소 알림에서 수락 또는 거부를 선택할 수 있습니다. 선택은 znteqr:cookie-consent에 저장됩니다. 로그인 토큰, QR 로그인 리디렉션, 오프라인 큐 및 동의 선택은 거부 후에도 핵심 흐름을 위해 유지됩니다.',
      'sidebar:state 쿠키는 탐색 사이드바 상태를 7일 동안 기억하며 개인정보를 포함하지 않습니다. 조직 선택, 정리된 세션 캐시, 대시보드 레이아웃, 작업 타이머, 관리자 권한 및 편집기 초안도 브라우저에 저장될 수 있으며 언제든지 삭제할 수 있습니다.',
      'sessionStorage는 QR 스캔 후 로그인에 필요한 대기 리디렉션 URL에만 사용합니다. Supabase Auth는 로그인 유지를 위해 JWT와 refresh token을 저장하며 제3자 스크립트와 공유하지 않습니다.',
    ],
  },
  {
    title: '6. 정보 이용 방법',
    paragraphs: ['수집한 정보는 다음 목적에 사용합니다:'],
    bullets: [
      '서비스 제공: 장비, 작업 지시, 팀 협업, 재고, QR 스캔 및 차량 지도 기능 제공.',
      '인증 및 접근 제어: 신원 확인, 세션 관리 및 역할 기반 권한 적용.',
      '알림: 앱 알림, 동의한 푸시 알림 및 거래 이메일 전송.',
      '통합 처리: 조직이 연결한 QuickBooks 또는 Google Workspace로 데이터 내보내기.',
      '오류 해결: 앱 내 버그 신고를 진단하고 해결.',
      '컴플라이언스 및 감사: OSHA, DOT, ISO 등의 요구를 지원하는 변경 불가 감사 기록 유지.',
      '보안 및 악용 방지: 무단 접근, 봇 및 사기 행위 탐지.',
      '서비스 개선: 익명화된 집계 사용 패턴 분석; 제3자 분석 서비스를 사용하지 않음.',
      '법적 의무: 법률, 규정, 법적 절차 및 유효한 정부 요청 준수.',
    ],
  },
  {
    title: '7. 정보 공유 방법',
    paragraphs: [
      '개인정보를 판매하지 않습니다. 서비스 제공업체, 조직 내부, 조직이 동의한 선택적 통합, 법적 준수, 사업 양도 또는 사용자의 명시적 동의가 있는 경우에만 데이터를 공유합니다.',
      '광고 네트워크, 데이터 브로커 또는 마케팅 목적의 다른 당사자와 데이터를 공유하지 않습니다.',
    ],
  },
  {
    title: '8. 데이터 보안',
    paragraphs: ['데이터를 보호하기 위해 여러 기술적·조직적 보안 조치를 적용합니다.'],
    bullets: [
      'TLS/HTTPS 및 HSTS를 통한 전송 암호화.',
      'PostgreSQL 및 Supabase Storage의 저장 데이터 암호화.',
      'QuickBooks 및 Google Workspace OAuth 토큰의 AES 추가 암호화.',
      'PostgreSQL Row Level Security를 통한 조직 간 격리.',
      'CSP 및 HTTP 보안 헤더를 통한 XSS·클릭재킹·무단 리소스 로드 완화.',
      'hCaptcha, rate limiting, Zod 및 서버 입력 검증, GitHub 전송 전 PII 제거.',
      'HMAC-SHA256 webhook 검증, npm audit 및 CI의 CodeQL 분석.',
    ],
  },
  {
    title: '9. 데이터 보존, 내보내기 및 삭제',
    paragraphs: ['정보는 명시된 목적을 수행하고 법적 의무를 지키는 데 필요한 기간 동안 보존합니다.'],
    bullets: [
      '활성 계정: 계정과 조직의 구독이 활성화된 동안 보존.',
      '종료 후 내보내기: 구독 종료 또는 만료 후 30일 동안 Customer Data를 내보낼 수 있으며 이후 활성 시스템에서 삭제하거나 비식별화할 수 있음.',
      '감사 기록: 규정 또는 합법적인 업무 기록 보관을 위해 더 오래 보존할 수 있음.',
      '백업: Supabase 인프라 정책에 따라 제한된 기간 보존 후 자동 삭제.',
      '법적 보존: 법률 또는 법적 청구의 설정·행사·방어를 위해 일반 기간보다 오래 보존할 수 있음.',
    ],
  },
  {
    title: '10. 사용자의 권리와 선택',
    paragraphs: [
      '관할 지역에 따라 개인정보 열람, 정정, 삭제, 데이터 이동, 처리 제한 또는 이의 제기 권리가 있을 수 있습니다.',
      '프로필에서 이메일 공개, 푸시 알림 및 알림 범주를 관리할 수 있습니다. 조직 관리자는 GPS 수집과 선택적 통합을 제어합니다. DPA가 필요하면 문의해 주세요.',
      '권리 행사는 개인정보 요청 양식 또는 정책 마지막의 연락처로 요청할 수 있습니다. 확인된 요청에는 관련 법률에 따라 45일 이내 답변합니다.',
    ],
  },
  {
    title: '10A. 캘리포니아 개인정보 보호 권리(CCPA/CPRA)',
    paragraphs: [
      '이 절은 캘리포니아 거주자에게 적용되며 CCPA/CPRA가 요구하는 내용을 보충합니다.',
      '지난 12개월 동안 식별자, 상업 정보, 인터넷 활동, 관리자가 켠 경우의 정확한 위치 정보, 직업 정보 및 서비스 운영에 필요한 추론 정보를 수집할 수 있습니다.',
      '민감한 정보에는 관리자가 켠 경우의 GPS 좌표와 Supabase Auth가 관리하는 로그인 정보가 포함됩니다. 개인정보를 판매하거나 교차 맥락 행동 광고를 위해 공유하지 않습니다.',
      'eqr.zinitek.com/privacy-request 또는 privacy@zinitek.com으로 요청할 수 있습니다. 인증된 사용자는 계정 설정에서도 요청할 수 있습니다. 신원을 확인한 후 처리하며 일반적으로 45일 이내 답변하고 필요한 경우 45일을 추가할 수 있습니다.',
    ],
  },
  {
    title: '11. 아동 개인정보 보호',
    paragraphs: [
      'ZNTEQR은 조직과 직원을 위한 B2B 플랫폼입니다. 16세 미만을 대상으로 하지 않으며 아동의 개인정보를 고의로 수집하지 않습니다. 16세 미만 아동의 데이터를 실수로 수집한 사실을 알게 되면 신속히 삭제합니다.',
    ],
  },
  {
    title: '12. 국제 데이터 이전',
    paragraphs: [
      'ZNTEQR은 미국에서 운영됩니다. 데이터는 AWS의 Supabase와 Cloudflare를 통해 미국에서 처리·저장됩니다. 미국 외 지역에서 접속하면 해당 지역과 다른 데이터 보호법이 적용되는 미국으로 정보가 이전될 수 있습니다.',
      '서비스를 이용하면 이러한 이전에 동의하는 것입니다. 조직에 Standard Contractual Clauses와 같은 특정 이전 장치가 필요하면 문의해 주세요.',
    ],
  },
  {
    title: '13. 개인정보 처리방침 변경',
    paragraphs: [
      '운영, 기술, 법적 요구 또는 기타 사유를 반영하기 위해 이 정책을 업데이트할 수 있습니다. 업데이트 날짜를 변경하며, 중요한 변경은 시행 최소 30일 전에 앱 알림 또는 계정 이메일로 안내합니다.',
      '업데이트된 정책은 이 페이지에 게시됩니다. 시행일 이후 서비스를 계속 사용하면 업데이트된 정책에 동의한 것으로 봅니다. 정기적으로 확인해 주세요.',
    ],
  },
  {
    title: '14. 문의하기',
    paragraphs: [
      '이 정책에 대한 질문, 데이터 권리 행사 또는 데이터 처리에 대한 우려가 있으면 문의해 주세요.',
      '이메일: phantan7211@gmail.com · 웹사이트: eqr.zinitek.com · 회사: ZNT LLC. 사업장 주소는 문의해 주세요. 개인정보 관련 문의에는 45일 이내 답변하도록 노력합니다.',
    ],
  },
];

export const privacyPolicyContentResources = {
  en: { privacyPolicyContent: [] as const },
  vi: { privacyPolicyContent: viSections },
  ko: { privacyPolicyContent: koSections },
} as const;
