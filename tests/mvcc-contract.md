# MVCC 계약

- 삽입 레코드는 생성 transaction id를 가진다.
- 삭제는 기존 레코드를 제거하지 않고 삭제 transaction id를 기록한다.
- reader transaction은 자신이 볼 수 있는 생성 버전만 읽는다.
- reader 시작 이후의 삭제는 기존 reader에게 영향을 주지 않는다.
- 이후 reader에게 삭제된 버전은 보이지 않는다.

현재 구현은 단일 프로세스 기준선이다. 실제 COMMIT 경계, 롤백, 잠금,
격리 수준과 WAL 원자성은 저장 엔진 통합 단계에서 검증한다.
