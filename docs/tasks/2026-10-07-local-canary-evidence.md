# 2026-10-07 local canary·rollback 증거

- `.freelang/canary.sh`가 current artifact SHA-256을 만든다.
- artifact smoke와 production native TLS integration을 실행한다.
- current artifact를 previous artifact로 복사하고 hash를 비교한 뒤 rollback
  선택 계약을 실행한다.
- cloud traffic canary, 외부 alert webhook, 실제 서비스 전환은 cloud 운영
  권한이 없어 아직 상용 PASS로 올리지 않는다.
