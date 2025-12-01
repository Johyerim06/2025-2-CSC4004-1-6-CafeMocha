# Render-Vercel 연동 테스트 가이드

## 환경 변수 설정 확인 ✅

**Vercel 환경 변수:**
- Key: `YOLO_API_URL`
- Value: `https://yolo-server-ymvj.onrender.com/api/yolo/detect`

## 1단계: Render 서버 상태 확인

### Health Check
브라우저에서 접속:
```
https://yolo-server-ymvj.onrender.com/health
```

**예상 응답:**
```json
{
  "status": "ok",
  "model_loaded": true
}
```

### 문제가 있다면:
- Render 대시보드 → Logs 확인
- "모델 로딩 완료!" 메시지 확인
- 배포 상태가 "Live"인지 확인

## 2단계: Vercel 환경 변수 확인

### 방법 1: Vercel 대시보드에서 확인
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. `YOLO_API_URL`이 모든 환경(Production, Preview, Development)에 설정되어 있는지 확인

### 방법 2: 코드에서 확인 (로컬 테스트)
`.env.local` 파일 생성:
```env
YOLO_API_URL=https://yolo-server-ymvj.onrender.com/api/yolo/detect
```

## 3단계: API 직접 테스트

### curl로 테스트
```bash
curl -X POST https://yolo-server-ymvj.onrender.com/api/yolo/detect \
  -F "image=@test_image.jpg"
```

### 예상 응답:
```json
{
  "success": true,
  "count": 3,
  "objects": [
    {
      "label": "class_0",
      "confidence": 0.95,
      "bbox": [100, 200, 300, 400]
    }
  ]
}
```

## 4단계: Vercel 앱에서 테스트

1. Vercel 앱 배포 (환경 변수 반영을 위해 재배포 필요)
2. `/yolo-scan` 페이지 접속
3. 카메라로 사진 촬영
4. 객체 탐지 결과 확인

## 문제 해결

### CORS 오류
- Render 서버의 `flask-cors`가 제대로 설정되어 있는지 확인
- `server/yolo_server.py`에서 `CORS(app)` 확인

### 404 오류
- URL이 정확한지 확인: `/api/yolo/detect` (끝에 슬래시 없음)
- Render 서버가 정상 작동 중인지 확인

### 타임아웃 오류
- Render 무료 플랜은 슬립 모드가 있어 첫 요청 시 30초~1분 소요 가능
- Health check로 서버가 깨어났는지 확인

### 모델 로딩 실패
- Render 로그에서 모델 파일 경로 확인
- `server/models/best.pt` 파일이 Git에 포함되어 있는지 확인

## 완료!

모든 설정이 완료되었습니다. 이제 Vercel 앱에서 YOLO 객체 탐지가 작동합니다! 🎉

