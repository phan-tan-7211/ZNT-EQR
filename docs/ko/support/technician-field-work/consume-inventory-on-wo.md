---
title: "작업 지시에서 재고 부품 사용하기"
description: "수리에 사용한 부품을 기록하면 재고가 자동으로 차감되고 비용이 청구서에 반영됩니다."
lastReviewed: 2026-07-06
personas: ["technician","manager"]
requirement: "매니저, 기술자 또는 지정된 부품 관리자여야 합니다."
---

**대상:** 기술자, 매니저  
**최종 검토일:** 2026-07-06

::: info 필요 권한
매니저, 기술자 또는 지정된 부품 관리자여야 합니다.
:::

## 1. 작업 지시의 부품 및 비용 섹션 열기

작업 지시 상세 정보에서 비용 섹션까지 스크롤한 다음 비용 항목 추가를 탭합니다.

## 2. 부품 검색

부품 이름, SKU 또는 상호 참조 번호를 입력합니다. 대체 부품 그룹이 있으면 같은 검색 결과에 동등한 부품도 함께 표시됩니다.

![재고에서 부품 추가 대화 상자](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/09-inventory-part-selector.png)

## 3. 사용 수량 입력

ZNTEQR이 해당 수량을 현재 재고에서 차감하고 단가를 작업 지시의 총비용에 기록합니다.

::: tip 참고
부품이 재고 부족 기준값 아래로 떨어지면 부품 관리자와 관리자에게 재고 부족 알림이 전송됩니다.
:::

## 4. 저장

항목이 작업 지시의 비용 내역에 표시됩니다. 이제 재고 품목의 거래 내역에 이 작업 지시와 연결된 기록이 추가됩니다.

![작업 지시 비용 내역에 반영된 사용 부품](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/10-part-consumed-on-work-order.png)

![모바일 현장 비용 카드](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/mobile/05-mobile-field-costs-card.png)

## 관련 문서

- [재고 품목 추가하기](../inventory-parts/add-inventory-item)
- [부품 조회로 부품 찾기](../inventory-parts/part-lookup-search)
