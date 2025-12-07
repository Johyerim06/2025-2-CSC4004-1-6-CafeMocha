'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { Html5Qrcode } from 'html5-qrcode'

// 핸드폰 비디오 스트림 컴포넌트
function PhoneVideoStream({ deviceId }: { deviceId: string }) {
  const [phoneVideoFrame, setPhoneVideoFrame] = useState<string | null>(null)

  useEffect(() => {
    const pollVideoFrame = setInterval(async () => {
      try {
        const response = await fetch(`/api/phone/video?deviceId=${deviceId}`)
        const result = await response.json()

        if (result.success && result.imageData) {
          setPhoneVideoFrame(result.imageData)
        }
      } catch (error) {
        console.error('비디오 프레임 폴링 오류:', error)
      }
    }, 200) // 200ms마다 확인 (약 5fps)

    return () => clearInterval(pollVideoFrame)
  }, [deviceId])

  if (!phoneVideoFrame) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4 text-xl">
            핸드폰 카메라 연결 대기 중...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <img
        src={phoneVideoFrame}
        alt="핸드폰 카메라 화면"
        className="w-full h-full object-contain"
      />
    </div>
  )
}

export default function BarcodeScanPage() {
  const router = useRouter()
  const { cartItems, yoloCount, addProduct, decreaseQuantity, getTotalCount, setScanResult, scanResult, deviceId } = useStore()
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [phoneBarcode, setPhoneBarcode] = useState<string | null>(null)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  // 총 가격 계산
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const totalCount = getTotalCount()

  // 바코드 스캔 시작
  const startScanning = async () => {
    try {
      setScanError(null)
      setIsScanning(true)

      const html5QrCode = new Html5Qrcode('barcode-scanner')
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 400, height: 250 },
        },
        (decodedText) => {
          handleBarcodeScanned(decodedText)
        },
        (errorMessage) => {
          // 스캔 오류는 무시 (계속 스캔)
        }
      )
    } catch (error) {
      console.error('바코드 스캔 시작 오류:', error)
      setScanError('카메라 접근 권한이 필요합니다.')
      setIsScanning(false)
    }
  }

  // 바코드 스캔 중지
  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      } catch (error) {
        console.error('스캔 중지 오류:', error)
      }
      html5QrCodeRef.current = null
    }
    setIsScanning(false)
  }

  // 바코드 스캔 처리
  const handleBarcodeScanned = async (barcode: string) => {
    try {
      console.log('바코드 스캔 처리 시작:', barcode)
      
      // API로 상품 조회
      const response = await fetch(`/api/products?barcode=${barcode}`)
      const result = await response.json()

      if (result.success && result.product) {
        console.log('상품 조회 성공:', result.product)
        addProduct(result.product)
        setScanError(null)
        
        // 로컬 스캔 중이면 잠시 중지 후 재시작
        if (isScanning && html5QrCodeRef.current) {
          await stopScanning()
          setTimeout(() => {
            startScanning()
          }, 1000)
        }
      } else {
        console.warn('등록되지 않은 상품:', barcode)
        setScanError('등록되지 않은 상품입니다.')
        setTimeout(() => setScanError(null), 3000)
      }
    } catch (error) {
      console.error('상품 조회 오류:', error)
      setScanError('상품 조회 중 오류가 발생했습니다.')
      setTimeout(() => setScanError(null), 3000)
    }
  }

  // 수량 증가
  const increaseQuantity = (barcode: string) => {
    const item = cartItems.find(item => item.product.barcode === barcode)
    if (item) {
      addProduct(item.product)
    }
  }


  // 결제하기 버튼 클릭
  const handlePayment = () => {
    if (yoloCount === null) {
      alert('YOLO 탐지 결과가 없습니다.')
      return
    }

    if (totalCount !== yoloCount) {
      // 개수가 다르면 에러 상태로 설정
      setScanResult('error')
    } else {
      // 개수가 같으면 결제 성공 페이지로 이동
      router.push('/payment-success')
    }
  }

  // 핸드폰에서 바코드 받기 (폴링)
  useEffect(() => {
    if (!deviceId) return

    const pollBarcode = setInterval(async () => {
      try {
        const response = await fetch(`/api/phone/barcode?deviceId=${deviceId}`)
        const result = await response.json()

        if (result.success && result.barcode) {
          console.log('핸드폰에서 바코드 수신:', result.barcode)
          setPhoneBarcode(result.barcode)
          handleBarcodeScanned(result.barcode)
        }
      } catch (error) {
        console.error('바코드 폴링 오류:', error)
      }
    }, 500) // 0.5초마다 확인 (더 빠른 응답)

    return () => clearInterval(pollBarcode)
  }, [deviceId])

  // 컴포넌트 마운트 시 로컬 스캔도 시작 (테스트용)
  useEffect(() => {
    // deviceId가 없으면 로컬 스캔 시작
    if (!deviceId) {
      startScanning()
    }
    return () => {
      stopScanning()
    }
  }, [deviceId])

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="flex flex-col items-center min-h-screen px-7 py-20">
        {/* 타이틀 */}
        <h1 
          className="text-[52px] font-bold leading-[62px] tracking-tight text-center mb-10 font-[var(--font-poppins)]"
          style={{ 
            color: '#090914',
            letterSpacing: '-0.02em'
          }}
        >
          바코드를 찍어주세요
        </h1>

        <div className="flex gap-6 w-full max-w-[1420px]">
          {/* 왼쪽: 바코드 스캔 영역 */}
          <div className="flex-shrink-0 flex flex-col">
            {/* 에러 메시지 - 카메라 영역 바로 위 */}
            {scanError && (
              <div className="mb-5 flex justify-center">
                <div className="bg-red-500 text-white px-10 py-5 rounded-xl shadow-xl backdrop-blur-sm" style={{ boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)' }}>
                  <p className="text-2xl font-bold text-center tracking-tight">{scanError}</p>
                </div>
              </div>
            )}
            <div 
              className="rounded-2xl overflow-hidden relative shadow-xl"
            style={{ 
              backgroundColor: '#ffffff',
              width: '655px',
                height: '600px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
            }}
          >
            {deviceId ? (
              // 핸드폰에서 스캔하는 경우 - 핸드폰 카메라 화면 표시
              <div className="w-full h-full relative">
                <PhoneVideoStream deviceId={deviceId} />
                {/* 바코드 스캔 안내 오버레이 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-blue-500 rounded-xl shadow-lg" style={{ width: '300px', height: '300px', boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)' }}>
                    <div className="absolute -top-9 left-0 right-0 text-center">
                      <p className="text-white bg-blue-500 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg backdrop-blur-sm tracking-tight" style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                        바코드를 이 영역에 맞춰주세요
                      </p>
                    </div>
                  </div>
                </div>
                {phoneBarcode && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white px-5 py-2.5 rounded-xl z-10 shadow-lg backdrop-blur-sm font-semibold" style={{ boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }}>
                    바코드 스캔됨: {phoneBarcode}
                  </div>
                )}
              </div>
            ) : (
              // 로컬 카메라로 스캔하는 경우
              <>
                <div 
                  id="barcode-scanner"
                  ref={scannerContainerRef}
                  className="w-full h-full"
                />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <button
                      onClick={startScanning}
                      className="px-7 py-3.5 bg-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                      style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                    >
                      바코드 스캔 시작
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
          </div>

          {/* 오른쪽: 상품 리스트 영역 */}
          <div className="flex-1 flex flex-col gap-4">
            {/* 상품 리스트 */}
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-500 py-20 text-lg tracking-tight">
                바코드를 스캔하여 상품을 추가하세요
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {cartItems.map((item, index) => (
                  <div
                    key={`${item.product.barcode}-${index}`}
                    className="bg-white rounded-2xl p-6 flex items-center justify-between shadow-md hover:shadow-lg transition-shadow duration-200"
                    style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
                  >
                    <div className="flex items-center gap-6 flex-1">
                      <span 
                        className="text-[32px] font-bold leading-[62px] tracking-tight font-[var(--font-poppins)]"
                        style={{ color: '#090914', letterSpacing: '-0.01em' }}
                      >
                        {item.product.name}
                      </span>
                      <span 
                        className="text-[32px] font-bold leading-[62px] tracking-tight font-[var(--font-poppins)]"
                        style={{ color: '#090914', letterSpacing: '-0.01em' }}
                      >
                        {item.product.price.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decreaseQuantity(item.product.barcode)}
                        className="w-[52px] h-[56px] bg-[#18181b] text-white rounded-xl flex items-center justify-center font-bold text-lg font-[var(--font-plus-jakarta-sans)] hover:opacity-90 transition-all duration-200 hover:scale-105 shadow-md"
                        style={{ boxShadow: '0 2px 8px rgba(24, 24, 27, 0.2)' }}
                      >
                        -
                      </button>
                      <span 
                        className="text-[32px] font-bold leading-[62px] tracking-tight font-[var(--font-poppins)] px-5"
                        style={{ color: '#090914', letterSpacing: '-0.01em' }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => increaseQuantity(item.product.barcode)}
                        className="w-[52px] h-[56px] bg-[#18181b] text-white rounded-xl flex items-center justify-center font-bold text-lg font-[var(--font-plus-jakarta-sans)] hover:opacity-90 transition-all duration-200 hover:scale-105 shadow-md"
                        style={{ boxShadow: '0 2px 8px rgba(24, 24, 27, 0.2)' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 총계 및 결제 버튼 */}
            <div className="bg-white rounded-2xl p-7 flex items-center justify-between mt-auto shadow-lg" style={{ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)' }}>
              <div className="flex items-center gap-7">
                <span 
                  className="text-[32px] font-bold leading-[62px] tracking-tight font-[var(--font-poppins)]"
                  style={{ color: '#090914', letterSpacing: '-0.01em' }}
                >
                  총 {totalCount}개
                </span>
                <span 
                  className="text-[32px] font-bold leading-[62px] tracking-tight font-[var(--font-poppins)]"
                  style={{ color: '#090914', letterSpacing: '-0.01em' }}
                >
                  {totalPrice.toLocaleString()}원
                </span>
              </div>
              <button
                onClick={handlePayment}
                className="px-7 py-4 bg-[#18181b] text-white rounded-xl font-semibold text-lg font-[var(--font-plus-jakarta-sans)] hover:opacity-90 transition-all duration-200 hover:scale-105 shadow-lg"
                style={{ boxShadow: '0 4px 12px rgba(24, 24, 27, 0.2)' }}
              >
                결제하기
              </button>
            </div>
          </div>
        </div>

        {/* 에러 알림창 */}
        {scanResult === 'error' && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="bg-white rounded-2xl p-12 max-w-[1064px] w-full shadow-2xl animate-in zoom-in-95 duration-200"
              style={{ boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}
            >
              <h2 
                className="text-[52px] font-bold leading-[62px] tracking-tight text-center font-[var(--font-poppins)] mb-2"
                style={{ color: '#090914', letterSpacing: '-0.02em' }}
              >
                장바구니에 인식된 개수와 다릅니다
              </h2>
              <div className="mt-10 flex justify-center gap-4">
                <button
                  onClick={() => {
                    setScanResult(null)
                    // 스캔은 계속 유지 (stopScanning 호출 안 함)
                  }}
                  className="px-10 py-4.5 bg-[#18181b] text-white rounded-xl font-semibold hover:opacity-90 transition-all duration-200 hover:scale-105 shadow-lg"
                  style={{ boxShadow: '0 4px 12px rgba(24, 24, 27, 0.2)' }}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 성공 알림창 */}
        {scanResult === 'success' && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="bg-white rounded-2xl p-12 max-w-[1064px] w-full shadow-2xl animate-in zoom-in-95 duration-200"
              style={{ boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}
            >
              <h2 
                className="text-[52px] font-bold leading-[62px] tracking-tight text-center font-[var(--font-poppins)] mb-2"
                style={{ color: '#090914', letterSpacing: '-0.02em' }}
              >
                스캔이 완료되었습니다
              </h2>
              <div className="mt-10 flex justify-center gap-4">
                <button
                  onClick={() => {
                    setScanResult(null)
                    stopScanning()
                  }}
                  className="px-10 py-4.5 bg-[#18181b] text-white rounded-xl font-semibold hover:opacity-90 transition-all duration-200 hover:scale-105 shadow-lg"
                  style={{ boxShadow: '0 4px 12px rgba(24, 24, 27, 0.2)' }}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

