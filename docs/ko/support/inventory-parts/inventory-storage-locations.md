---
title: "재고 보관 위치"
description: "위치 이름 별칭과 구조화된 보관 주소, 조직 기본값, 부품별 재설정, 지도에서의 길찾기를 구분해 설명합니다."
lastReviewed: 2026-07-04
personas: ["admin","owner","manager"]
requirement: "보관 주소를 편집하려면 소유자, 관리자 또는 지정된 부품 관리자여야 합니다."
---

**대상:** 관리자, 소유자, 매니저  
**최종 검토일:** 2026-07-04

::: info 필요 권한
보관 주소를 편집하려면 소유자, 관리자 또는 지정된 부품 관리자여야 합니다.
:::

재고 부품에는 서로 다른 두 가지 위치 개념이 있습니다.

| 필드 | 용도 |
| --- | --- |
| 품목 양식의 **위치 이름** | "선반 A-3"이나 "트럭 4"처럼 사람이 알아보기 쉬운 별칭입니다. 지도 핀에는 영향을 주지 않습니다. |
| **보관 주소** | 지도, 상속, Google Maps 길찾기에 사용되는 구조화된 도로명 주소 또는 지도 좌표입니다. |

## 조직 기본값

소유자와 관리자는 **조직 → 설정 → 재고 기본 위치**에서 조직 전체의 기본값을 설정합니다. 모든 부품은 자체 재설정 주소를 저장하기 전까지 이 주소를 상속받습니다.

![조직의 재고 기본 위치](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/07-organization-inventory-default.png)

기본 위치는 팀 위치와 마찬가지로 Places 검색, 중앙 핀을 이용한 지도 조정, **현재 위치 사용**을 지원합니다.

## 부품별 재설정

재고 품목 상세 페이지를 엽니다. **보관 주소** 블록에는 해당 부품이 조직 기본값을 상속받는지, 자체 구조화 필드를 사용하는지가 표시됩니다. **주소 재설정**을 선택하면 부품 전용 좌표를 설정할 수 있고, **부품 주소 편집**으로 기존 재설정 주소를 수정할 수 있습니다.

![재고 품목의 실제 적용 보관 위치](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/06-inventory-item-effective-location.png)

## 지도와 길찾기

좌표가 있으면 상세 페이지에 읽기 전용 미니 지도가 표시됩니다. 지도나 주소를 누르면 Google Maps 길찾기가 열립니다. 기술자가 선반 라벨만이 아니라 자재 창고나 야적장 보관 구역까지 찾아가야 할 때 유용합니다.

![모바일 재고 지도와 길찾기](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/mobile/04-inventory-item-map-directions.png)

## QR 코드는 위치를 변경하지 않습니다

재고 QR 코드를 스캔하면 수량 조정이나 조회 컨텍스트만 처리됩니다. 보관 주소 필드에는 절대 기록하지 않습니다.

## 관련 문서

- [재고 품목 추가](./add-inventory-item)
- [조직 설정 둘러보기](../admin-integrations/organization-settings)
- [설비 위치 출처와 지도](../equipment-qr/location-sources-and-maps)
