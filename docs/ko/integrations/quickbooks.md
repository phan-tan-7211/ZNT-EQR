# QuickBooks Online

QuickBooks 연동은 완료된 작업 지시를 QuickBooks Online에 **임시 청구서**로 전송합니다. 모든 청구서는 여전히 QuickBooks에서 직접 검토하고 발송하므로 고객 청구를 계속 직접 관리할 수 있습니다.

조직 소유자와 관리자는 회사를 연결하고, 고객 팀을 QuickBooks 고객에 매핑하고, 완료된 작업 지시를 임시 청구서로 내보냅니다.

단계별 안내는 도움말 센터에 있습니다.

- [QuickBooks 연결하기](/ko/support/admin-integrations/connect-quickbooks)
- [팀을 QuickBooks 고객에 매핑하기](/ko/support/admin-integrations/map-teams-to-qb-customers)
- [작업 지시를 QuickBooks로 내보내기](/ko/support/admin-integrations/export-work-order-to-qb)

## 연결

사이드바에서 **연동**(또는 조직 → 연동)을 엽니다. **QuickBooks Online에 연결**을 클릭하고 QuickBooks 회사에 로그인한 뒤 요청된 권한을 허용합니다. ZNTEQR은 고객, 품목, 청구서, 결제 정보를 읽습니다. 임시 청구서를 작성하며, 해당 임시 청구서에 쓰이는 제품/서비스 품목이 없으면 새로 만들 수 있습니다. 급여나 은행 관련 데이터는 건드리지 않습니다.

연결이 끝나면 **연결됨** 배지가 표시된 연동 탭으로 돌아옵니다. 카드에는 **연결 해제** 버튼도 있습니다.

QuickBooks 리프레시 토큰은 약 100일간 유효합니다. ZNTEQR은 수명이 짧은 액세스 토큰을 백그라운드에서 갱신합니다. 상단 바의 연결 상태 표시가 빨간색으로 바뀌면 이 페이지에서 다시 연결하세요.

## 팀을 고객에 매핑하기

청구서를 내보내려면 팀에 QuickBooks 고객이 지정되어 있어야 합니다. 고객 팀을 열고 **고객 계정** 카드를 찾아 QuickBooks 고객을 연결하세요. 이미 연결된 팀은 팀 목록에 **QuickBooks 동기화** 배지가 표시됩니다.

## 임시 청구서 내보내기

**완료된** 작업 지시에서 **내보내기 → QuickBooks**를 사용합니다. 요건은 다음과 같습니다.

- 작업 지시의 설비가 팀에 속해 있어야 합니다
- 해당 팀에 QuickBooks 고객 매핑이 있어야 합니다
- QuickBooks를 관리할 수 있어야 합니다(소유자, 관리자 또는 권한을 부여받은 구성원)

내보낸 임시 청구서에는 ZNTEQR 작업 지시 비용을 요약한 청구 항목이 포함됩니다. 항목별 재고와 인건비 상세 내역의 기준 데이터는 계속 ZNTEQR입니다.

- **Labor(인건비).** 작업 지시 비용 행의 청구 가능한 인건비입니다.
- **Parts(부품).** 작업 지시의 그 밖의 비용을 하나로 요약한 비재고 항목입니다.

QuickBooks 청구서의 **Private Note**에는 ZNTEQR 작업 지시 ID, 날짜, 비공개 메모, 전체 항목별 비용 내역이 그대로 담깁니다. **Customer Memo**에는 타임라인과 처리 결과 요약이 담깁니다.

## 관련 문서

- [QuickBooks 연결하기](/ko/support/admin-integrations/connect-quickbooks)
- [팀을 QuickBooks 고객에 매핑하기](/ko/support/admin-integrations/map-teams-to-qb-customers)
- [작업 지시를 QuickBooks로 내보내기](/ko/support/admin-integrations/export-work-order-to-qb)
