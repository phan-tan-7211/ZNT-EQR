---
title: "Google Workspace 연결"
description: "Google Workspace 디렉터리를 사용해 사용자, 그룹 및 관리자 제어를 ZNTEQR에 동기화합니다."
lastReviewed: 2026-06-13
personas: ["admin","owner"]
requirement: "도메인의 Google Workspace 최고 관리자이면서 ZNTEQR 조직 소유자 또는 관리자여야 합니다."
---

**대상:** 관리자, 소유자\
**최종 검토:** 2026-06-13

::: info 요구 사항
도메인의 Google Workspace 최고 관리자이면서 ZNTEQR 조직 소유자 또는 관리자여야 합니다.
:::

## Google Workspace 연결

1. **대시보드 → 조직 → 연동**을 엽니다(처음 설정하는 경우 **대시보드 → 온보딩 → 작업 공간**).
2. **Google Workspace 연결**을 클릭하고 Google Workspace 관리자 계정으로 로그인합니다.
3. Google 동의 화면에서 **디렉터리** 범위를 승인합니다. ZNTEQR는 온보딩 직후 구성원 가져오기와 디렉터리 동기화를 바로 시작할 수 있도록 먼저 신원 정보와 `admin.directory.user.readonly`를 요청합니다.
4. Google Drive 내보내기 대상을 구성하거나 연동 페이지에서 **인증 완료**를 클릭하면, ZNTEQR는 증분 승인(`include_granted_scopes=true`)을 사용해 Drive, Docs 및 Sheets 범위를 **필요한 시점에** 요청합니다.

## 인증 완료(내보내기 범위)

Google Workspace에 **권한 필요**가 표시되면 디렉터리 동기화는 연결되었지만 내보내기 범위가 아직 없는 상태입니다. **인증 완료**를 클릭하면 디렉터리 동의 단계를 반복하지 않고 Drive, Docs 및 Sheets 권한을 부여할 수 있습니다.

## 구성원 동기화 및 가져오기

연결한 후 연동 페이지 또는 작업 공간 설정에서 **디렉터리 동기화**를 사용한 다음, ZNTEQR로 가져올 사용자를 선택하세요.

## Google Workspace 연결 해제

조직 소유자와 관리자는 연동 페이지 또는 작업 공간 설정에서 Google Workspace를 **연결 해제**할 수 있습니다. 연결을 해제하면 다음과 같이 처리됩니다.

- ZNTEQR의 Google OAuth 액세스가 취소됩니다
- 캐시된 Workspace 디렉터리 스냅샷이 지워집니다
- **작업 공간 도메인 클레임이 해제되어** 온보딩을 처음부터 다시 시작할 수 있습니다

조직 구성원과 ZNTEQR 데이터는 유지됩니다. 연결을 해제한 후 준비가 되면 **작업 공간 설정**으로 돌아가 다시 연결하세요.

::: tip 참고
Workspace 동기화는 선택 사항입니다. 사용자를 계속 수동으로 초대할 수 있으며 ZNTEQR의 나머지 기능은 동일하게 작동합니다.
:::
