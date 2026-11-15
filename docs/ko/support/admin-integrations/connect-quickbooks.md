---
title: "QuickBooks 연결"
description: "ZNTEQR이 QuickBooks Online 회사에 임시 청구서를 만들 수 있도록 권한을 부여합니다."
lastReviewed: 2026-07-07
personas: ["admin","owner"]
requirement: "조직 소유자 또는 관리자여야 합니다."
---

**대상:** 관리자, 소유자\
**최종 검토일:** 2026-07-07

::: info 요구 사항
조직 소유자 또는 관리자여야 합니다.
:::

QuickBooks 연동은 완료된 작업 지시를 QuickBooks Online에 **임시 청구서**로 전송합니다. 모든 청구서는 여전히 QuickBooks에서 직접 검토하고 발송하므로 고객 청구를 완전히 통제할 수 있습니다.

## 1. 조직 → 연동 열기

사이드바에서 **연동**을 엽니다(또는 조직 → 연동 탭). QuickBooks Online 카드는 목록 맨 위에 있습니다.

## 2. QuickBooks Online에 연결 클릭

ZNTEQR이 연결을 승인할 수 있도록 QuickBooks로 이동시킵니다. 연결하려는 QuickBooks 회사에 로그인하세요.

## 3. 액세스 승인

요청된 범위를 허용합니다. ZNTEQR은 고객 정보를 읽고 청구서를 작성하기만 하며, 급여, 은행 업무 또는 거래 내역은 건드리지 않습니다.

## 4. ZNTEQR로 돌아오기

연동 탭으로 돌아오면 QuickBooks Online 카드에 **연결됨** 배지가 표시됩니다. 카드에는 **연결 해제**와 QuickBooks 안에서 연결을 관리할 수 있는 바로가기가 있습니다.

![QuickBooks Online이 연결된 연동 페이지](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-01-integrations-connected.png)

모바일에서도 같은 카드를 사용할 수 있습니다.

![QuickBooks가 연결된 모바일 연동 페이지](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/admin-integrations/mobile/qb-01-integrations-connected.png)

다음으로, 청구서 내보내기가 어디에 게시할지 알 수 있도록 팀을 QuickBooks 고객에 매핑하세요.

::: tip 참고
QuickBooks 액세스 토큰은 100일마다 만료됩니다. ZNTEQR이 백그라운드에서 연결을 자동으로 갱신하므로 수동으로 다시 연결해야 하는 경우는 거의 없습니다. 상단 표시줄의 연결 상태 표시기가 빨간색으로 바뀌면 이 페이지에서 다시 연결하세요.
:::

## 관련 문서

- [팀을 QuickBooks 고객에 매핑](./map-teams-to-qb-customers)
- [작업 지시를 QuickBooks로 내보내기](./export-work-order-to-qb)
