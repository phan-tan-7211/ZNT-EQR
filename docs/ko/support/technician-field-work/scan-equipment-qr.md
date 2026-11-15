---
title: "휴대폰으로 설비 QR 코드 스캔하기"
description: "휴대폰 기본 카메라 앱으로 올바른 조직이 이미 선택된 상태에서 ZNTEQR의 설비 기록을 엽니다."
lastReviewed: 2026-07-06
personas: ["technician","requestor"]
---

**대상:** 기술자, 요청자  
**최종 검토일:** 2026-07-06
ZNTEQR QR 코드는 일반 URL이므로 별도의 앱이 필요하지 않습니다. 휴대폰 카메라가 브라우저에서, 또는 ZNTEQR 앱이 설치되어 있으면 앱에서 기록을 바로 엽니다.

![QR 스캔으로 열린 설비 기록](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/01-scan-qr-landing.png)

![QR 코드를 스캔한 후의 모바일 설비 기록](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/mobile/01-mobile-scan-qr-landing.png)

## 1. 카메라 앱 열기

휴대폰을 QR 코드에서 한 뼘 정도 떨어뜨려 듭니다. iOS와 Android는 QR 코드를 자동으로 인식하므로 타사 스캐너가 필요하지 않습니다.

## 2. 알림 배너 누르기

카메라에 `https://eqr.zinitek.com/qr/equipment/<id>`와 같은 링크가 표시됩니다. 링크를 눌러 설비 기록을 엽니다.

## 3. 요청이 나타나면 로그인하기

아직 로그인하지 않았다면 ZNTEQR이 먼저 로그인을 요청합니다. 인증이 끝나면 스캔한 설비로 다시 돌아갑니다.

::: tip 참고
둘 이상의 조직에 속해 있는 경우 ZNTEQR이 스캔한 설비를 소유한 조직으로 자동 전환합니다.
:::

## 4. 설비 헤더 확인하기

조치를 취하기 전에 설비 이름, 제조사/모델, 일련번호가 눈앞에 있는 설비와 일치하는지 확인합니다.

## 관련 문서

- [설비에서 작업 지시 생성하기](./create-work-order-from-equipment)
- [요청자로 작업 요청 제출하기](../work-orders/submit-request-as-requestor)
