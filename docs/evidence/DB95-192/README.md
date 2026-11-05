# DB95-192 검수 증거

실제 실행 로그의 컴파일 입력/출력 절대 경로를 `<가림>`으로 치환했다. PASS 문구·오류·종료 코드는 바꾸지 않았다. 생성 C·실행 파일·개인 경로·인증 정보는 포함하지 않는다.

- isolated-12/39: 수정본의 단독 실행. 두 result 모두 EXIT=0.
- baseline-12/39: 기준 DB95 소스 + 현재 FX runtime. 수정 전 원인 대조이며 EXIT=1은 실제 실패다.
- gate7-old: 기준 DB95 소스 + 기준 FX runtime. 원래 GATE의 case 7 단독 실패 재현.
- subset-*: 지정 목록의 이번 재실행. case 9는 실행 없이 HOLD 파일로 기록한다.
- checkpoint.*: 앞선 별도 프로세스 생성/복원 기록. 이번 목록 실행과 구별한다.
- baseline-12-history.txt: 이번 전용 baseline 저장 페이지의 history 추출. id=1 누락 확인.
- map-only.patch: 기준 DB95 제품 코드와 수정본의 정확한 차이.
- original-tests.sha256: 원본 러너 2개 및 case 12/39 시험의 보존 검증.
- run-review.sh.txt: 실제 임시 보조 스크립트의 사본. 기존 러너를 수정하지 않는다. 사전 준비된 baseline archive·Stage4·linker 경로가 필요하며 독립 실행형 배포 스크립트가 아니다.

기준 소스는 `git archive c315ef23`으로 작업 전용 baseline 디렉터리에 펼쳤다. GATE case 7에만 FX `a9ffce18`의 runtime archive를 사용했다. case 12/39 대조와 subset은 같은 현재 runtime을 링크했다. 각 실행은 worker의 120초 제한, 2GiB 상한, 공용 flock 아래 실행됐다.

반복 시험의 별도 QA 증거는 FX 저장소의 대응 검수 브랜치 docs/evidence/DB95-192에 있다. 두 저장소의 검수 브랜치명은 review/db95-191-native-fixes다. 이 증거는 전체 71건 통과·릴리스 승인·장애 내구성 시험을 의미하지 않는다.
