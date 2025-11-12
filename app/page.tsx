'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  const handleQRGenerate = () => {
    console.log('QR 생성하기 버튼 클릭됨')
    try {
      router.push('/qr-scan')
    } catch (error) {
      console.error('페이지 이동 오류:', error)
      // 폴백: window.location 사용
      window.location.href = '/qr-scan'
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="flex flex-col items-start justify-center min-h-screen px-24 py-20">
        <div className="max-w-2xl">
          {/* 메인 타이틀 */}
          <h1 
            className="mb-4 text-[58px] font-extrabold leading-[66px] tracking-normal font-[var(--font-plus-jakarta-sans)]"
            style={{ 
              color: '#18181b'
            }}
          >
            무인 결제 보조 시스템
          </h1>
          
          {/* 서브 타이틀 */}
          <p 
            className="mb-12 text-2xl leading-[26px] font-[var(--font-inter)]"
            style={{ 
              color: '#52525b'
            }}
          >
            스캔을 빠트린 물건이 없는지 확인해보세요.
          </p>
          
          {/* QR 생성하기 버튼 */}
          <button
            onClick={handleQRGenerate}
            type="button"
            className="flex items-center gap-2 px-6 py-4 rounded-[10px] transition-opacity hover:opacity-90 cursor-pointer relative z-10"
            style={{ 
              backgroundColor: '#18181b',
              color: '#ffffff',
              border: 'none',
              outline: 'none',
              pointerEvents: 'auto'
            }}
          >
            <span 
              className="text-lg font-bold leading-6 font-[var(--font-plus-jakarta-sans)]"
            >
              QR 생성하기
            </span>
            {/* 아이콘 영역 - 필요시 SVG 아이콘 추가 */}
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 18 18" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="ml-1"
            >
              <path 
                d="M9 1.5L10.5 3L9 4.5M3 9L1.5 10.5L3 12M15 9L16.5 10.5L15 12M9 16.5L10.5 15L9 13.5M4.5 3L3 1.5L1.5 3M16.5 3L15 1.5L13.5 3M4.5 15L3 16.5L1.5 15M16.5 15L15 16.5L13.5 15" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </main>
  )
}

