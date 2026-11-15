---
title: "설비 위치 출처와 지도"
description: "적용 위치, 팀 대체 위치, 설비별 재정의, 스캔 GPS, 설비 지도 필터링, 인라인 주소 수정, 실시간 위치 캡처를 이해합니다."
lastReviewed: 2026-07-04
personas: ["admin","owner","manager","technician"]
---

**대상:** 관리자, 소유자, 매니저, 기술자  
**최종 검토일:** 2026-07-04

ZNTEQR은 여러 출처를 바탕으로 설비 핀의 위치를 결정합니다. 재정의를 저장하기 전까지는 원본 기록을 변경하지 않고도 설비 상세 지도, 설비 지도, 작업 지시 상세 페이지에서 각 출처를 미리 볼 수 있습니다.

## 적용 위치 결정 순서

1. **마지막으로 확인된 스캔 GPS** — QR 스캔 위치 수집이 활성화되어 있고 최근 스캔에서 좌표가 수집된 경우.
2. **설비 지정 주소** — 설비 기록에 저장된 도로명 주소 또는 지도 핀.
3. **기존 위치 텍스트** — 이전의 자유 입력 위치 값(좌표가 있으면 함께 사용).
4. **팀 위치** — 팀에서 **설비 위치 재정의**를 활성화했고 설비가 여전히 팀 대체 위치를 사용하도록 설정된 경우에만 해당합니다.

**적용 위치** 출처는 이 순서에서 최종 선택된 위치를 보여 줍니다. 헤더 드롭다운의 다른 출처를 사용하면 팀 본부, 설비 주소, 최근 스캔을 나란히 비교할 수 있습니다.

## 설비 지도 출처 필터

설비 지도의 **위치 출처**를 사용하여 설비 상세에서 보는 것과 동일한 출처 라벨로 마커에 색을 입히고 필터링합니다.

![설비 지도 위치 출처 필터](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/01-fleet-map-source-filter.png)

## 설비 상세 지도 카드

위치 카드의 헤더는 드롭다운입니다. **적용 위치**, **팀 위치**, **설비 위치** 또는 **최근 스캔 위치**를 선택하여 미니 지도와 주소 행에 표시되는 내용을 변경합니다.

![설비 상세 위치 출처 드롭다운](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/02-equipment-detail-location-source.png)

### 인라인 주소 작업

주소 행에 마우스를 올리면(모바일에서는 항상 표시됨) 다음이 나타납니다.

- **연필** — Google Places로 도로명 주소를 입력하거나 검색합니다.
- **내비게이션 아이콘** — 기기 GPS를 이용한 실시간 위치 캡처를 엽니다.

![인라인 설비 주소 작업](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/03-equipment-inline-address-actions.png)

### 실시간 위치 캡처

실시간 캡처를 실행하면 핀이 중앙에 고정된 지도가 열립니다. 지도를 움직여 조정한 다음 확인하세요. 좌표만 저장하는 경우(도로명 주소 없음)에도 설비 지정 위치로 저장되며 팀 대체 위치는 비활성화됩니다.

![실시간 위치 캡처 모달](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/04-live-location-modal.png)

### 팀 대체 위치

팀이 설비 위치를 재정의하는 경우, 헤더 드롭다운을 **팀 위치**로 전환하면 설비에 저장된 고유 주소를 제거하지 않고도 팀 본부 핀을 미리 볼 수 있습니다.

![팀 대체 위치 미리보기](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/05-equipment-team-location-fallback.png)

## 작업 지시에 포함된 지도

설비가 연결된 작업 지시는 데스크톱에서 동일한 위치 출처 드롭다운과 미니 지도를 표시합니다. 모바일에서는 **설비 상세**를 펼치면 지도 컨트롤이 나타납니다.

![작업 지시 위치 지도](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/09-work-order-location-map.png)

## 모바일 현장 보기

이제 모바일 설비 상세에도 헤더 아래에 동일한 위치 카드가 포함됩니다. 기술자는 현장에서 출처를 변경하고, 인라인으로 수정하고, 실시간 GPS를 캡처할 수 있습니다.

![모바일 설비 위치 출처](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/mobile/01-equipment-detail-location-source.png)

![모바일 인라인 주소 작업](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/mobile/02-equipment-inline-address-actions.png)

## 데스크톱 안내 영상

https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/desktop/demo.mp4

## 모바일 안내 영상

https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/location-maps/mobile/demo.mp4

## 관련 문서

- [설비 지도 사용하기](./fleet-map-basics)
- [설비 추가하기](./add-equipment)
- [팀과 역할에 관한 자주 묻는 질문](../teams-roles/multi-team-questions)
- [작업 지시 수명 주기 참조](../work-orders/work-order-lifecycle)
- [재고 보관 위치](../inventory-parts/inventory-storage-locations)
