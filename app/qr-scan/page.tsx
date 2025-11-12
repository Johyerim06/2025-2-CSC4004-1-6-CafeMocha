'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useStore } from '@/lib/store'

export default function QRScanPage() {
  const router = useRouter()
  const { setConnected } = useStore()
  const [deviceId, setDeviceId] = useState<string>('')
  const [qrValue, setQrValue] = useState<string>('')
  const [isConnected, setIsConnected] = useState<boolean>(false)

  useEffect(() => {
    // 고유한 디바이스 ID 생성 (실제로는 세션 ID나 사용자 ID를 사용)
    const generatedDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setDeviceId(generatedDeviceId)
    
    // QR 코드에 핸드폰 스캔 페이지 URL 포함
    const phoneScanUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/phone-scan?deviceId=${generatedDeviceId}`
      : `/phone-scan?deviceId=${generatedDeviceId}`
    
    console.log('QR 코드 생성:', phoneScanUrl)
    setQrValue(phoneScanUrl)

    // 연결 상태 확인 (핸드폰에서 바코드 스캔 시작 여부 확인)
    const checkConnection = setInterval(async () => {
      try {
        // 핸드폰에서 바코드를 스캔했는지 확인
        const response = await fetch(`/api/phone/barcode?deviceId=${generatedDeviceId}`)
        const result = await response.json()
        
        if (result.success) {
          // 첫 바코드가 스캔되면 연결된 것으로 간주
          setIsConnected(true)
          setConnected(generatedDeviceId)
          clearInterval(checkConnection)
          // 연결 성공 후 다음 페이지로 이동
          setTimeout(() => {
            router.push('/yolo-scan')
          }, 1000)
        }
      } catch (error) {
        console.error('연결 확인 오류:', error)
      }
    }, 2000) // 2초마다 확인

    return () => clearInterval(checkConnection)
  }, [router, setConnected])

  const handleBack = () => {
    router.push('/')
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="flex flex-col items-start justify-center min-h-screen px-24 py-20">
        <div className="flex items-start gap-12 w-full max-w-6xl">
          {/* 왼쪽: 텍스트 영역 */}
          <div className="flex-1 max-w-2xl">
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
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-4 rounded-[10px] transition-opacity hover:opacity-90"
              style={{ 
                backgroundColor: '#18181b',
                color: '#ffffff'
              }}
            >
              <span 
                className="text-lg font-bold leading-6 font-[var(--font-plus-jakarta-sans)]"
              >
                QR 생성하기
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

          {/* 오른쪽: QR 코드 영역 */}
          <div className="flex-shrink-0">
            {qrValue ? (
              <div className="flex flex-col items-center gap-4">
                <div 
                  className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-center"
                  style={{ width: '396px', height: '396px' }}
                >
                  <QRCodeSVG
                    value={qrValue}
                    size={364}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                {isConnected && (
                  <p className="text-green-600 font-semibold">
                    연결되었습니다!
                  </p>
                )}
                {!isConnected && (
                  <p className="text-gray-500 text-sm">
                    핸드폰으로 QR 코드를 스캔해주세요
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div 
                  className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-center"
                  style={{ width: '396px', height: '396px' }}
                >
                  <p className="text-gray-400">QR 코드 생성 중...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

