# Render 배포 가이드

## 배포 확인 체크리스트 ✅

### 필수 파일 확인
- ✅ `Procfile` - Render가 자동으로 인식
- ✅ `requirements.txt` - 의존성 자동 설치
- ✅ `yolo_server.py` - 메인 서버 파일
- ✅ `models/best.pt` - 모델 파일 (Git에 포함됨)

### Render 설정 확인

1. **Root Directory**: `server`로 설정되어 있는지 확인
2. **Build Command**: 비워두거나 `pip install -r requirements.txt` (자동 감지됨)
3. **Start Command**: `python yolo_server.py` (Procfile에서 자동 감지됨)
4. **Python Version**: 자동 감지되지만, 명시하려면 `runtime.txt` 추가 가능

## 추가 설정 (선택사항)

### Python 버전 명시 (권장)
`server/runtime.txt` 파일 생성:
```
python-3.11.0
```

### 환경 변수 설정
Render 대시보드 → Environment:
- `PORT`: 자동 설정됨 (수동 설정 불필요)
- `DEBUG`: `False` (기본값, 필요시 설정)

## 배포 후 확인

### 1. Health Check
브라우저에서 접속:
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
- "모델 로딩 중..." 메시지
- "모델 로딩 완료!" 메시지
- "서버 시작: http://0.0.0.0:XXXX" 메시지

### 3. Vercel 환경 변수 설정
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 새 환경 변수 추가:
   - **Key**: `YOLO_API_URL`
   - **Value**: `https://your-render-url.onrender.com/api/yolo/detect`
   - **Environment**: Production, Preview, Development 모두 선택
3. Save 후 Vercel 재배포

## Render 무료 플랜 제한사항

- **슬립 모드**: 15분간 요청이 없으면 자동으로 슬립 모드 진입
- **첫 요청 지연**: 슬립 모드에서 깨어날 때 약 30초~1분 소요
- **월 750시간**: 무료 플랜 제한

## 문제 해결

### 모델 파일을 찾을 수 없음
- `server/models/best.pt` 파일이 Git에 포함되어 있는지 확인
- Render 대시보드 → Logs에서 파일 경로 확인

### 포트 오류
- Render는 자동으로 `PORT` 환경 변수를 설정합니다
- 코드에서 `os.environ.get('PORT', 8000)` 사용 확인

### 메모리 부족
- Render 무료 플랜: 512MB RAM
- 모델이 크면 유료 플랜 필요할 수 있음

### 빌드 실패
- `requirements.txt`에 모든 의존성이 포함되어 있는지 확인
- 로그에서 구체적인 오류 메시지 확인

