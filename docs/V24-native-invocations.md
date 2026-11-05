# V-24 native 호출 부분 이관

`chore/v24-fl-gate`에서 시험 판정, 기대값, 제한시간, 기존 러너는 유지하고 다음 세 호출만 변경했다.

| 항목 | 기존 시험의 기대 결과 | native 실행 결과 | 커밋 |
|---|---|---|---|
| production TLS boundary | TLS 없는 외부 bind 거부, PASS | rc=0, PASS | dc00fcc |
| fault writer | READY 확인 후 강제 종료 | 복구 시험 전체 rc=0, PASS | 659805a |
| fault replay | committed 행만 복구, PASS | rc=0, PASS | 769022f |

원래 Node 실행과의 동등성 측정은 완료하지 않았다. 위 표의 기존 열은 원본 시험의 기대값이며 측정된 이전 실행 결과가 아니다. 첫 writer 커밋에서는 두 호출을 native로 전환한 임시 시험 사본으로 전체 계약을 확인했고, 두 번째 커밋에서는 변경된 정식 스크립트로 다시 확인했다.

## 실행 준비

실행 파일은 동일한 FreeLang 입력에서 미리 만든 native 바이너리다. 외부에서 제공한 실행 파일의 올바른 출처와 입력 버전은 호출자가 확인해야 한다. 바이너리나 생성 C는 커밋하지 않았다. `AFJ_BOOTSTRAP` 검사는 원본 그대로 남아 있으며, 기존 Stage3 실행 파일을 지정했다. Stage0를 만들거나 변경하지 않았다.

기존 Stage3와 FX 런타임으로 두 입력을 빌드하는 예시다. 경로 변수는 실제 깨끗한 복제본과 임시 출력 폴더로 지정한다. curl 개발 헤더와 링크 라이브러리를 찾을 수 있는 빌드 환경이 필요하다.

```bash
# FX_ROOT, COMPILER(기존 Stage3), NATIVE_OUT은 호출자가 지정한다.
mkdir -p "$NATIVE_OUT"
sources=()
for name in core collection io math error process json aliases user-fns gc \
            http raw_tcp websocket sqlite mariadb debug http_client regex smtp sse; do
  sources+=("$FX_ROOT/runtime/$name.c")
done
for input in src/tcp-server tests/fault-injection-restart; do
  name=${input##*/}
  "$COMPILER" "$PWD/$input.fls" "$NATIVE_OUT/$name.c" || exit
  gcc -O2 -w -rdynamic -Werror=implicit-function-declaration \
    -I "$FX_ROOT/runtime" -o "$NATIVE_OUT/$name" \
    "$NATIVE_OUT/$name.c" "${sources[@]}" \
    -lm -lpthread -ldl -lsqlite3 -lssl -lcrypto -lcurl || exit
done
export AFJ_BOOTSTRAP="$COMPILER"
export AFJ_DB95_REPO_ROOT="$PWD"
export AFJ_NATIVE_TCP_SERVER_BIN="$NATIVE_OUT/tcp-server"
export AFJ_NATIVE_FAULT_BIN="$NATIVE_OUT/fault-injection-restart"
bash tests/production-tls-boundary.sh
bash tests/fault-injection-restart.sh
```

writer의 stdout이 파일로 연결되므로 호출에 `stdbuf -oL`을 사용했다. 이 옵션 없이 시도한 두 실행은 READY 로그가 없어 rc=1이었다. 추적에서 READY의 stdout 쓰기는 없었고 정리 단계의 SIGKILL을 확인했다. 옵션 적용 후 원본의 대기·종료·복구 판정을 그대로 통과했다.

## 현재 막힘

같은 Stage3와 FX aa949bfc 런타임으로 기존 FreeLang 시험을 native 빌드해 실행했다.

| 시험 | 결과 | 근거 |
|---|---|---|
| silent-batch-index | rc=1 | INDEX_MISMATCH; commit=true인데 index=0, scan=1, 두 hash 불일치 |
| silent-wal-recovery | rc=1 | oversized WAL was accepted |

위 실패를 통과시키려면 호출 변경 외의 원인 조사가 필요하다. 실패한 시험의 호출은 변경하지 않았다. gate의 FreeLang 호출과 JavaScript 14건도 변경하지 않았다. 허용 10건 중 3건만 이관했으며 V-24 완료를 주장하지 않는다.
