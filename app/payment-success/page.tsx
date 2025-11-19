'use client'

import { useRouter } from 'next/navigation'

export default function PaymentSuccessPage() {
  const router = useRouter()

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 md:px-7 py-6 sm:py-10 md:py-16 lg:py-20">
        {/* 타이틀 */}
        <h1 
          className="text-4xl sm:text-5xl md:text-[58px] font-extrabold leading-tight sm:leading-[66px] text-center mb-6 font-[var(--font-plus-jakarta-sans)]"
          style={{ 
            color: '#18181b'
          }}
        >
          👏 결제가 성공적으로 완료되었습니다.
        </h1>
        
        {/* 서브 타이틀 */}
        <p 
          className="text-xl sm:text-2xl md:text-[36px] leading-tight sm:leading-[26px] text-center mb-12 font-[var(--font-inter)]"
          style={{ 
            color: '#52525b'
          }}
        >
          결제하신 물건을 잘 챙겨가세요.
        </p>
        
        {/* 처음으로 버튼 */}
        <button
          onClick={handleGoHome}
          className="flex items-center gap-2 px-6 py-4 rounded-[10px] transition-opacity hover:opacity-90"
          style={{ 
            backgroundColor: '#18181b',
            color: '#ffffff'
          }}
        >
          <span 
            className="text-xl sm:text-2xl md:text-[24px] font-bold leading-6 font-[var(--font-plus-jakarta-sans)]"
          >
            처음으로
          </span>
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
    </main>
  )
}

