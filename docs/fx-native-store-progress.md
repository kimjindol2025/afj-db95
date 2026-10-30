# fx native 저장소 진입점 검증

## 확인한 것

원래 소스 기준은 `88b4aa2ca11e5355240a1d93ece8321315c669cc`, 정답·시험 고정은 `03fb1635441fe6fbf0897e33f92bb6216cfa6564`, 구현은 `993ac6cabb09842289fe659316ade17d4185f0aa`다. 별도 feat/fx-native-store 가지에서만 작업한다. 사용자 확정 .fl·fx C 규칙에 따라 새 모듈은 FreeLang .fl이며 기존 .fls와 시험은 보존했다.

src/native-store.fl은 in-process 사용을 위한 database 소유 모듈이다. WAL 회복의 반복 순회, catalog 검증/공개/commit의 공통 recursive atom guard, 첫 append 전 raw forensic 보관·fsync와 마지막 frame 복구, 저장 오류 뒤 읽기/쓰기 차단과 불확실 commit 판정을 제공한다. 블로그 표나 app/store를 로드하지 않는다. 기존 WAL 형식·정상 committed prefix는 유지하며 원래 tcp-server/engine 소스는 바꾸지 않았다. 모듈을 로드해도 서버를 시작하지 않는다.

원래 DB는 합성 prepare 일부·prepare 뒤 commit 일부·LF 누락·invalid UTF-8·NUL의 다섯 경우 모두 새 쓰기에 성공하지만 다음 재시작에서 WAL_CORRUPT였다. 실패는 `DB95_TAIL_GROUP_PASS=5 FAIL=50`, `DB95_TAIL_BEFORE_EXIT=1`이다. 정답·실패는 구현 전에 보존했다. 새 모듈의 ASan/UBSan 실측은 같은 55묶음에서 다음과 같다.

```text
DB95_TAIL_GROUP_PASS=55 FAIL=0
DB95_NATIVE_TAIL_EXIT=0
DB95_TAIL_FORENSIC_PASS=5 FAIL=0
DB95_TAIL_PREFIX_PASS=5 FAIL=0
DB95_INDEX_GROUP_PASS=11 FAIL=0
DB95_NATIVE_INDEX_EXIT=0
NODE=0 NPM=0 NPX=0 JS=0 PYTHON=0
```

각 경우 resume 뒤 독립 과정 10회에서 정확한 두 행·한글/이모지와 WAL 불변이다. 원본 전체 forensic byte·기존 prefix도 독립 비교했다. index-scan·다중 AST 수정/삭제/재삽입·실패 rollback·별도 재시작 10회도 통과했다. 기존 DB 원본의 인덱스 최소 기준 역시 11묶음 통과했으므로 인덱스 전체를 새로 구현했다고 주장하지 않는다.

## 명령과 원문

검증한 fx runtime 구현은 `043151bd578774b86d8a1de7760b071137cd407b`다. 외부 runtime 빌드와 C fault/sanitizer는 검증 도구이며 저장소 알고리즘은 FreeLang이다. strace execve 아래 fx 저장소의 verify-l05-db95-tail.sh·verify-l05-db95-index.sh를 실행했다. L05_DB_SOURCE_ROOT는 이 작업 가지 src, L05_DB_ENTRY는 native-store.fl, compiler와 output/sanitizer 경로는 `<가림>`이다. driver는 고정 fixture의 load 대상만 선택하며 본문·정답·반복 수는 바꾸지 않는다. verify-l05-db95-tail-artifacts.sh는 이미 끝난 출력 폴더를 읽기만 한다.

시험/실패/원문/제약은 [fx L05 보고](https://github.com/kimjindol2025/freelang-v11-fx/blob/9ecade0542f84f7108cf920cb9db63eb4e4160b1/docs/L05-db95-native-progress.md)에 보존했다. 실제 경로·키·비밀 게시 주소는 보고하지 않는다.

## 미확인

이 결과는 운영 영속성·트랜잭션·네트워크 서버의 완성을 뜻하지 않는다. 긴 WAL·다중 작업자/과정·I/O 장애·실제 crash 내구성과 블로그에서 보정을 제거한 통합 회귀가 남아 있다. 새 native runtime의 전체 언어 회귀/bootstrap도 별도로 진행 중이다. L05 전체 완료가 아니다.

Forgejo 목적지 주소는 확인 대기이며 이 DB 가지는 아직 어느 원격에도 푸시하지 않았다. 기존 submodule checkout/main·운영 자료는 변경하지 않았다. 서버 23·25·운영 WAL/이미지/설정 접근·백업 원본 삭제·합치기·배포·강제 푸시·새 TS/수작업 JS/Python·fl-build.sh 사용은 없다.
