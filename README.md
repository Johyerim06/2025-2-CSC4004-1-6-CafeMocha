# 무인 결제 보조 시스템

## 프로젝트 개요
YOLO 객체 탐지와 바코드 스캔을 통한 스마트 장바구니 시스템으로, 스캔을 빠뜨린 물건이 없는지 확인할 수 있습니다.

## 기술 스택
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Barcode Scanner**: html5-qrcode
- **YOLO API**: Hugging Face Spaces (FastAPI)
- **Deployment**: Vercel (Serverless)

## 프로젝트 구조

```
openSWProject/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 메인 페이지
│   ├── yolo-scan/         # YOLO 객체 탐지 페이지
│   ├── barcode-scan/      # 바코드 스캔 및 장바구니 페이지
│   ├── payment-success/   # 결제 성공 페이지
│   └── api/               # API 라우트 (서버리스 함수)
│       ├── yolo/          # YOLO API 연동 (Hugging Face)
│       ├── products/      # 상품 데이터 API
│       └── phone/         # 핸드폰 연동 API (선택사항)
├── lib/                   # 유틸리티 및 설정
│   ├── store.ts           # Zustand 상태 관리
│   └── redis.ts           # Redis 클라이언트 (선택사항)
├── data/                  # 정적 데이터
│   └── products.json      # 상품 데이터
└── types/                 # TypeScript 타입 정의
```

## 주요 기능

1. **YOLO 객체 탐지**
   - 카메라로 장바구니 사진 촬영
   - Hugging Face API를 통한 자동 상품 개수 탐지
   - 탐지 실패 시 수동 입력 기능

2. **바코드 스캔**
   - 웹 카메라를 통한 바코드 스캔
   - 상품 자동 등록 및 장바구니 관리
   - 수량 조절 기능

3. **개수 비교 및 결제**
   - YOLO 탐지 개수와 바코드 스캔 개수 비교
   - 개수 일치 시 결제 완료 처리

## 사용 흐름

1. **메인 페이지** (`/`)
   - "결제 시작하기" 버튼 클릭

2. **YOLO 스캔 페이지** (`/yolo-scan`)
   - 카메라 자동 시작
   - 장바구니 사진 촬영
   - YOLO API를 통한 상품 개수 자동 탐지
   - 탐지 실패 시 수동 입력 가능

3. **바코드 스캔 페이지** (`/barcode-scan`)
   - 바코드 스캔 시작
   - 상품 자동 등록 및 장바구니 표시
   - 수량 조절 기능
   - YOLO 탐지 개수와 비교

4. **결제 성공 페이지** (`/payment-success`)
   - 개수 일치 시 결제 완료 메시지 표시

## 개발 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (모든 네트워크에서 접근 가능)
npm run dev

# 개발 서버 실행 (로컬호스트만)
npm run dev:local
```

개발 서버가 시작되면 `http://localhost:3000`에서 접속할 수 있습니다.

## 환경 변수 설정

`.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
HF_YOLO_API_URL=https://koro277-yolo-fastapi.hf.space/predict
HF_API_TOKEN=your_huggingface_token_if_needed
```

## 배포

Vercel에 자동 배포되도록 설정되어 있습니다. 환경 변수는 Vercel 대시보드에서 설정하세요.

## 주요 페이지

- `/` - 메인 페이지
- `/yolo-scan` - YOLO 객체 탐지 페이지
- `/barcode-scan` - 바코드 스캔 및 장바구니 페이지
- `/payment-success` - 결제 성공 페이지

## 테스트 방법

1. 웹 브라우저에서 `http://localhost:3000` 접속
2. "결제 시작하기" 버튼 클릭
3. 카메라 권한 허용
4. 장바구니 사진 촬영
5. 바코드 스캔으로 상품 등록
6. 개수 비교 및 결제 완료 확인

---

조혜림 2023113191
