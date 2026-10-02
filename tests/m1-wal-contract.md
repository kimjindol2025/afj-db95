# M1 WAL 계약

CRUD 변경은 논리 이벤트를 append-only 순서로 기록한다.
카탈로그를 비운 뒤 이벤트를 순서대로 재생하면 동일한 행 상태가 복원되어야 한다.

현재 WAL은 프로세스 메모리 안에만 존재한다. 파일 flush와 crash recovery는 아직 미완성이다.
