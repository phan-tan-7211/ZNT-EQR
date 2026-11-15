---
title: "작업 지시를 QuickBooks로 내보내기"
description: "예방정비(PM) 작업 지시를 완료하고 인건비 및 부품 품목 행, 메모, 고객 메모가 포함된 임시 청구서로 QuickBooks Online에 보냅니다."
lastReviewed: 2026-07-07
personas: ["admin","owner"]
requirement: "소유자와 관리자(또는 QuickBooks 액세스 권한을 부여받은 구성원)만 내보낼 수 있습니다. 작업 지시가 완료되어 있어야 하며, 해당 설비가 QuickBooks 고객에 연결된 팀에 속해 있어야 합니다."
---

**대상:** 관리자, 소유자\
**최종 검토:** 2026-07-07

::: info 요구 사항
소유자와 관리자(또는 QuickBooks 액세스 권한을 부여받은 구성원)만 내보낼 수 있습니다. 작업 지시가 **완료**되어 있어야 하며, 해당 설비가 QuickBooks 고객에 연결된 팀에 속해 있어야 합니다.
:::

이 가이드는 예방정비 작업을 처음부터 끝까지 따라갑니다. PM 작업 지시를 만들고, 체크리스트를 완료하고, 청구 가능한 비용을 기록하고, 작업 지시를 완료한 다음 임시 청구서로 QuickBooks에 내보냅니다.

## 데스크톱 안내 동영상

<https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-demo.mp4>

## 1. 작업 지시 만들기(PM 체크리스트 포함)

설비 페이지에서 **작업 지시** 탭을 열고 **작업 지시 생성**을 클릭합니다. 명확한 제목과 설명을 입력하고 기술자를 배정한 다음, 제목 바로 아래의 드롭다운에서 설비의 **예방 정비 템플릿**을 선택합니다(배정된 템플릿이 있으면 그 템플릿이 기본값입니다).

![작업 지시 생성 대화 상자, 일반 정보](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-04-create-work-order-general.png)

![제목 아래에 예방정비 템플릿이 선택된 작업 지시 생성 대화 상자](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-05-create-work-order-pm-type.png)

설비의 가동 시간을 업데이트하지 않았다면 ZNTEQR가 생성하기 전에 확인을 요청합니다.

![작업 지시를 만들기 전 가동 시간 확인](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-06-create-work-order-hours-guard.png)

새 작업 지시가 PM 체크리스트가 첨부된 상태로 열리며 사이드바에 고객 연락처가 표시됩니다.

![PM 체크리스트와 함께 배정된 새 작업 지시](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-07-work-order-assigned.png)

## 2. PM 체크리스트 완료하기

**작업 시작**을 클릭한 다음 체크리스트 섹션을 차례로 진행합니다. 장비에 이상이 없으면 **모두 OK로 설정**으로 나머지 항목을 한 번에 완료할 수 있습니다. 모든 항목을 평가하면 **정비 완료**가 활성화됩니다.

![모든 섹션이 완료된 PM 체크리스트](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-08-pm-checklist-complete.png)

::: tip PM 선행 조건
PM 체크리스트가 있는 작업 지시는 PM 자체가 완료되기 전에는 완료할 수 없습니다. 그때까지 **완료** 동작은 비활성화된 상태로 유지됩니다.
:::

## 3. 청구 가능한 비용 기록하기

청구 가능 시간 × 시간당 요율은 **인건비 추가**를, 부품과 자재는 **비용 항목 추가**를 사용합니다. 이 항목들이 청구서의 품목 행이 되므로 완료하기 전에 확정하세요.

![시간과 시간당 요율이 있는 인건비 추가 대화 상자](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-09-add-labor-dialog.png)

![인건비 및 부품 행이 있는 항목별 비용](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-10-itemized-costs.png)

## 4. 작업 지시 완료하기

**완료**를 클릭하고 확인합니다. 완료 후에는 메모, 이미지 및 비용이 잠깁니다.

![작업 지시 완료 확인](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-11-complete-work-order-confirm.png)

## 5. 내보내기 → QuickBooks → 새 청구서 만들기

작업 지시 헤더에서 **내보내기** 메뉴를 열고 **QuickBooks → 새 청구서 만들기**를 선택합니다.

![QuickBooks 하위 메뉴가 있는 내보내기 메뉴](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-12-export-menu-quickbooks.png)

모바일에서는 같은 동작이 작업 지시 빠른 작업 시트의 **QuickBooks** 아래에 있습니다.

![QuickBooks 섹션이 있는 모바일 작업 시트](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/mobile/qb-04-action-sheet-quickbooks.png)

내보내기가 끝나면 작업 지시 헤더에 임시 합계와 청구서 번호가 있는 청구서 배지가 표시됩니다.

![임시 청구서 배지가 있는 작업 지시 헤더](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-13-invoice-draft-badge.png)

첫 내보내기 후에는 QuickBooks 하위 메뉴가 **청구서 #… 업데이트**와 **청구서 열기**로 바뀝니다.

![청구서가 생성된 후의 내보내기 메뉴](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-14-export-menu-post-invoice.png)

## 6. QuickBooks에서 임시 청구서 검토하기

**청구서 열기**를 누르면 QuickBooks Online의 임시 청구서로 바로 이동합니다. ZNTEQR는 작업 지시를 다음과 같이 매핑합니다.

| 작업 지시 데이터 | QuickBooks에서의 위치 |
| --- | --- |
| 인건비 행 | **Labor**(인건비) 서비스 행 하나(합산) |
| 그 밖의 모든 비용 행 | **Parts**(부품) 행 하나(합산) |
| PM 체크리스트 요약 + 공개 메모 | 기본 행의 설명 |
| 상태 기록 + 공개 메모 | 고객에게 표시되는 메시지 |
| 전체 비용 내역 + 비공개 메모 | 비공개 메모(고객에게 표시되지 않음) |
| 설비 제조사/모델/일련번호/가동 시간 | 청구서 사용자 지정 필드 |
| 작업 지시 ID 및 날짜 | 명세서 메모(숨김) |
| 고객 과세 상태 | 판매세(자동 계산, 면세 적용) |

![인건비 및 부품 행이 있는 QuickBooks의 임시 청구서](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-15-qbo-invoice-top.png)

![임시 청구서 합계, 고객 메모 및 숨겨진 명세서 메모](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-16-qbo-invoice-totals.png)

::: tip 임시 청구서만 생성
ZNTEQR는 항상 **임시 청구서**를 만듭니다. 검토와 발송은 QuickBooks에서 직접 하며, 고객에게 자동으로 이메일이 발송되는 일은 없습니다. 청구서가 발송되거나 결제되면 청구서 상태(및 잔액)가 작업 지시에 자동으로 반영됩니다.
:::

## 7. 작업 지시가 변경되면 다시 내보내기

**청구서 업데이트**는 최신 작업 지시 데이터를 같은 임시 청구서에 반영합니다. QuickBooks에서 청구서를 발송한 후에는 이후 내보내기가 발송된 청구서를 수정하지 않고 새 청구서를 만듭니다.

## 문제 해결

내보내기 메뉴에 QuickBooks 옵션이 없거나 비활성화되어 있으면 다음을 확인하세요.

1. QuickBooks가 연결되어 있습니다(연동 페이지에 **연결됨**이 표시됨).
2. 작업 지시 상태가 **완료됨**입니다.
3. 설비가 고객 계정에 **송장 내보내기 연결됨**이 표시되는 팀에 속해 있습니다.
4. 본인이 소유자/관리자이거나 구성원 페이지에서 QuickBooks 액세스 권한을 부여받았습니다.

## 관련 문서

- [QuickBooks 연결](./connect-quickbooks)
- [팀을 QuickBooks 고객에 매핑](./map-teams-to-qb-customers)
- [PM 체크리스트 완료하기](../technician-field-work/pm-checklist)
