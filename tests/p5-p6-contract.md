# P5/P6 계약

## 인증·권한

- 비밀번호는 평문으로 저장하지 않는다.
- 사용자에는 하나의 역할을 연결한다.
- 역할은 명시적 permission 목록을 갖는다.
- 인증 실패와 권한 실패를 분리한다.

## 백업

- 백업 원본이 없으면 실패한다.
- 백업과 복원은 파일 복사로 동작한다.
- manifest에 크기·수정 시각·SHA-256을 기록한다.

`server-engine.fls`에서 인증 session·권한·prepared statement를 실제 SQL
engine 실행과 연결했다. 현재 transport 암호화와 다중 프로세스 연결 수명은
별도 릴리스 게이트다.
