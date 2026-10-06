# 서버 코딩용 내부 배포 계약

이 계약은 AFJ-DB95를 외부 서비스나 상용 release로 공개하지 않고, 이 서버에서
FreeLang 개발·검증용으로 고정 커밋을 실행하는 절차다.

## 범위

- 소스 정본: `/home/kim/kim/projects/afj-db95`
- 실행 기준: 현재 Git `HEAD` 커밋
- 진입점: `/home/kim/kim/projects/freelang-tools/scripts/fl-tools`
- 배포 명령: `fl-tools deploy --internal /home/kim/kim/projects/afj-db95`
- 기본 내부 배포 루트: `/home/kim/kim/projects/.internal/afj-db95`
- DB 위치: `<내부 배포 루트>/shared/db`
- 외부 SSH, 공용 포트, 상용 PM2 서비스, 상용 release gate는 범위 밖이다.

## 흐름

```text
고정 Git HEAD
  → dirty worktree 차단
  → .freelang/check.sh
  → .freelang/smoke.sh
  → releases/<commit>에 복사
  → current 심볼릭 링크 원자 교체
  → previous에 직전 current 보존
```

각 release는 커밋 해시 디렉터리로 보존된다. `current`만 실행 대상이며,
프로젝트 DB는 release 사이에서 유지되는 `shared/db`를 가리킨다.

## 실행과 rollback

```bash
fl-tools start /home/kim/kim/projects/afj-db95
fl-tools review /home/kim/kim/projects/afj-db95
fl-tools deploy --internal /home/kim/kim/projects/afj-db95

FREELANG_INTERNAL_ROOT=/home/kim/kim/projects/.internal/afj-db95 \
  bash /home/kim/kim/projects/afj-db95/.freelang/internal-rollback.sh
```

rollback은 `current`와 `previous`를 교환한다. 첫 배포처럼 previous가 없으면
BLOCKED가 정상 결과다. dirty worktree 우회는 기본 허용하지 않는다.

## 판정

- `INTERNAL_DEPLOY=PASS`: check·smoke·고정 커밋 release 복사·current 교체 완료
- `INTERNAL_ROLLBACK=PASS`: 직전 내부 release로 current 교체 완료
- `BLOCKED`: bootstrap, 계약, 고정 커밋, previous release 등 필수 조건 부족

이 계약의 PASS는 “이 서버 내부 개발용 반영”만 의미하며, 외부 공개나 상용 운영
승인을 의미하지 않는다.
