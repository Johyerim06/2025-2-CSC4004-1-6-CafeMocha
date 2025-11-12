# 스마트 장바구니 웹 애플리케이션

## 프로젝트 개요
QR 코드를 통한 핸드폰 연동, YOLO 객체 탐지, 바코드 스캔을 통한 스마트 장바구니 시스템

## 기술 스택
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **QR/Barcode**: html5-qrcode, @zxing/library
- **Deployment**: Vercel (Serverless)

## 프로젝트 구조

```
openSWProject/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 메인 페이지
│   ├── qr-scan/           # QR 코드 스캔 페이지
│   ├── phone-scan/        # 핸드폰 바코드 스캔 페이지
│   ├── yolo-scan/         # YOLO 객체 탐지 페이지
│   ├── barcode-scan/       # 바코드 스캔 및 장바구니 페이지
│   └── api/               # API 라우트 (서버리스 함수)
│       ├── yolo/          # YOLO API 연동
│       ├── products/      # 상품 데이터 API
│       ├── phone/         # 핸드폰 연동 API
│       └── webrtc/        # WebRTC 시그널링 API
├── components/            # 재사용 가능한 컴포넌트
├── lib/                   # 유틸리티 및 설정
│   └── store.ts           # Zustand 상태 관리
├── data/                   # 정적 데이터
│   └── products.json      # 시험용 상품 데이터 (10개)
└── types/                  # TypeScript 타입 정의
```

## 주요 기능
1. QR 코드 스캔으로 핸드폰 연동
2. YOLO를 통한 장바구니 객체 탐지
3. 핸드폰에서 바코드 스캔 및 웹으로 전송
4. 개수 비교 및 결과 표시

## 사용 흐름

1. **메인 페이지** (`/`)
   - "QR 생성하기" 버튼 클릭

2. **QR 스캔 페이지** (`/qr-scan`)
   - QR 코드 생성 및 표시
   - 핸드폰으로 QR 코드 스캔

3. **핸드폰 스캔 페이지** (`/phone-scan`)
   - 핸드폰에서 자동으로 열림
   - 바코드 스캔 시작
   - 스캔된 바코드를 웹으로 전송

4. **YOLO 스캔 페이지** (`/yolo-scan`)
   - QR 연동 확인
   - 카메라 화면 표시
   - 사진 촬영 및 객체 탐지

5. **바코드 스캔 페이지** (`/barcode-scan`)
   - 핸드폰에서 스캔한 바코드 수신
   - 상품 등록 및 장바구니 관리
   - 개수 비교 및 결제

## 개발 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 배포
Vercel에 자동 배포되도록 설정되어 있습니다.

## 테스트 방법

1. 웹 브라우저에서 `http://localhost:3000` 접속
2. QR 코드 생성 페이지로 이동
3. 핸드폰으로 QR 코드 스캔
4. 핸드폰에서 바코드 스캔 시작
5. 웹에서 바코드 수신 확인

조혜림 2023113191
