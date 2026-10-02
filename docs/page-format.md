# AFJ-DB 페이지 포맷 v1

페이지는 현재 JSON 객체로 구현한 개발 포맷이다.
개발 기준 페이지 payload 상한은 4096 bytes다.

```json
{
  "magic": "AFJPG",
  "version": 1,
  "length": 42,
  "checksum": "sha256...",
  "payload": {}
}
```

검증 순서:

1. JSON parse
2. `magic` 확인
3. `version` 확인
4. payload 직렬화 길이 확인
5. payload SHA-256 확인

이 포맷은 P1 개발용 기준선이다. 공식 1.0 전에는 고정 크기 바이너리
페이지와 원자적 flush 포맷으로 교체하고 migration 버전을 제공한다.
