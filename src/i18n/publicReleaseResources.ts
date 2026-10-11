import type { Language } from '@/i18n/I18nProvider';
import type {
  PublicRelease,
  PublicReleaseEntry,
  PublicReleaseSection,
} from '@/features/releases/lib/publicReleaseTypes';

type ReleaseEntryTranslation = {
  title?: string;
  body: string;
};

type ReleaseTranslationSections = Readonly<Record<string, readonly ReleaseEntryTranslation[]>>;
type ReleaseTranslationVersions = Readonly<Record<string, ReleaseTranslationSections>>;

const viTranslations: ReleaseTranslationVersions = {
  '3.34.7': {
    added: [{ body: 'Đã bản địa hóa toàn bộ nội dung Chính sách quyền riêng tư sang tiếng Việt và tiếng Hàn.' }],
  },
  '3.34.6': {
    added: [{ body: 'Đã bổ sung chuyển đổi ngôn ngữ Tiếng Việt, Tiếng Anh và Tiếng Hàn trên các trang pháp lý và tính năng công khai còn lại.' }],
  },
  '3.34.5': {
    changed: [{ body: 'Đã tập trung hóa cấu hình triển khai production trên GitHub, loại bỏ các mã đích Vercel được hard-code khỏi công cụ phát hành và loại bỏ 1Password khỏi quy trình phát hành production trên Vercel.' }],
  },
  '3.34.4': {
    changed: [{ body: 'Đã hoàn tất đợt dọn dẹp sâu ZNTEQR bằng cách đổi tên các mã định danh runtime nội bộ còn lại và chuyển bài viết chào mừng của Trung tâm trợ giúp sang slug chuẩn `welcome-to-znteqr`, đồng thời giữ URL cũ bằng chuyển hướng vĩnh viễn.' }],
  },
  '3.34.3': {
    changed: [{ title: 'Nhất quán thương hiệu ZNTEQR', body: 'Khách hàng, công nghệ hỗ trợ và tài liệu công khai giờ đây đều nhận diện nền tảng thiết bị là ZNTEQR.' }],
  },
  '3.34.2': {
    changed: [{ title: 'Bản địa hóa xử lý lỗi dùng chung', body: 'Tiêu đề lỗi chung, thông báo dự phòng và hướng dẫn khôi phục giờ đây tuân theo ngôn ngữ Tiếng Việt, Tiếng Anh hoặc Tiếng Hàn đã chọn.' }],
  },
  '3.34.1': {
    changed: [{ title: 'Hoàn tất bản địa hóa VI/EN/KO', body: 'Các phản hồi dành cho người dùng về lệnh công việc, PM, ghi chú, hình ảnh, trạng thái tải, khả năng tiếp cận, chấp thuận cookie và thiết bị giờ đây tuân theo ngôn ngữ đã chọn mà không thay đổi dữ liệu nghiệp vụ đã lưu.' }],
  },
  '3.34.0': {
    changed: [{ title: 'Nhất quán thương hiệu ZNTEQR', body: 'Nội dung sản phẩm, tài liệu, bài kiểm thử, thông báo PWA, metadata SEO và mã định danh nội bộ giờ đây sử dụng thương hiệu ZNTEQR. Các URL equipqr.app hiện có và khóa trình duyệt đã lưu vẫn tương thích.' }],
  },
  '3.33.0': {
    changed: [
      { title: 'Bản địa hóa danh sách thành viên', body: 'Tên hiển thị cho lời mời đang chờ, thông tin từ Google Workspace và thành viên chưa xác định giờ đây hiển thị bằng Tiếng Việt, Tiếng Anh và Tiếng Hàn.' },
      { title: 'Hoàn thiện bản địa hóa thiết bị', body: 'Các gợi ý biểu mẫu thiết bị, điều khiển chỉnh sửa hàng loạt, nội dung tải, nhãn phương tiện và xác nhận ghi chú còn lại giờ đây hiển thị bằng Tiếng Việt, Tiếng Anh và Tiếng Hàn.' },
      { title: 'Bản địa hóa danh sách lệnh công việc trên di động', body: 'Tìm kiếm, bộ lọc, sắp xếp, thẻ lệnh công việc và lời nhắc tự động giao việc trên di động giờ đây hỗ trợ Tiếng Việt, Tiếng Anh và Tiếng Hàn.' },
      { title: 'Bản địa hóa danh sách lệnh công việc', body: 'Việc duyệt lệnh công việc giờ đây hỗ trợ Tiếng Việt, Tiếng Anh và Tiếng Hàn trên tìm kiếm, bộ lọc, sắp xếp, nhãn bộ lọc đang áp dụng, trạng thái trống và điều khiển chuyển đổi danh sách/lịch trên máy tính.' },
    ],
  },
  '3.32.1': {
    changed: [{ title: 'Bản địa hóa thiết bị', body: 'Quy trình thiết bị giờ đây hỗ trợ Tiếng Việt, Tiếng Anh và Tiếng Hàn trên danh sách, chi tiết, biểu mẫu, quét QR, PM, phương tiện, phụ tùng, bộ lọc, sắp xếp, giờ làm việc và nhóm thiết bị.' }],
  },
  '3.32.0': {
    added: [
      { title: 'Lịch lệnh công việc', body: 'Người lập kế hoạch có thể chuyển Lệnh công việc sang lịch tháng, tuần hoặc ngày, kéo để đổi hạn và đặt giờ đến hạn tùy chọn.' },
      { title: 'Trang danh sách lệnh công việc', body: 'Danh sách Lệnh công việc hiện phân trang trên máy chủ để các tổ chức lớn không phải tải toàn bộ lệnh công việc cùng lúc.' },
      { title: 'Nhóm mẫu PM', body: 'Các mục ZNTEQR và tổ chức trên Mẫu PM có thể thu gọn. ZNTEQR bắt đầu ở trạng thái đóng khi tổ chức đã có mẫu tùy chỉnh.' },
    ],
    changed: [
      { title: 'Thanh công cụ danh sách lệnh công việc', body: 'Danh sách trên máy tính không còn hiển thị số lượng đã lọc/tổng bên cạnh ô tìm kiếm; phân trang vẫn hiển thị số lệnh công việc đang xem.' },
    ],
    fixed: [
      { title: 'Đóng bảng điều khiển lịch', body: 'Nút X của bảng điều khiển bên Lệnh công việc giờ đây đóng bảng điều khiển.' },
      { title: 'Sự kiện còn sót khi tạo từ lịch', body: 'Hủy tạo lệnh công việc từ một ô lịch giờ đây không để lại sự kiện ảo trên lưới.' },
    ],
  },
  '3.31.0': {
    changed: [{ body: 'Production giờ đây sử dụng các bản bảo trì dependency mới nhất đã được kiểm tra từ chu kỳ preview.' }],
  },
  '3.30.0': {
    added: [
      { title: 'Trang bản phát hành công khai', body: 'Liên kết phiên bản trong chân trang pháp lý giờ đây mở trang `/releases` công khai với ghi chú phát hành được tạo lúc build từ changelog ZNTEQR.' },
    ],
    changed: [
      { title: 'Các bước tiếp theo của lệnh công việc trên điện thoại', body: 'Kỹ thuật viên hiện trường có thể thao tác ngay trên trang mà không cần mở quick actions; quản lý có thể mở lại lệnh công việc bị khóa hoặc gọi liên hệ khách hàng trên màn hình điện thoại.' },
      { title: 'Menu tải QR', body: 'Các hộp thoại QR của thiết bị, lệnh công việc và Quick Form giờ đây cho phép tải PNG hoặc JPG từ một menu duy nhất, với mục Hướng dẫn sử dụng mặc định được thu gọn.' },
    ],
    fixed: [
      { title: 'Tiêu đề section checklist PM dễ quét trên lệnh công việc', body: 'Checklist PM nhiều section giờ đây hiển thị tiêu đề section rõ ràng cùng tiến độ và số mục bị đánh dấu.' },
      { title: 'Tải lại Dashboard vẫn giữ shell ứng dụng', body: 'Tải lại hoặc mở trực tiếp các route dashboard giờ đây vẫn giữ sidebar và header trong khi skeleton nội dung đang tải.' },
      { title: 'Badge hóa đơn quá hạn trên di động vẫn hiển thị số lệnh công việc', body: 'Chi tiết lệnh công việc trên màn hình điện thoại giờ đây ngắt dòng badge hóa đơn quá hạn thay vì cắt số hóa đơn hoặc số lệnh công việc.' },
      { title: 'Quick actions lệnh công việc trên di động không che chi tiết', body: 'Chi tiết lệnh công việc trên màn hình điện thoại giờ đây giữ PM, Timeline và Events & Times ở phía trên thanh điều hướng di động để vẫn đọc và chạm được.' },
      { title: 'Lỗi tạo lệnh công việc hiển thị trung thực', body: 'Tạo lệnh công việc giờ đây chấp nhận mô tả trống và hiển thị thông báo lỗi thực tế thay vì toast chung chung.' },
      { title: 'Khóa chỉnh sửa lệnh công việc đã hoàn tất hiển thị rõ ràng', body: 'Lệnh công việc đã hoàn tất giờ đây hiển thị thông báo khóa rõ ràng cho chỉnh sửa ghi chú, ghi chú chung PM và mô tả.' },
      { title: 'Lệnh công việc đã chấp nhận tôn trọng người được giao hiện có khi bắt đầu', body: 'Status Management giờ đây bật Start Work theo người được giao đã lưu thay vì buộc chọn người lần thứ hai.' },
      { title: 'Bắt đầu công việc trên di động tuân theo trạng thái chưa giao', body: 'Next step, Change status và Work order actions giờ đây vẫn hiển thị Start work nhưng vô hiệu hóa kèm hướng dẫn người được giao khi chưa có người được giao.' },
      { title: 'Ẩn điều khiển PM với Viewer và requestor trên lệnh công việc', body: 'Vai trò Viewer và requestor giờ đây không còn thấy các điều khiển quản lý PM trên chi tiết lệnh công việc.' },
      { title: 'Xác nhận xóa thành viên hoạt động trên chi tiết nhóm', body: 'Owner và quản lý nhóm giờ đây nhận được hộp thoại xác nhận thực sự trước khi xóa thành viên.' },
      { title: 'Các thao tác mở lại lệnh công việc đã hoàn tất được gắn nhãn rõ ràng', body: 'Lệnh công việc đã hoàn tất giờ đây tách riêng Reopen work order và Revert PM, giải thích từng thao tác và yêu cầu xác nhận.' },
      { title: 'Xóa lệnh công việc nằm trong menu thao tác bổ sung', body: 'Chi tiết trên máy tính giữ Export là thao tác chính ở header và chuyển xóa vào menu bổ sung; trên di động, xóa nằm cuối và được giảm mức nhấn mạnh.' },
      { title: 'Bí danh trang cài đặt tổ chức', body: 'Mở `/dashboard/organization/settings` giờ đây hiển thị biểu mẫu Settings và các tab tổ chức thay vì panel chính trống.' },
      { title: 'Tên mẫu PM khởi đầu vẫn dễ đọc', body: 'Thẻ mẫu khởi đầu ZNTEQR giờ đây giữ tên mẫu dễ đọc ngay cả khi có cả badge ZNTEQR và Protected.' },
      { title: 'Marker Team HQ trên Fleet Map vẫn tương tác được', body: 'Nhấp marker trụ sở đội nhóm giờ đây vẫn giữ bản đồ và mở popup của đội nhóm.' },
    ],
  },
};

const koTranslations: ReleaseTranslationVersions = {
  '3.34.7': {
    added: [{ body: '개인정보 처리방침 전체 내용이 베트남어와 한국어로 현지화되었습니다.' }],
  },
  '3.34.6': {
    added: [{ body: '남은 공개 법률 및 기능 페이지 전반에 베트남어, 영어, 한국어 언어 전환을 추가했습니다.' }],
  },
  '3.34.5': {
    changed: [{ body: 'GitHub에서 프로덕션 배포 설정을 중앙화하고, 릴리스 도구의 하드코딩된 Vercel 대상 ID와 Vercel 프로덕션 릴리스 경로의 1Password 의존성을 제거했습니다.' }],
  },
  '3.34.4': {
    changed: [{ body: '남아 있던 활성 내부 런타임 식별자를 변경하고 Help Center 환영 문서를 표준 `welcome-to-znteqr` slug로 옮겼으며, 기존 URL은 영구 리디렉션으로 유지해 ZNTEQR 심층 정리를 완료했습니다.' }],
  },
  '3.34.3': {
    changed: [{ title: 'ZNTEQR 브랜드 일관성', body: '고객, 보조 기술 및 공개 문서가 이제 장비 플랫폼을 일관되게 ZNTEQR로 식별합니다.' }],
  },
  '3.34.2': {
    changed: [{ title: '공통 오류 처리 현지화', body: '일반 오류 제목, 대체 메시지 및 복구 안내가 이제 선택한 베트남어, 영어 또는 한국어를 따릅니다.' }],
  },
  '3.34.1': {
    changed: [{ title: 'VI/EN/KO 현지화 완료', body: '작업 지시, PM, 메모, 이미지, 로딩, 접근성, 쿠키 동의 및 장비에 관한 나머지 사용자 표시 피드백이 저장된 업무 데이터를 변경하지 않고 선택한 언어를 따릅니다.' }],
  },
  '3.34.0': {
    changed: [{ title: 'ZNTEQR 브랜드 일관성', body: '제품 문구, 문서, 테스트, PWA 알림, SEO 메타데이터 및 내부 식별자가 이제 ZNTEQR 브랜드를 사용합니다. 기존 equipqr.app URL과 저장된 브라우저 키는 계속 호환됩니다.' }],
  },
  '3.33.0': {
    changed: [
      { title: '멤버 목록 현지화', body: '대기 중인 초대, Google Workspace 클레임 및 알 수 없는 멤버의 placeholder 이름이 이제 베트남어, 영어 및 한국어로 표시됩니다.' },
      { title: '장비 현지화 후속 작업', body: '남은 장비 폼 힌트, 일괄 편집 컨트롤, 로딩 문구, 미디어 라벨 및 메모 확인이 이제 베트남어, 영어 및 한국어로 표시됩니다.' },
      { title: '모바일 작업 지시 목록 현지화', body: '모바일 검색, 필터, 정렬, 작업 지시 카드 및 자동 할당 안내가 이제 베트남어, 영어 및 한국어를 지원합니다.' },
      { title: '작업 지시 목록 현지화', body: '작업 지시 탐색이 이제 데스크톱 검색, 필터, 정렬, 활성 필터 라벨, 빈 상태 및 목록/캘린더 보기 컨트롤 전반에서 베트남어, 영어 및 한국어를 지원합니다.' },
    ],
  },
  '3.32.1': {
    changed: [{ title: '장비 현지화', body: '장비 업무 흐름이 이제 목록, 상세, 폼, QR 스캔, PM, 미디어, 부품, 필터, 정렬, 근무 시간 및 장비 그룹 전반에서 베트남어, 영어 및 한국어를 지원합니다.' }],
  },
  '3.32.0': {
    added: [
      { title: '작업 지시 캘린더', body: '데스크톱 계획자는 작업 지시를 월, 주 또는 일 캘린더로 전환하고 마감일을 드래그하며 선택적 마감 시간을 설정할 수 있습니다.' },
      { title: '작업 지시 목록 페이지', body: '작업 지시 목록이 이제 서버에서 페이지 단위로 로드되어 대규모 조직도 모든 작업 지시를 한 번에 불러오지 않아도 됩니다.' },
      { title: 'PM 템플릿 그룹', body: 'PM 템플릿의 ZNTEQR 및 조직 섹션을 접을 수 있습니다. 조직에 사용자 지정 템플릿이 있으면 ZNTEQR 섹션은 닫힌 상태로 시작합니다.' },
    ],
    changed: [
      { title: '작업 지시 목록 툴바', body: '데스크톱 목록은 이제 검색 옆에 필터/전체 개수를 표시하지 않으며, 페이지 이동에는 현재 표시 중인 작업 지시 수가 계속 표시됩니다.' },
    ],
    fixed: [
      { title: '캘린더 패널 닫기', body: '작업 지시 사이드 패널의 X가 이제 패널을 닫습니다.' },
      { title: '캘린더 생성 잔여 이벤트', body: '캘린더 슬롯에서 새 작업 지시 생성을 취소해도 이제 그리드에 유령 이벤트가 남지 않습니다.' },
    ],
  },
  '3.31.0': {
    changed: [{ body: '프로덕션에 이제 프리뷰 트레인에서 검증된 최신 의존성 유지보수 업데이트가 반영됩니다.' }],
  },
  '3.30.0': {
    added: [
      { title: '공개 릴리스 페이지', body: '법적 고지 바닥글의 버전 링크가 이제 ZNTEQR changelog에서 빌드 시 생성된 릴리스 노트가 있는 공개 `/releases` 페이지를 엽니다.' },
    ],
    changed: [
      { title: '작업 지시 다음 단계가 휴대폰에 유지됨', body: '현장 기술자는 quick actions를 열지 않고 페이지에서 바로 작업할 수 있으며, 관리자는 잠긴 작업 지시를 되돌리거나 휴대폰 화면에서 고객 연락처에 연결할 수 있습니다.' },
      { title: 'QR 다운로드 메뉴', body: '장비, 작업 지시 및 Quick Form QR 대화상자가 이제 하나의 메뉴에서 PNG 또는 JPG 다운로드를 제공하며 How to use는 기본적으로 접혀 있습니다.' },
    ],
    fixed: [
      { title: '작업 지시에서 PM 체크리스트 섹션 제목을 쉽게 확인', body: '여러 섹션으로 구성된 PM 체크리스트에 이제 진행률 및 플래그 수와 함께 명확한 섹션 제목이 표시됩니다.' },
      { title: 'Dashboard 강제 로드에도 앱 셸 유지', body: '대시보드 경로를 새로 고침하거나 직접 열어도 콘텐츠 스켈레톤이 로드되는 동안 사이드바와 헤더가 유지됩니다.' },
      { title: '모바일 기한 초과 송장 배지가 작업 지시 번호를 가리지 않음', body: '휴대폰 화면의 작업 지시 상세에서 이제 기한 초과 송장 배지가 줄바꿈되어 송장 또는 작업 지시 번호가 잘리지 않습니다.' },
      { title: '모바일 작업 지시 quick actions가 상세를 가리지 않음', body: '휴대폰 화면의 작업 지시 상세에서 이제 PM, Timeline 및 Events & Times가 모바일 내비게이션 위에 읽고 누를 수 있게 유지됩니다.' },
      { title: '작업 지시 생성 오류가 실제 상태를 표시', body: '작업 지시 생성이 이제 빈 설명을 허용하고 일반적인 토스트 대신 실제 실패 메시지를 표시합니다.' },
      { title: '완료된 작업 지시 편집 잠금이 명확하게 표시됨', body: '완료된 작업 지시에서 이제 메모, PM 일반 메모 및 설명 편집에 대한 잠금 안내가 명확하게 표시됩니다.' },
      { title: '수락된 작업 지시가 시작 시 기존 담당자를 존중함', body: 'Status Management가 이제 두 번째 담당자 선택을 강제하지 않고 저장된 담당자를 기준으로 Start Work를 활성화합니다.' },
      { title: '모바일 작업 시작이 미할당 상태를 따름', body: 'Next step, Change status 및 Work order actions가 이제 Start work를 표시하되 담당자가 없으면 담당자 안내와 함께 비활성화합니다.' },
      { title: '작업 지시에서 Viewer와 requestor PM 컨트롤 숨김', body: 'Viewer 및 requestor 팀 역할은 이제 작업 지시 상세에서 PM 관리 컨트롤을 볼 수 없습니다.' },
      { title: '팀 상세에서 멤버 삭제 확인이 작동함', body: 'Owner와 팀 관리자는 이제 팀원을 제거하기 전에 실제 확인 대화상자를 받습니다.' },
      { title: '완료된 작업 지시 되돌리기 동작의 라벨을 명확히 함', body: '완료된 작업 지시에서 이제 Reopen work order와 Revert PM을 분리하고 각각을 설명하며 확인을 요구합니다.' },
      { title: '작업 지시 삭제가 추가 작업 메뉴에 유지됨', body: '데스크톱 상세에서는 Export를 기본 헤더 동작으로 유지하고 삭제를 추가 메뉴로 옮기며, 모바일에서는 삭제를 마지막에 낮은 강조로 표시합니다.' },
      { title: '조직 설정 페이지 별칭', body: '`/dashboard/organization/settings`를 열면 이제 빈 메인 패널 대신 Settings 폼과 조직 탭이 표시됩니다.' },
      { title: '스타터 PM 템플릿 제목이 계속 읽기 쉬움', body: 'ZNTEQR 스타터 카드에서 이제 ZNTEQR과 Protected 배지가 모두 있어도 템플릿 이름을 읽기 쉽게 유지합니다.' },
      { title: 'Fleet Map Team HQ 마커가 계속 상호작용 가능함', body: '팀 본부 마커를 클릭해도 이제 지도가 유지되고 팀 팝업이 열립니다.' },
    ],
  },
};

const translations: Readonly<Record<'vi' | 'ko', ReleaseTranslationVersions>> = {
  vi: viTranslations,
  ko: koTranslations,
};

export function getLocalizedPublicReleaseEntry(
  language: Language,
  release: PublicRelease,
  section: PublicReleaseSection,
  index: number,
): PublicReleaseEntry {
  const entry = section.entries[index];
  if (language === 'en') {
    return entry;
  }

  const translation = translations[language][release.version]?.[section.id]?.[index];
  if (!translation) {
    return entry;
  }

  return {
    ...entry,
    title: translation.title ?? entry.title,
    body: translation.body,
  };
}
