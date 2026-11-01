# DB95-1 조용한 버그 수정 기록

실행 위치: <가림>의 격리 작업트리. 23·25번 서버 접속·실행 없음. blog1 코드 변경 없음.

## 버그 1: 일괄 수정 후 색인

재현 시험을 본체 수정 전에 커밋했다. 시작 커밋 원본 코드에서 같은 재현 시험을 실행한 결과:

```text
DB95_INDEX_BATCH index=1 scan=1 index_hash=97ad4582c88d05a4ba593e4b9414633157c063f614f9b2b7aefe32657a37403d scan_hash=97ad4582c88d05a4ba593e4b9414633157c063f614f9b2b7aefe32657a37403d
PASS silent-batch-index
DB95_INDEX_MERGE commit=true index=0 scan=1 index_hash=4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 scan_hash=d6e76bc50ca326c8698458b203f62655bd23c3e401a902683c550d5d19e41dfb
INDEX_MISMATCH
DB95_INDEX_BASELINE_EXIT=1
```

수정본에서 이전 페이지 색인을 폐기하고 새 색인을 만들었다. 저장된 색인과 행이 다르면 `INDEX_MISMATCH`를 던진다.

```text
DB95_INDEX_MERGE commit=true index=1 scan=1 index_hash=d6e76bc50ca326c8698458b203f62655bd23c3e401a902683c550d5d19e41dfb scan_hash=d6e76bc50ca326c8698458b203f62655bd23c3e401a902683c550d5d19e41dfb
PASS silent-merged-batch-index
PASS silent-index-mismatch-error
```

## 버그 2: WAL 복구

원본 코드에서 일반 WAL 3,200건은 행 수와 해시가 일치했다. 이 실행만으로 재귀 버그를 재현했다고 주장하지 않는다.

```text
DB95_WAL_BEFORE count=3200 hash=6cb42d932e53e72082f6467c770398e190997d463b4c9dcf2cec449ae60e16cf
DB95_WAL_AFTER count=3200 hash=6cb42d932e53e72082f6467c770398e190997d463b4c9dcf2cec449ae60e16cf
PASS silent-wal-recovery
```

원본 TCP WAL 3,200건 시험은 복구 후 출력 없이 360초 제한에 도달했다. `DB95_TCP_BASELINE_EXIT=124`이고 복구 후 행 수·해시는 출력되지 않았다. 이는 제한 시간 안에 결과를 얻지 못했다는 재현이며, 잘못된 행 수가 출력됐다는 뜻은 아니다. 반복 방식의 읽기로 바꾸고 완전한 손상 기록·빈 기록·알 수 없는 기록·준비 없는 확정 기록을 `WAL_CORRUPT`로 거부하도록 수정했다. 기존 시험이 허용하는 미완성 마지막 조각은 완전한 기록과 구분한다.

원본 일반 WAL의 손상 기록 검사는 빈 완전 기록을 조용히 넘기는 문제를 드러냈다.

```text
PASS silent-wal-corrupt-tail
PASS silent-wal-corrupt-middle
WAL_CORRUPT_NOT_RAISED
DB95_WAL_BASELINE_EXIT=1
```

수정본의 TCP WAL 3,200건 시험 출력:

```text
DB95_TCP_WAL_BEFORE count=1 hash=77c3d51fff42c8bc7142a607f6c55de0d2e59adc3d3d1c62e3405c355021a1e6
DB95_TCP_WAL_AFTER count=1 hash=77c3d51fff42c8bc7142a607f6c55de0d2e59adc3d3d1c62e3405c355021a1e6
PASS silent-tcp-wal-recovery
PASS silent-tcp-wal-corrupt-commit
PASS silent-tcp-wal-blank-record
PASS silent-tcp-wal-unknown-record
PASS silent-tcp-wal-orphan-commit
DB95_TCP_FIXED_EXIT=0
```

수정본 일반 WAL의 행 수·해시와 오류 검사:

```text
DB95_WAL_BEFORE count=3200 hash=6cb42d932e53e72082f6467c770398e190997d463b4c9dcf2cec449ae60e16cf
DB95_WAL_AFTER count=3200 hash=6cb42d932e53e72082f6467c770398e190997d463b4c9dcf2cec449ae60e16cf
DB95_WAL_COUNTS events=3201 rows=3200 first=value-0
PASS silent-wal-recovery
PASS silent-wal-corrupt-tail
PASS silent-wal-corrupt-middle
PASS silent-wal-blank-record
PASS silent-wal-unknown-operation
DB95_WAL_DIAGNOSTIC2_EXIT=0
```

## 기존 시험 전체와 3회 반복

재현 시험 세 개를 묶은 집계 스크립트를 실행 전에 별도 커밋했다. 수정본에서 동일 묶음을 연속 3회 실행한 원문:

```text
DB95_FIXED_RUN_PASS=1
DB95_FIXED_RUN_PASS=2
DB95_FIXED_RUN_PASS=3
DB95_THREE_PASS=3/3
DB95_THREE_PASS_EXIT=0
```

`release-gate.sh`의 기존 71개 항목은 모두 실행했다. 기대값과 문턱값은 바꾸지 않았다. 결과 원문:

```text
DB95_GATE_PASS=61 FAIL=10 TIMEOUT_120S=1 SKIP=0 TOTAL=71
DB95_RELEASE_GATE_EXIT=1
```

실패 항목 원문:

```text
[release-gate] END case=9 status=FAIL elapsed=18s label=local canary rollback
[release-gate] END case=25 status=FAIL elapsed=24s label=TCP 5m performance envelope
[release-gate] END case=60 status=FAIL elapsed=16s label=native TLS listener
[release-gate] END case=61 status=FAIL elapsed=15s label=native TLS mTLS/reload
[release-gate] END case=62 status=FAIL elapsed=21s label=production native TLS integration
[release-gate] END case=63 status=FAIL elapsed=120s label=TLS adapter handshake/reload
[release-gate] END case=67 status=FAIL elapsed=7s label=MariaDB standard-client smoke
[release-gate] END case=68 status=FAIL elapsed=8s label=native MariaDB wire
[release-gate] END case=69 status=FAIL elapsed=13s label=native MariaDB auth rejection
[release-gate] END case=71 status=FAIL elapsed=9s label=native MariaDB prepared
```

제한시간 초과 1건은 63번의 게이트 제한시간 120초 도달이다. 다른 항목의 연결·요청 시간초과는 위 실패 10건에 포함된다. 9번의 TCP 연결 시간초과는 시작 커밋 원본에서도 같은 실행기로 재현됐다. 이는 수정 전에도 있던 실패라는 근거이며, 나머지 실패가 모두 기존 실패였다는 뜻은 아니다. 실행기의 실제 TCP 이벤트 콜백 인수 수와 서버 핸들러 선언이 다른 점을 조사했지만, 이번 두 버그와 별도이며 IP 제한 동작까지 영향을 주므로 실험 변경을 본 가지에 넣지 않았다.

## 판정

- 버그 1 재현: 통과.
- 버그 1 수정과 `INDEX_MISMATCH`: 통과.
- 버그 2 재현: TCP 3,200건은 원본에서 360초 시간초과, 원본 일반 WAL의 빈 기록 무시 재현.
- 버그 2 반복 읽기와 `WAL_CORRUPT`: 통과.
- 기존 시험 실패 0건: **미달**. 71건 중 실패 10건.
- 두 원격 푸시: Forgejo 다음 GitHub 순서로 수행하고, 최종 HEAD는 채팅에 원문 기록.

커밋 전 diff 검사: `git diff --check`와 시작 커밋부터의 `git diff --check` 모두 오류 0건. 추가 줄과 보고서의 인증 URL·토큰·비밀키·로컬 절대 경로 패턴 검사 각각 0건. 이 패턴 검사는 모든 종류의 비밀을 증명하는 검사는 아니다.

DB95_SUMMARY=5/6
