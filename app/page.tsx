'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  const handleStartPayment = () => {
    router.push('/yolo-scan')
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="flex flex-col items-start justify-center min-h-screen px-24 py-20">
        <div className="max-w-2xl">
          {/* 메인 타이틀 */}
          <h1 
            className="mb-5 text-[58px] font-extrabold leading-[66px] tracking-tight font-[var(--font-plus-jakarta-sans)]"
            style={{ 
              color: '#18181b',
              letterSpacing: '-0.02em'
            }}
          >
            무인 결제 보조 시스템
          </h1>
          
          {/* 서브 타이틀 */}
          <p 
            className="mb-14 text-2xl leading-relaxed font-[var(--font-inter)] tracking-tight"
            style={{ 
              color: '#52525b'
            }}
          >
            스캔을 빠트린 물건이 없는지 확인해보세요
          </p>
          
          {/* 결제 시작하기 버튼 */}
          <button
            onClick={handleStartPayment}
            type="button"
            className="flex items-center gap-2.5 px-7 py-4.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer relative z-10"
            style={{ 
              backgroundColor: '#18181b',
              color: '#ffffff',
              border: 'none',
              outline: 'none',
              pointerEvents: 'auto',
              boxShadow: '0 4px 16px rgba(24, 24, 27, 0.2)'
            }}
          >
            <span 
              className="text-lg font-semibold leading-6 font-[var(--font-plus-jakarta-sans)] tracking-tight"
            >
              결제 시작하기
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

