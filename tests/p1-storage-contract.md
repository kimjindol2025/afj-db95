# P1 저장소 계약

## WAL 포맷

WAL은 UTF-8 JSON Lines 파일이다. 한 줄은 하나의 논리 변경 이벤트이며,
최소한 `op`와 대상 테이블을 포함한다.

```json
{"op":"insert","name":"users","row":{"id":1}}
```

## 요구사항

- `open-store(path)`는 파일이 없으면 생성하고 기존 이벤트를 재생한다.
- 변경 API는 메모리 변경과 함께 WAL 한 줄을 append한다.
- 복구 중에는 WAL을 다시 append하지 않는다.
- `close-store()` 이후 새 변경은 메모리 전용이어야 한다.
- 손상된 JSON 라인은 정상 이벤트로 취급하지 않는다.
- 페이지 payload가 4096 bytes를 넘으면 `PAGE_TOO_LARGE`로 거부한다.
- 손상 WAL JSON은 `WAL_CORRUPT` 오류로 중단한다.

실제 smoke test는 파일을 닫은 뒤 다시 열어 WAL만으로 행을 복구하는
재시작 경로를 검증한다.

현재 구현은 파일 append/read까지 포함하며, 페이지 파일·체크섬·fsync·손상
라인 차단은 다음 P1 하위 단계에서 추가한다.
