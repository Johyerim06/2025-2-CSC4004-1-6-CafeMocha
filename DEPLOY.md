# Vercel 배포 가이드

## 배포 방법

### 방법 1: Vercel 웹사이트에서 배포 (추천)

1. **GitHub에 코드 업로드**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin [YOUR_GITHUB_REPO_URL]
   git push -u origin main
   ```

2. **Vercel에 로그인**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

3. **프로젝트 Import**
   - "Add New..." → "Project" 클릭
   - GitHub 저장소 선택
   - 프로젝트 설정:
     - Framework Preset: **Next.js**
     - Root Directory: `./` (기본값)
     - Build Command: `npm run build` (자동 감지)
     - Output Directory: `.next` (자동 감지)

4. **환경 변수 설정** (필요한 경우)
   - Settings → Environment Variables
   - YOLO_API_URL 등 추가

5. **Deploy 클릭**

### 방법 2: Vercel CLI로 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

## 배포 후 확인 사항

1. **API 엔드포인트 확인**
   - `https://[your-project].vercel.app/api/phone/barcode`
   - `https://[your-project].vercel.app/api/products`

2. **페이지 확인**
   - 메인 페이지: `https://[your-project].vercel.app/`
   - QR 스캔: `https://[your-project].vercel.app/qr-scan`

## 주의사항

- Vercel은 자동으로 HTTPS를 제공합니다
- API 라우트는 서버리스 함수로 자동 변환됩니다
- 환경 변수는 Vercel 대시보드에서 설정해야 합니다

