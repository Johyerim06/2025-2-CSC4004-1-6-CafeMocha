# Render 배포 체크리스트 ✅

## 배포 전 확인사항

### ✅ 필수 파일
- [x] `Procfile` - gunicorn 사용 설정 완료
- [x] `requirements.txt` - gunicorn 포함
- [x] `runtime.txt` - Python 버전 명시
- [x] `yolo_server.py` - 모델 자동 로드 설정
- [x] `models/best.pt` - 모델 파일 Git 포함

### ✅ Render 대시보드 설정
- [x] Root Directory: `server`
- [x] Build Command: (비워두거나 `pip install -r requirements.txt`)
- [x] Start Command: (Procfile에서 자동 감지)
- [x] Environment Variables: `PORT` (자동 설정됨)

## 배포 후 확인

### 1. Health Check 테스트
```
https://your-render-url.onrender.com/health
```

예상 응답:
```json
{
  "status": "ok",
  "model_loaded": true
}
```

### 2. 로그 확인
Render 대시보드 → Logs에서 확인:
- ✅ "모델 로딩 중..." 메시지
- ✅ "모델 로딩 완료!" 메시지
- ✅ gunicorn 시작 메시지

### 3. API 테스트
```bash
curl -X POST https://your-render-url.onrender.com/api/yolo/detect \
  -F "image=@test_image.jpg"
```

## Vercel 환경 변수 설정 (중요!)

1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 새 환경 변수 추가:
   - **Key**: `YOLO_API_URL`
   - **Value**: `https://your-render-url.onrender.com/api/yolo/detect`
   - **Environment**: Production, Preview, Development 모두 선택
3. Save 클릭
4. Vercel 프로젝트 재배포

## 문제 해결

### 모델 로딩 실패
- `server/models/best.pt` 파일이 Git에 포함되어 있는지 확인
- Render 로그에서 파일 경로 확인

### gunicorn 오류
- `requirements.txt`에 `gunicorn==21.2.0` 포함 확인
- Procfile 형식 확인: `web: gunicorn --bind 0.0.0.0:$PORT yolo_server:app`

### 포트 오류
- Render는 자동으로 `PORT` 환경 변수 설정
- Procfile에서 `$PORT` 사용 확인

## 완료!

이제 Vercel 앱이 Render의 Python 서버와 연동됩니다! 🎉

