---
title: "작업 지시에 메모와 사진 추가하기"
description: "발견한 내용과 수행한 작업을 기록하고 작업 전/중/후 사진을 첨부합니다. 모두 설비의 이미지 갤러리에서 볼 수 있습니다."
lastReviewed: 2026-07-06
personas: ["technician","manager"]
---

**대상:** 기술자, 매니저  
**최종 검토일:** 2026-07-06
메모와 사진은 모든 작업 지시의 감사 추적 기록입니다. 작업 지시에 업로드한 이미지는 설비의 이미지 탭에도 표시되므로, 다음 기술자가 이전 상태를 확인할 수 있습니다.

![작업 지시의 메모 작성 창](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/06-add-note-composer.png)

![메모 및 업데이트 목록에 저장된 메모](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/desktop/07-note-added.png)

![모바일 메모 작성 창](https://wgynakhoppqkrutnslmv.supabase.co/storage/v1/object/public/docs-media/support/technician-field-work/mobile/04-mobile-note-composer.png)

## 1. 작업 지시 열기

작업 지시 상세 정보 아래의 메모 섹션까지 스크롤합니다.

## 2. 메모 내용 입력

- **메모 내용** — 발견한 내용, 수행한 작업, 그 밖의 중요한 관찰 사항.
- **작업 시간** — 이번 작업에 들인 시간.
- **비공개 메모** — 내부용 관찰 사항일 때 켭니다. 고객(요청자와 조회자)은 비공개 메모를 볼 수 없습니다.

## 3. 이미지 첨부

이미지(선택 사항) 섹션에서 **파일 선택**을 탭하고 사진을 한 장 이상 선택합니다. 메모당 최대 10개의 이미지를 업로드할 수 있습니다. 지원 형식: JPG, PNG, GIF, WebP. 파일당 최대 10 MB.


## 4. 메모 저장

메모 추가(사진을 첨부한 경우 이미지 X개 업로드)를 탭하여 저장합니다. 메모는 메모 및 업데이트 목록에 즉시 표시됩니다.

::: tip 참고
업로드에 실패하면 파일 크기와 네트워크 상태를 확인하세요. Supabase가 잠시 재시도하지만, 업로드를 완료할 수 없으면 명확한 오류 메시지를 표시합니다.
:::

## 관련 문서

- [설비 대표 이미지 설정하기](../equipment-qr/set-equipment-display-image)
- [예방정비(PM) 체크리스트 완료하기](./pm-checklist)
