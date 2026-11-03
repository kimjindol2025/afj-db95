# DB95-14 TCP client response mismatch diagnosis

RUN-ID: RUN-20261103-17

## 기준과 시작 상태

- FX `feat/db95-native-peer` HEAD: `b8fdb29b94eec109db245172237c2d5a55e4c001`
- afj-db95 `native-run` HEAD: `85424a5d3dacb829f4de921a7767cccec558eae0`
- Stage2 생성 소스 SHA-256: `6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d`
- 시험 compiler 실행 파일 SHA-256: `4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3`
- DB95-13 FX 변경 상태: tracked 2 files modified, `tests/native-bootstrap/tcp-client.fl` untracked. 이 작업에서 수정·stash·commit하지 않았다.

## 보존된 DB95-13 diff

다음은 작업 시작 시의 uncommitted patch다. 경로는 저장소 상대 경로로 표기한다.

```diff
diff --git a/runtime/v11-ops.h b/runtime/v11-ops.h
index c9d192f..ea4d8c1 100644
--- a/runtime/v11-ops.h
+++ b/runtime/v11-ops.h
@@ -21,6 +21,6 @@ static const char *const v11_ops[] = {
 "rss-feed","sitemap-xml",
 "http-get","http-request","http-request-timeout","http-with-timeout",
 "set-timeout","await-result","fl-yield",
-"tcp-server-raw","tcp-server-tls","tcp-write","tcp-drop","tcp-server-stop","tcp-server-running?","fl-error-drain","fl-error-queue-size",
+"tcp-server-raw","tcp-server-tls","tcp-write","tcp-drop","tcp-server-stop","tcp-server-running?","tcp-client-open","tcp-client-write","tcp-client-read-line","tcp-client-close","fl-error-drain","fl-error-queue-size",
 "regex_match","regex_match_i","regex_find","regex_find_all","regex_replace","regex_replace_first","regex_split",
 "file_read","file_write","file_append","file_copy","file_delete","file_exists","file_is_file","file_size","dir_create","dir_list",NULL};
diff --git a/runtime/v11-tcp.h b/runtime/v11-tcp.h
index 282c6e8..8f0d18a 100644
--- a/runtime/v11-tcp.h
+++ b/runtime/v11-tcp.h
@@ -4,6 +4,8 @@
 #include <netinet/in.h>
 #include <netinet/tcp.h>
 #include <arpa/inet.h>
+#include <fcntl.h>
+#include <poll.h>
 #include <openssl/ssl.h>
 #include <openssl/pem.h>
 #include <openssl/err.h>
@@ -20,10 +22,11 @@ static VTServer vt_servers[VT_SERVERS];static VTClient vt_clients[VT_CLIENTS];
 static VTClose vt_closes[VT_CLOSES];static unsigned vt_close_head,vt_close_count,vt_live;
 static VTError vt_errors[VT_ERRORS];static unsigned vt_error_count;
 static uint64_t vt_generation,vt_id;static size_t vt_output;
+static int vt_outbound[VT_CLIENTS];
 static pthread_mutex_t vt_mutex=PTHREAD_MUTEX_INITIALIZER;
 static pthread_once_t vt_once=PTHREAD_ONCE_INIT;
 static int64_t vt_now(void){struct timespec value;if(clock_gettime(CLOCK_MONOTONIC,&value))return -1;return(int64_t)value.tv_sec*1000+value.tv_nsec/1000000;}
-static void vt_init(void){signal(SIGPIPE,SIG_IGN);}
+static void vt_init(void){signal(SIGPIPE,SIG_IGN);for(int i=0;i<VT_CLIENTS;i++)vt_outbound[i]=-1;}
 static void vt_signal(void){(void)fl_schedule_wake_fd();if(timer_pipe[1]>=0){char byte=1;(void)write(timer_pipe[1],&byte,1);}}
 static void vt_error_locked(const char*source,const char*message){
  unsigned index=vt_error_count<VT_ERRORS?vt_error_count++:VT_ERRORS-1;
@@ -51,7 +54,8 @@ static void vt_stop_locked(int slot,int notify){
  close(s->fd);fl_heap_release(s->handler);if(s->ctx)SSL_CTX_free(s->ctx);memset(s,0,sizeof(*s));
 }
 void fl_io_shutdown(void){
- pthread_mutex_lock(&vt_mutex);for(int i=0;i<VT_SERVERS;i++)if(vt_servers[i].used)vt_stop_locked(i,0);
+ pthread_once(&vt_once,vt_init);pthread_mutex_lock(&vt_mutex);for(int i=0;i<VT_SERVERS;i++)if(vt_servers[i].used)vt_stop_locked(i,0);
+ for(int i=0;i<VT_CLIENTS;i++)if(vt_outbound[i]>=0){close(vt_outbound[i]);vt_outbound[i]=-1;}
  while(vt_close_count){VTClose*event=&vt_closes[vt_close_head];fl_heap_release(event->handler);memset(event,0,sizeof(*event));vt_close_head=(vt_close_head+1)%VT_CLOSES;vt_close_count--;}
  pthread_mutex_unlock(&vt_mutex);
 }
@@ -181,8 +185,31 @@ static int vt_poll(int wait_ms,int external,int*external_events){
 }
 int fl_io_poll(int wait_ms){return vt_poll(wait_ms,-1,NULL);}
 int fl_io_wait(int fd,int wait_ms){int events=0;(void)vt_poll(wait_ms,fd,&events);return events;}
+static int vt_outbound_owned(int fd){for(int i=0;i<VT_CLIENTS;i++)if(vt_outbound[i]==fd)return 1;return 0;}
+static int64_t vt_outbound_number(FLValue value,int64_t fallback){FLValue number=fl_v11_to_number(value);if(number.tag==FL_FLOAT)return(int64_t)number.f;if(number.tag==FL_INT)return number.i;return fallback;}
+static FLValue vt_outbound_open(FLVector*args){
+ if(args->len<2||args->data[0].tag!=FL_STRING||!args->data[0].obj)return fl_nil();
+ FLString*host_value=(FLString*)args->data[0].obj;const char*host=host_value->data;int64_t port=vt_outbound_number(args->data[1],-1);int64_t timeout=args->len>2?vt_outbound_number(args->data[2],3000):3000;
+ if(!host_value->len||memchr(host,0,host_value->len)||port<1||port>65535||timeout<1||timeout>600000)return fl_nil();
+ char service[16];snprintf(service,sizeof service,"%u",(unsigned)port);struct addrinfo hints={0},*list=NULL;hints.ai_family=AF_UNSPEC;hints.ai_socktype=SOCK_STREAM;if(getaddrinfo(host,service,&hints,&list)!=0)return fl_nil();
+ int connected=-1;for(struct addrinfo*ai=list;ai;ai=ai->ai_next){int fd=socket(ai->ai_family,ai->ai_socktype|SOCK_CLOEXEC,ai->ai_protocol);if(fd<0)continue;int flags=fcntl(fd,F_GETFL,0);if(flags<0||fcntl(fd,F_SETFL,flags|O_NONBLOCK)<0){close(fd);continue;}int result=connect(fd,ai->ai_addr,ai->ai_addrlen);if(result<0&&errno==EINPROGRESS){struct pollfd p={.fd=fd,.events=POLLOUT};do{result=poll(&p,1,(int)timeout);}while(result<0&&errno==EINTR);if(result>0){int error=0;socklen_t size=sizeof error;if(getsockopt(fd,SOL_SOCKET,SO_ERROR,&error,&size)<0||error)result=-1;else result=0;}else result=-1;}if(result==0){(void)fcntl(fd,F_SETFL,flags);struct timeval tv={.tv_sec=(time_t)(timeout/1000),.tv_usec=(suseconds_t)((timeout%1000)*1000)};(void)setsockopt(fd,SOL_SOCKET,SO_RCVTIMEO,&tv,sizeof tv);(void)setsockopt(fd,SOL_SOCKET,SO_SNDTIMEO,&tv,sizeof tv);connected=fd;break;}close(fd);}freeaddrinfo(list);if(connected<0)return fl_nil();
+ pthread_once(&vt_once,vt_init);pthread_mutex_lock(&vt_mutex);int slot=-1;for(int i=0;i<VT_CLIENTS;i++)if(vt_outbound[i]<0){slot=i;break;}if(slot>=0)vt_outbound[slot]=connected;pthread_mutex_unlock(&vt_mutex);if(slot<0){close(connected);return fl_nil();}return fl_int(connected);
+}
+static FLValue vt_outbound_write(FLVector*args){
+ if(args->len<2||args->data[0].tag!=FL_INT||args->data[1].tag!=FL_STRING||!args->data[1].obj)return fl_str_val("error");int fd=(int)args->data[0].i;pthread_once(&vt_once,vt_init);pthread_mutex_lock(&vt_mutex);int owned=vt_outbound_owned(fd);pthread_mutex_unlock(&vt_mutex);if(!owned)return fl_str_val("not-found");FLString*data=(FLString*)args->data[1].obj;size_t sent=0;while(sent<data->len){ssize_t n=send(fd,data->data+sent,data->len-sent,MSG_NOSIGNAL);if(n<0&&errno==EINTR)continue;if(n<=0)return fl_str_val("error");sent+=(size_t)n;}return fl_str_val("ok");
+}
+static FLValue vt_outbound_read_line(FLVector*args){
+ if(args->len<1||args->data[0].tag!=FL_INT)return fl_nil();int fd=(int)args->data[0].i;int64_t timeout=args->len>1?vt_outbound_number(args->data[1],3000):3000;if(timeout<1||timeout>600000)return fl_nil();pthread_once(&vt_once,vt_init);pthread_mutex_lock(&vt_mutex);int owned=vt_outbound_owned(fd);pthread_mutex_unlock(&vt_mutex);if(!owned)return fl_nil();int64_t deadline=vt_now()+timeout;size_t used=0,capacity=256;char*line=malloc(capacity);if(!line)return fl_nil();for(;;){int64_t left=deadline-vt_now();if(left<=0){free(line);return fl_nil();}struct pollfd p={.fd=fd,.events=POLLIN};int ready;do{ready=poll(&p,1,left>2147483647?2147483647:(int)left);}while(ready<0&&errno==EINTR);if(ready<=0){free(line);return fl_nil();}char ch;ssize_t n=recv(fd,&ch,1,0);if(n<0&&errno==EINTR)continue;if(n<=0){free(line);return fl_nil();}if(ch=='\n')break;if(used>=1024*1024){free(line);return fl_nil();}if(used+1>=capacity){capacity*=2;char*next=realloc(line,capacity);if(!next){free(line);return fl_nil();}line=next;}line[used++]=ch;}line[used]='\0';FLValue result=fl_str_val(line);free(line);return result;
+}
+static FLValue vt_outbound_close(FLVector*args){
+ if(args->len<1||args->data[0].tag!=FL_INT)return fl_bool(false);int fd=(int)args->data[0].i;pthread_once(&vt_once,vt_init);pthread_mutex_lock(&vt_mutex);int slot=-1;for(int i=0;i<VT_CLIENTS;i++)if(vt_outbound[i]==fd){slot=i;break;}if(slot>=0)vt_outbound[slot]=-1;pthread_mutex_unlock(&vt_mutex);if(slot<0)return fl_bool(false);return fl_bool(close(fd)==0);
+}
 FLValue fl_v11_io(FLValue name,FLValue argv){
  const char*op=vt_bytes(name);FLVector*args=(FLVector*)argv.obj;size_t n=args->len;FLValue a=n?args->data[0]:fl_nil(),b=n>1?args->data[1]:fl_nil();
+ if(!strcmp(op,"tcp-client-open"))return vt_outbound_open(args);
+ if(!strcmp(op,"tcp-client-write"))return vt_outbound_write(args);
+ if(!strcmp(op,"tcp-client-read-line"))return vt_outbound_read_line(args);
+ if(!strcmp(op,"tcp-client-close"))return vt_outbound_close(args);
  if(!strcmp(op,"fl-error-queue-size")){pthread_mutex_lock(&vt_mutex);unsigned count=vt_error_count;pthread_mutex_unlock(&vt_mutex);return fl_int(count);}
  if(!strcmp(op,"fl-error-drain")){
   VTError errors[VT_ERRORS];pthread_mutex_lock(&vt_mutex);unsigned count=vt_error_count;memcpy(errors,vt_errors,count*sizeof(*errors));vt_error_count=0;pthread_mutex_unlock(&vt_mutex);
--- /dev/null	2026-10-29 01:20:38.184008227 +0900
+++ tests/native-bootstrap/tcp-client.fl	2026-11-03 18:01:41.591929517 +0900
@@ -0,0 +1,20 @@
+(define port (str-to-num (env-or "FX_TCP_CLIENT_TEST_PORT" "49173")))
+(define handler
+  (fn [event conn payload address]
+    (if (= event "data")
+      (tcp-write conn "PONG\n")
+      nil)))
+(define started (tcp-server-raw port handler "127.0.0.1"))
+(if (= started "ok") nil (throw "TCP_CLIENT_SERVER_START_FAILED"))
+(fl-yield 20)
+(define client (tcp-client-open "127.0.0.1" port 1000))
+(if (nil? client) (throw "TCP_CLIENT_CONNECT_FAILED") nil)
+(define sent (tcp-client-write client "PING\n"))
+(if (= sent "ok") nil (throw "TCP_CLIENT_WRITE_FAILED"))
+(fl-yield 20)
+(define response (tcp-client-read-line client 1000))
+(if (= response (env-or "FX_TCP_CLIENT_EXPECT" "PONG")) nil
+  (throw "TCP_CLIENT_RESPONSE_MISMATCH"))
+(if (tcp-client-close client) nil (throw "TCP_CLIENT_CLOSE_FAILED"))
+(tcp-server-stop port)
+(println "TCP_CLIENT_ROUNDTRIP=PASS")
```

## 원인 확인 진행

fixture 1회 실행은 `/tmp/fl-heavy.lock`을 기다리는 중이다. 그 전에는 같은 fixture를 추가 실행하지 않았다. 세 번 실패한 DB95-13의 기존 결과만으로 송수신 바이트를 추정하지 않는다.

기존 비교 경로 후보는 `tests/native-bootstrap/raw-peer.sh`: `fl-tcp-server-raw` 5-인자 raw_tcp handler와 bash `/dev/tcp` client다. 해당 서버/클라이언트 구현과 fixture 바이트가 실제로 비교된 뒤 결과를 이 절에 기록한다.

fixture와 기존 raw_tcp 비교 및 원인 분류는 아래 최종 결과 절에 기록했다.

언어 성과: 미확정.

## Fixture 1회: 송신·수신·기대 바이트

Stage2 source hash와 일치하는 compiler로 만들어 둔 DB95-13 fixture binary를 1회 실행했다. 실행 출력은 원문 그대로다.

```text
Uncaught error (line 17): TCP_CLIENT_RESPONSE_MISMATCH
FIXTURE_RC=1
```

`strace -xx` 기록:

```text
sendto(6, "\x50\x49\x4e\x47\x0a", 5, MSG_NOSIGNAL, NULL, 0) = 5
```

| 구분 | 16진 바이트 | 해석 |
|---|---|---|
| 보낸 바이트 | `50 49 4e 47 0a` | `PING\n`, 5 bytes |
| 받은 바이트 | 없음 (1초 read timeout) | trace에 client `recv`와 server response `send`가 없음 |
| 기대 wire 바이트 | `50 4f 4e 47 0a` | `PONG\n`, 5 bytes |
| fixture의 기대 값 | `PONG` | `tcp-client-read-line`은 LF를 제외한 line을 반환 |

첫 차이는 offset 0이다: 기대 `0x50`이지만 실제 응답 바이트가 하나도 도착하지 않았다. 이 결과는 응답 문자열의 중간 바이트가 다른 경우가 아니다.

## 기존 raw_tcp 서버 + 기존 클라이언트 경로 1회

기존 legacy `fl-tcp-server-raw` raw_tcp server와 통과 이력이 있는 bash `/dev/tcp` client로 동일 `PING\n`을 1회 보냈다. 원문 output:

```text
CLIENT_RESPONSE=PONG
RAW_SERVER_RESULT=ok
RAW_RECEIVED_LENGTH=5
```

`strace -xx` 기록:

```text
recvfrom(4, "\x50\x49\x4e\x47\x0a", 4096, 0, NULL, NULL) = 5
sendto(4, "\x50\x4f\x4e\x47\x0a", 5, MSG_NOSIGNAL, NULL, 0) = 5
recvfrom(4, "", 4096, 0, NULL, NULL) = 0
```

따라서 이전 경로도 같은 5-byte request를 받고 wire response `50 4f 4e 47 0a`를 돌려줬다. `PONG` 기대값은 일치한다.

## 원인 판정

**분류: (가) 새 smoke fixture 쪽.**

DB95-13 fixture `<가림>/tests/native-bootstrap/tcp-client.fl`에서는 `tcp-server-raw`로 V11 IO 서버를 같은 프로세스 안에 띄우고, 한 번의 `(fl-yield 20)` 뒤 client write 후 바로 blocking `tcp-client-read-line`에 들어간다(현재 fixture 7–17줄). 이 서버 구현은 `<가림>/runtime/v11-tcp.h`에서 poll snapshot을 먼저 만든 다음 146–160줄에서 listener accept를 처리한다. 새로 accept된 client FD는 그 snapshot에 없으므로 다음 `fl_io_poll`에서야 data event를 dispatch할 수 있다. 그런데 fixture에는 accept 이후 두 번째 event-loop pump가 없고, 다음 동작은 blocking client read다. 따라서 trace에서 `PING\n` 송신은 보이지만 서버 data receive/response send는 나오지 않는다.

실제 legacy `<가림>/runtime/raw_tcp.c` 수신 함수 `raw_poll`의 `recv` 처리(198–203줄)는 같은 요청을 5바이트로 받아 응답했다. 이 비교로 이번 불일치를 raw_tcp 서버/수신 결함인 (나)로 보지 않는다. 기대 line `PONG` 및 wire response도 맞으므로 (다)도 아니다. 수정은 하지 않았다.

## 최종 상태

- DB95-13 미커밋 FX tracked/untracked 변경: 그대로 보존, stash/수정/커밋하지 않음
- FX 및 afj-db95 작업 HEAD: 각각 시작 기준과 동일
- DB95 71건 gate: 이번 지시에서 금지되어 실행하지 않음
- source Stage2 SHA-256: `6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d`
- compiler executable SHA-256 (기록만): `4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3`
- raw_tcp 수정: 없음

언어 성과: 응답 불일치는 raw_tcp 런타임 결함이 아니라, V11 IO accept 뒤 다음 poll 전에 blocking read에 들어간 DB95-13 smoke fixture의 이벤트 순서 결함으로 확인했다.

DB95_SUMMARY=4/4
