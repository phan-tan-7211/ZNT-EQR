---
title: "작업 지시 상태 업데이트하기"
description: "적절한 권한 확인을 거쳐 작업 지시를 제출됨 → 접수됨 → 배정됨 → 진행 중 → 완료됨 순서로 진행합니다."
lastReviewed: 2026-07-06
personas: ["technician","manager"]
---

**대상:** 기술자, 매니저  
**최종 검토일:** 2026-07-06
작업 지시는 예측 가능한 수명 주기를 따르므로 현장에서 실제로 어떤 일이 진행되고 있는지 누구나 확인할 수 있습니다. 작업 버튼에는 유효한 다음 상태만 표시되므로 실수로 단계를 건너뛸 수 없습니다.

![접수되어 기술자에게 배정된 작업 지시](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/04-status-accepted-assigned.png)

![진행 중 상태의 작업 지시](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/05-status-in-progress.png)

![모바일 작업 지시 요약](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/mobile/02-mobile-work-order-summary.png)

![모바일 상태 변경 시트](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/mobile/03-mobile-status-sheet.png)

## 1. 작업 지시 상세 페이지 열기

목록, 설비 또는 대시보드에서 작업 지시를 눌러 상세 화면으로 이동합니다.

## 2. 상태 작업 버튼 사용하기

오른쪽 위의 상태 카드에는 현재 상태와 함께 유효한 다음 작업만 표시됩니다. 예: **접수**, **배정**, **작업 시작**, **보류**, **완료**, **취소**.

## 3. 누가 무엇을 변경할 수 있나요

- **매니저, 관리자, 소유자**는 팀의 모든 작업 지시 상태를 변경할 수 있습니다.
- **기술자**는 본인에게 배정된 작업 지시를 진행 중, 보류 중, 완료됨 사이에서 변경할 수 있습니다.
- **요청자**는 제출한 후에는 상태를 변경할 수 없습니다.

## 4. 작업이 끝나면 완료로 표시하기

완료하면 종료일이 자동으로 기록됩니다. 부품을 기다리는 중이라면 "보류"를 사용해 작업이 기한 초과로 집계되지 않도록 하세요.

## 관련 문서

- [작업 지시 수명 주기 참조](../work-orders/work-order-lifecycle)
- [작업 지시에 메모와 사진 추가하기](./add-notes-and-photos)
