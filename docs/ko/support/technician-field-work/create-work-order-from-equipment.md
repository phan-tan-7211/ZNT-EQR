---
title: "설비에서 작업 지시 생성하기"
description: "설비 기록에서 바로 새 작업 지시를 시작하면 올바른 설비와 팀에 미리 연결됩니다."
lastReviewed: 2026-07-06
personas: ["technician","manager"]
requirement: "해당 설비를 소유한 팀의 매니저 또는 기술자여야 합니다."
---

**대상:** 기술자, 매니저  
**최종 검토일:** 2026-07-06

::: info 필요 조건
해당 설비를 소유한 팀의 매니저 또는 기술자여야 합니다.
:::

## 1. 설비 기록 열기

QR 코드를 스캔하거나 설비 목록에서 해당 설비를 선택합니다.

## 2. 작업 지시 탭 열기

설비 페이지에서 화면을 스크롤하거나 작업 지시 탭을 눌러 작업 이력을 확인합니다.

## 3. 작업 지시 생성 클릭

아직 작업 지시가 없으면 버튼에 "첫 작업 지시 생성"이라고 표시됩니다. 어느 경우든 설비가 미리 선택되어 고정된 상태로 양식이 열립니다.

![PM 체크리스트가 선택된 작업 지시 생성 대화 상자](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/02-create-work-order-dialog.png)

## 4. 제목, 우선순위, 설명 입력

- **제목** — "왼쪽 실린더 유압 누유"처럼 내용을 알 수 있는 요약을 입력합니다.
- **우선순위** — 안전과 가동 중단에 미치는 영향에 따라 낮음, 보통, 높음, 긴급 중에서 선택합니다.
- **설명** — 관찰한 내용, 요청하려는 조치, 출입이나 접근과 관련된 참고 사항을 적습니다.

## 5. 작업 지시 저장

작업 지시 생성을 클릭합니다. 새 기록이 제출됨 상태로 팀 대기열에 표시됩니다.

![제출됨 상태의 새 작업 지시 상세 페이지](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/03-work-order-created-submitted.png)

![설비에서 생성한 후의 모바일 작업 지시 요약](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/mobile/02-mobile-work-order-summary.png)

생성할 때 예방정비(PM) 체크리스트를 첨부하지 못했다면 진행 중인 작업 지시에 나중에 추가할 수 있습니다. [진행 중인 작업 지시에서 예방정비 템플릿 관리하기](../work-orders/manage-pm-template-on-work-order)를 참고하세요.

## 관련 문서

- [진행 중인 작업 지시에서 예방정비 템플릿 관리하기](../work-orders/manage-pm-template-on-work-order)

- [작업 지시 상태 업데이트하기](./update-work-order-status)
- [작업 지시에 메모와 사진 추가하기](./add-notes-and-photos)
