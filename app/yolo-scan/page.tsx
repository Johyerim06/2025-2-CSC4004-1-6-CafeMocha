'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

export default function YOLOScanPage() {
  const router = useRouter()
  const { setYOLOCount, isConnected, deviceId } = useStore()
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [detectedCount, setDetectedCount] = useState<number | null>(null)
  const [phoneVideoFrame, setPhoneVideoFrame] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 카메라 시작
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // 후면 카메라 사용
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsCapturing(true)
    } catch (error) {
      console.error('카메라 접근 오류:', error)
      alert('카메라 접근 권한이 필요합니다.')
    }
  }

  // 사진 촬영
  const capturePhoto = async () => {
    // 핸드폰 비디오가 있으면 그것을 사용
    if (phoneVideoFrame) {
      setCapturedImage(phoneVideoFrame)
      return
    }

    // 로컬 카메라 사용
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg')
    setCapturedImage(imageData)

    // 카메라 중지
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
  }

  // YOLO API로 이미지 전송
  const processImage = async () => {
    if (!capturedImage) return

    setIsProcessing(true)
    try {
      // base64 이미지를 Blob으로 변환
      const response = await fetch(capturedImage)
      const blob = await response.blob()

      // FormData 생성
      const formData = new FormData()
      formData.append('image', blob, 'cart-image.jpg')

      // YOLO API 호출
      const apiResponse = await fetch('/api/yolo', {
        method: 'POST',
        body: formData,
      })

      const result = await apiResponse.json()

      if (result.success) {
        setDetectedCount(result.count)
        setYOLOCount(result.count)
        // 다음 페이지로 이동
        setTimeout(() => {
          router.push('/barcode-scan')
        }, 1500)
      } else {
        alert('객체 탐지 중 오류가 발생했습니다: ' + result.message)
      }
    } catch (error) {
      console.error('YOLO 처리 오류:', error)
      alert('이미지 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  // 다시 촬영
  const retakePhoto = () => {
    setCapturedImage(null)
    setDetectedCount(null)
    startCamera()
  }

  // 핸드폰 비디오 프레임 받기 (QR 연동된 경우)
  useEffect(() => {
    if (!isConnected || !deviceId) return

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
  }, [isConnected, deviceId])

  // QR 연동 상태 확인 및 카메라 시작
  useEffect(() => {
    // QR 연동이 되어 있고 핸드폰 비디오가 없으면 로컬 카메라 시작
    if (isConnected && !phoneVideoFrame) {
      startCamera()
    }
    
    return () => {
      // 컴포넌트 언마운트 시 카메라 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
    }
  }, [isConnected, phoneVideoFrame])

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="flex flex-col items-center min-h-screen px-7 py-20">
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between w-full max-w-[1420px] mb-8">
          {/* 타이틀 */}
          <h1 
            className="text-[52px] font-semibold leading-[62px] tracking-[-2px] text-center flex-1 font-[var(--font-poppins)]"
            style={{ 
              color: '#090914'
            }}
          >
            결제를 시작합니다.
          </h1>

          {/* 사진 촬영하기 버튼 */}
          {!capturedImage && (
            <button
              onClick={capturePhoto}
              disabled={!isCapturing}
              className="flex items-center gap-2 px-6 py-4 rounded-[10px] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: '#18181b',
                color: '#ffffff'
              }}
            >
              <span 
                className="text-lg font-bold leading-6 font-[var(--font-plus-jakarta-sans)]"
              >
                사진 촬영하기
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
          )}
        </div>

        {/* Form 영역 (카메라/이미지 표시) */}
        <div 
          className="w-full max-w-[1364px] rounded-[20px] overflow-hidden"
          style={{ 
            backgroundColor: '#ffffff',
            minHeight: '600px'
          }}
        >
          {!isConnected ? (
            // QR 연동 안내 메시지
            <div className="relative w-full h-[600px] bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xl text-gray-600 mb-4">
                  QR 코드를 먼저 스캔해주세요
                </p>
                <button
                  onClick={() => router.push('/qr-scan')}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
                >
                  QR 코드 스캔하러 가기
                </button>
              </div>
            </div>
          ) : !capturedImage ? (
            // 카메라 미리보기 (QR 연동된 경우)
            <div className="relative w-full h-[600px] bg-black flex items-center justify-center">
              {phoneVideoFrame ? (
                // 핸드폰 카메라 화면 표시
                <img
                  src={phoneVideoFrame}
                  alt="핸드폰 카메라 화면"
                  className="w-full h-full object-contain"
                />
              ) : (
                // 로컬 카메라 화면
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!isCapturing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <button
                        onClick={startCamera}
                        className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-100"
                      >
                        카메라 시작
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            // 촬영된 이미지 표시
            <div className="relative w-full h-[600px] bg-black flex items-center justify-center">
              <img
                src={capturedImage}
                alt="촬영된 장바구니"
                className="w-full h-full object-contain"
              />
              
              {/* 처리 중 오버레이 */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-xl font-semibold">
                    객체 탐지 중...
                  </div>
                </div>
              )}

              {/* 탐지 결과 표시 */}
              {detectedCount !== null && !isProcessing && (
                <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold">
                  탐지된 객체: {detectedCount}개
                </div>
              )}

              {/* 액션 버튼들 */}
              {!isProcessing && detectedCount === null && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                  <button
                    onClick={retakePhoto}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold"
                  >
                    다시 촬영
                  </button>
                  <button
                    onClick={processImage}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold"
                  >
                    분석하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 숨겨진 canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </main>
  )
}

