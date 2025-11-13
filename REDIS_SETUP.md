# Redis 설정 가이드

## Upstash Redis 설정

이 프로젝트는 Upstash Redis를 사용하여 서버리스 환경에서 안정적인 상태 관리를 제공합니다.

### 1. Upstash Redis 생성

1. [Upstash Console](https://console.upstash.com/)에 접속
2. "Create Database" 클릭
3. Database 이름 입력 (예: `smart-cart-redis`)
4. Region 선택 (Vercel과 가까운 지역 권장)
5. "Create" 클릭

### 2. 환경 변수 설정

Upstash Redis 대시보드에서 다음 정보를 복사:

- **UPSTASH_REDIS_REST_URL**: REST API URL
- **UPSTASH_REDIS_REST_TOKEN**: REST API Token

### 3. Vercel 환경 변수 설정

1. Vercel 대시보드에서 프로젝트 선택
2. Settings → Environment Variables
3. 다음 환경 변수 추가:
   - `UPSTASH_REDIS_REST_URL`: (Upstash에서 복사한 URL)
   - `UPSTASH_REDIS_REST_TOKEN`: (Upstash에서 복사한 Token)

### 4. 로컬 개발 환경 설정

로컬에서 테스트하려면 `.env.local` 파일을 생성하고 다음을 추가:

```env
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 5. Redis 사용 이유

- **서버리스 환경 호환**: Vercel의 서버리스 함수는 재시작 시 메모리가 초기화됩니다
- **영구 저장**: Redis는 데이터를 영구적으로 저장하여 재시작 후에도 유지됩니다
- **빠른 응답**: Redis는 매우 빠른 읽기/쓰기 성능을 제공합니다
- **TTL 지원**: 자동 만료 기능으로 오래된 데이터를 자동으로 정리합니다

### 6. Redis 키 구조

- `webrtc:offer:{deviceId}` - WebRTC Offer (5분 TTL)
- `webrtc:answer:{deviceId}` - WebRTC Answer (5분 TTL)
- `webrtc:ice:{deviceId}-{type}` - ICE Candidates 리스트 (5분 TTL)
- `phone:video:{deviceId}` - 비디오 프레임 (5초 TTL)
- `phone:barcode:{deviceId}` - 바코드 데이터 (10초 TTL)

