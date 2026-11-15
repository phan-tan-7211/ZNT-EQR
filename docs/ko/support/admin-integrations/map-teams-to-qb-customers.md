---
title: "팀을 QuickBooks 고객에 연결하기"
description: "각 고객 팀을 QuickBooks 고객에 연결하여 송장 내보내기가 어디에 기록할지 알 수 있도록 합니다."
lastReviewed: 2026-07-07
personas: ["admin","owner"]
requirement: "QuickBooks가 연결되어 있어야 합니다. 조직 소유자와 관리자만 고객 계정을 연결할 수 있습니다."
---

**대상:** 관리자, 소유자  
**최종 검토일:** 2026-07-07

::: info 필요 조건
QuickBooks가 연결되어 있어야 합니다. 조직 소유자와 관리자만 고객 계정을 연결할 수 있습니다.
:::

ZNTEQR에서는 서비스를 제공하는 외부 고객을 **고객 유형의 팀**으로 나타냅니다. 해당 팀의 고객 계정을 QuickBooks 고객에 연결하면 송장 내보내기가 어디에 기록할지 알 수 있습니다.

## 1. 팀 열기

**팀**으로 이동하여 고객의 팀을 엽니다. 이미 연결된 팀은 팀 목록에 녹색 **QuickBooks 동기화** 배지가 표시됩니다.

![한 팀에 QuickBooks 동기화 배지가 표시된 팀 목록](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-02-teams-list-sync-badge.png)

## 2. 고객 계정 카드 찾기

고객 유형 팀에서는 **고객 계정** 카드가 팀 페이지 맨 위에 있습니다. 이 카드는 팀의 청구 및 서비스 식별 정보입니다. QuickBooks 동기화는 팀 편집이 아니라 이곳에서 관리합니다.

## 3. QuickBooks 고객 연결하기

**QuickBooks 송장 내보내기** 아래의 버튼을 사용하세요.

- **다른 계정 연결** / **QB 고객 변경** — QuickBooks에서 고객 목록을 실시간으로 불러오는 검색 가능한 선택 창을 엽니다. 이 팀이 청구하는 고객을 선택하세요.
- **QuickBooks에서 동기화** — 캐시된 이름, 연락처 정보, 세금 상태를 QuickBooks에서 새로 고칩니다.
- **연결 해제** — 연결을 제거합니다(다시 연결할 때까지 이 팀에서의 내보내기가 차단됩니다).

연결되면 카드에 녹색 **송장 내보내기 연결됨** 배지와 함께 QuickBooks 고객 ID 및 마지막 동기화 날짜가 표시됩니다.

![송장 내보내기용으로 연결된 고객 계정 카드](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-03-team-customer-account-linked.png)

모바일에서도 같은 카드가 팀 페이지 맨 위에 표시됩니다.

![QuickBooks 연결이 표시된 모바일 고객 계정 카드](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/mobile/qb-02-team-customer-card.png)

## 4. 연락처는 자동으로 동기화됩니다

QuickBooks에서 동기화된 연락처(휴대전화, 기본 이메일, 기본 전화번호)는 계정 카드 아래의 **고객 연락처** 섹션에 읽기 전용으로 표시됩니다. 팀 매니저는 이와 함께 외부 연락처를 직접 추가할 수도 있습니다.

::: tip 참고
송장 발행 시점에 차단되지 않도록 내보내기를 시작하기 전에 활성 상태인 모든 고객 팀을 연결해 두세요. 고객의 면세 상태도 QuickBooks에서 동기화되어 내보낸 송장에 적용됩니다.
:::

## 관련 문서

- [작업 지시를 QuickBooks로 내보내기](./export-work-order-to-qb)
- [QuickBooks 연결하기](./connect-quickbooks)
