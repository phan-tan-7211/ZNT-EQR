import tailwindcssPostcss from "@tailwindcss/postcss";
import { defineConfig } from "vitepress";
import type { DefaultTheme } from "vitepress";

const supportSidebarArticles: Record<string, { text: string; link: string }[]> =
  {
    "start-here": [
      { text: "Welcome to ZNTEQR", link: "/support/start-here/welcome-to-znteqr" },
      { text: "Navigation tour", link: "/support/start-here/navigation-tour" },
      { text: "Invite your team", link: "/support/start-here/invite-team-members" },
      { text: "Role overview", link: "/support/start-here/role-overview" },
    ],
    "technician-field-work": [
      {
        text: "Scan equipment QR",
        link: "/support/technician-field-work/scan-equipment-qr",
      },
      {
        text: "Create work order from equipment",
        link: "/support/technician-field-work/create-work-order-from-equipment",
      },
      {
        text: "Update work order status",
        link: "/support/technician-field-work/update-work-order-status",
      },
      {
        text: "Add notes and photos",
        link: "/support/technician-field-work/add-notes-and-photos",
      },
      { text: "PM checklist", link: "/support/technician-field-work/pm-checklist" },
      {
        text: "Consume inventory on work order",
        link: "/support/technician-field-work/consume-inventory-on-wo",
      },
      {
        text: "Mobile quick actions",
        link: "/support/technician-field-work/mobile-quick-actions",
      },
    ],
    "work-orders": [
      {
        text: "Work order lifecycle",
        link: "/support/work-orders/work-order-lifecycle",
      },
      {
        text: "Manage PM template on work order",
        link: "/support/work-orders/manage-pm-template-on-work-order",
      },
      {
        text: "Triage submitted requests",
        link: "/support/work-orders/triage-submitted-requests",
      },
      { text: "Assign a work order", link: "/support/work-orders/assign-work-order" },
      { text: "Reports overview", link: "/support/work-orders/reports-overview" },
      {
        text: "Submit request as Requestor",
        link: "/support/work-orders/submit-request-as-requestor",
      },
    ],
    "equipment-qr": [
      { text: "Add equipment", link: "/support/equipment-qr/add-equipment" },
      { text: "Print equipment QR", link: "/support/equipment-qr/print-equipment-qr" },
      {
        text: "Set display image",
        link: "/support/equipment-qr/set-equipment-display-image",
      },
      { text: "Bulk edit equipment", link: "/support/equipment-qr/bulk-import-equipment" },
      { text: "Fleet map", link: "/support/equipment-qr/fleet-map-basics" },
      {
        text: "Location sources and maps",
        link: "/support/equipment-qr/location-sources-and-maps",
      },
    ],
    "inventory-parts": [
      { text: "Add inventory item", link: "/support/inventory-parts/add-inventory-item" },
      {
        text: "Storage locations",
        link: "/support/inventory-parts/inventory-storage-locations",
      },
      {
        text: "Adjust quantity",
        link: "/support/inventory-parts/adjust-inventory-quantity",
      },
      {
        text: "Parts Access",
        link: "/support/inventory-parts/parts-managers-setup",
      },
      {
        text: "Alternate part groups",
        link: "/support/inventory-parts/alternate-groups-setup",
      },
      {
        text: "Bulk edit inventory",
        link: "/support/inventory-parts/bulk-import-inventory",
      },
      { text: "Part lookup", link: "/support/inventory-parts/part-lookup-search" },
    ],
    "teams-roles": [
      {
        text: "Organization roles",
        link: "/support/teams-roles/organization-roles",
      },
      { text: "Team role matrix", link: "/support/teams-roles/team-role-matrix" },
      {
        text: "Example: Apex Repair",
        link: "/support/teams-roles/apex-example-hierarchy",
      },
      { text: "Add team members", link: "/support/teams-roles/add-team-member" },
      { text: "Dedicated team views", link: "/support/teams-roles/team-views" },
      {
        text: "Teams & roles FAQ",
        link: "/support/teams-roles/multi-team-questions",
      },
    ],
    administration: [
      {
        text: "Daily Operator Check-Ins",
        link: "/support/administration/operator-daily-check-ins",
      },
    ],
    "admin-integrations": [
      {
        text: "Organization settings",
        link: "/support/admin-integrations/organization-settings",
      },
      {
        text: "Connect QuickBooks",
        link: "/support/admin-integrations/connect-quickbooks",
      },
      {
        text: "Map teams to QB customers",
        link: "/support/admin-integrations/map-teams-to-qb-customers",
      },
      {
        text: "Export work order to QB",
        link: "/support/admin-integrations/export-work-order-to-qb",
      },
      {
        text: "Connect Google Workspace",
        link: "/support/admin-integrations/google-workspace-connect",
      },
    ],
    "privacy-support": [
      { text: "Report an issue (in app)", link: "/support/privacy-support/report-an-issue" },
      {
        text: "Track reported issues (in app)",
        link: "/support/privacy-support/track-my-tickets",
      },
      {
        text: "Submit privacy request",
        link: "/support/privacy-support/submit-privacy-request",
      },
      { text: "Audit log", link: "/support/privacy-support/audit-log-basics" },
      { text: "DSR cockpit", link: "/support/privacy-support/dsr-cockpit-overview" },
      { text: "System status", link: "/support/privacy-support/system-status" },
    ],
  };

const LABELS: Record<string, { vi: string; ko: string }> = {
  "Welcome to ZNTEQR": { vi: "Chào mừng đến với ZNTEQR", ko: "ZNTEQR 시작하기" },
  "Navigation tour": { vi: "Tham quan giao diện", ko: "화면 둘러보기" },
  "Invite your team": { vi: "Mời thành viên", ko: "팀원 초대" },
  "Role overview": { vi: "Tổng quan vai trò", ko: "역할 개요" },
  "Scan equipment QR": { vi: "Quét QR thiết bị", ko: "설비 QR 스캔" },
  "Create work order from equipment": { vi: "Tạo lệnh công việc từ thiết bị", ko: "설비에서 작업 지시 만들기" },
  "Update work order status": { vi: "Cập nhật trạng thái lệnh công việc", ko: "작업 지시 상태 변경" },
  "Add notes and photos": { vi: "Thêm ghi chú và ảnh", ko: "메모와 사진 추가" },
  "PM checklist": { vi: "Danh mục kiểm tra PM", ko: "PM 체크리스트" },
  "Consume inventory on work order": { vi: "Xuất vật tư cho lệnh công việc", ko: "작업 지시에 재고 사용" },
  "Mobile quick actions": { vi: "Thao tác nhanh trên di động", ko: "모바일 빠른 작업" },
  "Work order lifecycle": { vi: "Vòng đời lệnh công việc", ko: "작업 지시 수명 주기" },
  "Manage PM template on work order": { vi: "Quản lý mẫu bảo trì trên lệnh công việc", ko: "작업 지시의 예방정비 템플릿 관리" },
  "Triage submitted requests": { vi: "Phân loại yêu cầu đã gửi", ko: "접수된 요청 분류" },
  "Assign a work order": { vi: "Giao lệnh công việc", ko: "작업 지시 배정" },
  "Reports overview": { vi: "Tổng quan báo cáo", ko: "보고서 개요" },
  "Submit request as Requestor": { vi: "Gửi yêu cầu với vai trò Người yêu cầu", ko: "요청자로 요청 제출" },
  "Add equipment": { vi: "Thêm thiết bị", ko: "설비 추가" },
  "Print equipment QR": { vi: "In mã QR thiết bị", ko: "설비 QR 인쇄" },
  "Set display image": { vi: "Đặt ảnh hiển thị", ko: "대표 이미지 설정" },
  "Bulk edit equipment": { vi: "Sửa thiết bị hàng loạt", ko: "설비 일괄 편집" },
  "Fleet map": { vi: "Bản đồ thiết bị", ko: "설비 지도" },
  "Location sources and maps": { vi: "Nguồn vị trí và bản đồ", ko: "위치 출처와 지도" },
  "Add inventory item": { vi: "Thêm vật tư", ko: "재고 품목 추가" },
  "Storage locations": { vi: "Vị trí lưu kho", ko: "보관 위치" },
  "Adjust quantity": { vi: "Điều chỉnh số lượng", ko: "수량 조정" },
  "Parts Access": { vi: "Quyền truy cập phụ tùng", ko: "부품 접근 권한" },
  "Alternate part groups": { vi: "Nhóm linh kiện thay thế", ko: "대체 부품 그룹" },
  "Bulk edit inventory": { vi: "Sửa kho vật tư hàng loạt", ko: "재고 일괄 편집" },
  "Part lookup": { vi: "Tra cứu linh kiện", ko: "부품 조회" },
  "Organization roles": { vi: "Vai trò trong tổ chức", ko: "조직 역할" },
  "Team role matrix": { vi: "Ma trận vai trò nhóm", ko: "팀 역할 매트릭스" },
  "Example: Apex Repair": { vi: "Ví dụ: Apex Repair", ko: "예시: Apex Repair" },
  "Add team members": { vi: "Thêm thành viên nhóm", ko: "팀 구성원 추가" },
  "Dedicated team views": { vi: "Chế độ xem riêng của nhóm", ko: "팀 전용 보기" },
  "Teams & roles FAQ": { vi: "Hỏi đáp về nhóm và vai trò", ko: "팀과 역할 FAQ" },
  "Daily Operator Check-Ins": { vi: "Kiểm tra hằng ngày của người vận hành", ko: "작업자 일일 점검" },
  "Organization settings": { vi: "Cài đặt tổ chức", ko: "조직 설정" },
  "Connect QuickBooks": { vi: "Kết nối QuickBooks", ko: "QuickBooks 연결" },
  "Map teams to QB customers": { vi: "Gắn nhóm với khách hàng QuickBooks", ko: "팀과 QuickBooks 고객 매핑" },
  "Export work order to QB": { vi: "Xuất lệnh công việc sang QuickBooks", ko: "작업 지시를 QuickBooks로 내보내기" },
  "Connect Google Workspace": { vi: "Kết nối Google Workspace", ko: "Google Workspace 연결" },
  "Report an issue (in app)": { vi: "Báo lỗi (trong ứng dụng)", ko: "문제 신고 (앱 내)" },
  "Track reported issues (in app)": { vi: "Theo dõi lỗi đã báo (trong ứng dụng)", ko: "신고한 문제 확인 (앱 내)" },
  "Submit privacy request": { vi: "Gửi yêu cầu về quyền riêng tư", ko: "개인정보 요청 제출" },
  "Audit log": { vi: "Nhật ký kiểm toán", ko: "감사 로그" },
  "DSR cockpit": { vi: "Bảng xử lý yêu cầu dữ liệu (DSR)", ko: "DSR 처리 화면" },
  "System status": { vi: "Trạng thái hệ thống", ko: "시스템 상태" },
  "Start Here": { vi: "Bắt đầu tại đây", ko: "시작하기" },
  "Technician Field Work": { vi: "Công việc hiện trường của kỹ thuật viên", ko: "기술자 현장 작업" },
  "Work Orders": { vi: "Lệnh công việc", ko: "작업 지시" },
  "Equipment & QR Codes": { vi: "Thiết bị và mã QR", ko: "설비와 QR 코드" },
  "Inventory & Parts": { vi: "Kho vật tư và linh kiện", ko: "재고와 부품" },
  "Teams & Roles": { vi: "Nhóm và vai trò", ko: "팀과 역할" },
  "Administration": { vi: "Quản trị", ko: "관리" },
  "Admin & Integrations": { vi: "Quản trị và tích hợp", ko: "관리와 연동" },
  "Privacy & Support": { vi: "Quyền riêng tư và hỗ trợ", ko: "개인정보와 지원" },
  "Overview": { vi: "Tổng quan", ko: "개요" },
  "Home": { vi: "Trang chủ", ko: "홈" },
  "Help Center": { vi: "Trung tâm trợ giúp", ko: "도움말 센터" },
  "Permissions": { vi: "Phân quyền", ko: "권한" },
  "PM Templates": { vi: "Mẫu bảo trì định kỳ", ko: "예방정비 템플릿" },
  "Open App": { vi: "Mở ứng dụng", ko: "앱 열기" },
  "More guides": { vi: "Hướng dẫn khác", ko: "추가 가이드" },
  "Workflows": { vi: "Quy trình làm việc", ko: "워크플로" },
  "Tooling management": { vi: "Quản lý dụng cụ", ko: "치공구 관리" },
  "Image upload (overview)": { vi: "Tải ảnh lên (tổng quan)", ko: "이미지 업로드 (개요)" },
  "Technician image upload": { vi: "Kỹ thuật viên tải ảnh lên", ko: "기술자 이미지 업로드" },
  "QuickBooks": { vi: "QuickBooks", ko: "QuickBooks" },
  "Guides": { vi: "Hướng dẫn", ko: "가이드" },
  "Permissions (RBAC)": { vi: "Phân quyền (RBAC)", ko: "권한 (RBAC)" },
  "How-to": { vi: "Cách thực hiện", ko: "사용 방법" },
  "Quick reference card": { vi: "Thẻ tham khảo nhanh", ko: "빠른 참조 카드" },
  "Technician image upload guide": { vi: "Hướng dẫn tải ảnh cho kỹ thuật viên", ko: "기술자 이미지 업로드 가이드" },
  "Integrations": { vi: "Tích hợp", ko: "연동" },
  "PM templates": { vi: "Mẫu bảo trì định kỳ", ko: "예방정비 템플릿" },
  "Compressor PM": { vi: "PM máy nén khí", ko: "컴프레서 PM" },
  "Excavator PM": { vi: "PM máy xúc", ko: "굴착기 PM" },
  "Forklift PM": { vi: "PM xe nâng", ko: "지게차 PM" },
  "Pull trailer PM": { vi: "PM rơ-moóc kéo", ko: "견인 트레일러 PM" },
  "Scissor lift PM": { vi: "PM xe nâng cắt kéo", ko: "시저 리프트 PM" },
  "Skid steer PM": { vi: "PM máy xúc lật mini", ko: "스키드 스티어 PM" },
};

type DocsLocale = "en" | "vi" | "ko";

/** Sidebar and nav labels are authored in English and looked up per locale. */
function t(locale: DocsLocale, text: string): string {
  return locale === "en" ? text : (LABELS[text]?.[locale] ?? text);
}

/** Internal links get the locale prefix (`/vi/...`, `/ko/...`); English stays at the root. */
function lp(locale: DocsLocale, link: string): string {
  return locale === "en" ? link : `/${locale}${link}`;
}

function supportSidebar(locale: DocsLocale): DefaultTheme.SidebarItem[] {
  const categories: { id: string; label: string }[] = [
    { id: "start-here", label: "Start Here" },
    { id: "technician-field-work", label: "Technician Field Work" },
    { id: "work-orders", label: "Work Orders" },
    { id: "equipment-qr", label: "Equipment & QR Codes" },
    { id: "inventory-parts", label: "Inventory & Parts" },
    { id: "teams-roles", label: "Teams & Roles" },
    { id: "administration", label: "Administration" },
    { id: "admin-integrations", label: "Admin & Integrations" },
    { id: "privacy-support", label: "Privacy & Support" },
  ];

  return categories.map(({ id, label }) => ({
    text: t(locale, label),
    collapsed: id !== "start-here",
    items: [
      { text: t(locale, "Overview"), link: lp(locale, `/support/${id}/`) },
      ...supportSidebarArticles[id].map(({ text, link }) => ({
        text: t(locale, text),
        link: lp(locale, link),
      })),
    ],
  }));
}

function items(locale: DocsLocale, entries: [string, string][]) {
  return entries.map(([text, link]) => ({ text: t(locale, text), link: lp(locale, link) }));
}

const FOOTER_MESSAGE: Record<DocsLocale, string> = {
  en: "ZNTEQR Docs — product app at eqr.zinitek.com · status at eqr.zinitek.com/support",
  vi: "Tài liệu ZNTEQR — ứng dụng tại eqr.zinitek.com · hỗ trợ tại eqr.zinitek.com/support",
  ko: "ZNTEQR 문서 — 앱: eqr.zinitek.com · 지원: eqr.zinitek.com/support",
};

const UI_TEXT: Record<Exclude<DocsLocale, "en">, Partial<DefaultTheme.Config>> = {
  vi: {
    outline: { label: "Trên trang này" },
    docFooter: { prev: "Trang trước", next: "Trang sau" },
    lastUpdated: { text: "Cập nhật lần cuối" },
    darkModeSwitchLabel: "Giao diện",
    lightModeSwitchTitle: "Chuyển sang giao diện sáng",
    darkModeSwitchTitle: "Chuyển sang giao diện tối",
    sidebarMenuLabel: "Mục lục",
    returnToTopLabel: "Về đầu trang",
    langMenuLabel: "Đổi ngôn ngữ",
  },
  ko: {
    outline: { label: "이 페이지의 내용" },
    docFooter: { prev: "이전 페이지", next: "다음 페이지" },
    lastUpdated: { text: "마지막 업데이트" },
    darkModeSwitchLabel: "화면 모드",
    lightModeSwitchTitle: "밝은 모드로 전환",
    darkModeSwitchTitle: "어두운 모드로 전환",
    sidebarMenuLabel: "메뉴",
    returnToTopLabel: "맨 위로",
    langMenuLabel: "언어 변경",
  },
};

function themeFor(locale: DocsLocale): DefaultTheme.Config {
  return {
    ...(locale === "en" ? {} : UI_TEXT[locale]),
    nav: [
      { text: t(locale, "Home"), link: lp(locale, "/") },
      { text: t(locale, "Help Center"), link: lp(locale, "/support/") },
      { text: t(locale, "Permissions"), link: lp(locale, "/guides/permissions") },
      { text: t(locale, "PM Templates"), link: lp(locale, "/pm-templates/") },
      {
        text: t(locale, "Open App"),
        link: "https://eqr.zinitek.com",
        target: "_blank",
        rel: "noopener noreferrer",
      },
    ],

    sidebar: {
      [lp(locale, "/support/")]: [
        { text: t(locale, "Help Center"), link: lp(locale, "/support/") },
        ...supportSidebar(locale),
        {
          text: t(locale, "More guides"),
          collapsed: true,
          items: items(locale, [
            ["Workflows", "/guides/workflows"],
            ["Tooling management", "/guides/tooling"],
            ["Image upload (overview)", "/how-to/image-upload/"],
            ["Technician image upload", "/how-to/image-upload/technician-image-upload-guide"],
            ["QuickBooks", "/integrations/quickbooks"],
          ]),
        },
      ],

      [lp(locale, "/guides/")]: [
        {
          text: t(locale, "Guides"),
          items: items(locale, [
            ["Workflows", "/guides/workflows"],
            ["Permissions (RBAC)", "/guides/permissions"],
            ["Tooling management", "/guides/tooling"],
          ]),
        },
      ],

      [lp(locale, "/how-to/")]: [
        {
          text: t(locale, "How-to"),
          items: items(locale, [
            ["Image upload (overview)", "/how-to/image-upload/"],
            ["Quick reference card", "/how-to/image-upload/quick-reference-card"],
            ["Technician image upload guide", "/how-to/image-upload/technician-image-upload-guide"],
          ]),
        },
      ],

      [lp(locale, "/integrations/")]: [
        {
          text: t(locale, "Integrations"),
          items: items(locale, [["QuickBooks", "/integrations/quickbooks"]]),
        },
      ],

      [lp(locale, "/pm-templates/")]: [
        {
          text: t(locale, "PM templates"),
          items: items(locale, [
            ["Overview", "/pm-templates/"],
            ["Compressor PM", "/pm-templates/compressor-pm-checklist"],
            ["Excavator PM", "/pm-templates/excavator-pm-checklist"],
            ["Forklift PM", "/pm-templates/forklift-pm-checklist"],
            ["Pull trailer PM", "/pm-templates/pull-trailer-pm-checklist"],
            ["Scissor lift PM", "/pm-templates/scissor-lift-pm-checklist"],
            ["Skid steer PM", "/pm-templates/skid-steer-pm-checklist"],
          ]),
        },
      ],
    },

    footer: {
      message: FOOTER_MESSAGE[locale],
      copyright: "Copyright © ZNT LLC",
    },
  };
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "ZNTEQR Docs",
  description:
    "User guides, workflows, and how-tos for ZNTEQR fleet equipment management — technicians, managers, admins, and equipment owners.",
  // Use the visitor's system preference on first visit, then remember their choice.
  appearance: true,
  lastUpdated: true,
  cleanUrls: true,
  srcDir: ".",
  srcExclude: [
    "ops/**",
    "getting-started/**",
    "technical/**",
    "edge-functions/**",
    "database/**",
    "maintenance/**",
    "compliance/**",
    "rca/**",
    "archive/**",
    "audit-readiness/**",
    "features/**",
    "README.md",
  ],
  sitemap: {
    hostname: "https://eqrdocs.zinitek.com",
  },
  vite: {
    css: {
      postcss: {
        plugins: [tailwindcssPostcss()],
      },
    },
  },
  head: [
    ["link", { rel: "icon", href: "/favicon.ico", sizes: "32x32" }],
    ["link", { rel: "icon", href: "/brand/znteqr-icon.png", type: "image/png", sizes: "512x512" }],
    ["link", { rel: "apple-touch-icon", href: "/brand/znteqr-icon.png" }],
    ["meta", { name: "theme-color", content: "#B79CFF" }],
    [
      "meta",
      {
        name: "keywords",
        content:
          "ZNTEQR,docs,help center,support,fleet management,work orders,QR codes,CMMS",
      },
    ],
  ],
  // English is served at the root; Vietnamese and Korean mirror it under /vi/ and /ko/.
  locales: {
    root: { label: "English", lang: "en-US", themeConfig: themeFor("en") },
    vi: {
      label: "Tiếng Việt",
      lang: "vi-VN",
      title: "Tài liệu ZNTEQR",
      description:
        "Hướng dẫn sử dụng, quy trình và cách thực hiện cho ZNTEQR — dành cho kỹ thuật viên, quản lý, quản trị viên và chủ thiết bị.",
      themeConfig: themeFor("vi"),
    },
    ko: {
      label: "한국어",
      lang: "ko-KR",
      title: "ZNTEQR 문서",
      description:
        "ZNTEQR 사용 가이드, 워크플로, 사용 방법 — 기술자, 매니저, 관리자, 설비 소유자를 위한 안내입니다.",
      themeConfig: themeFor("ko"),
    },
  },
  themeConfig: {
    logo: { src: "/brand/znteqr-icon.png", alt: "ZNTEQR" },
    // Primary wordmark; CSS appends a secondary " Docs" label.
    siteTitle: "ZNTEQR",

    search: {
      provider: "local",
    },
  },
});
