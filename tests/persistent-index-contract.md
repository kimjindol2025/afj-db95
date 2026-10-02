# 페이지-backed 인덱스 계약

`persistent-index.fls`는 B+Tree snapshot을 AFJ 페이지 포맷으로 저장한다.

- 페이지 재오픈 후 중복 키 row-id가 동일하다.
- page magic/version/length/checksum 검증을 통과해야 읽는다.
- magic이 손상된 index page는 복구하지 않고 오류로 거부한다.

현재는 snapshot 기준선이며, 후속 단계에서 index 변경 WAL과 증분 페이지
flush를 연결한다.
