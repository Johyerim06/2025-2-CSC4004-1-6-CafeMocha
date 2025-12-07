'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

export default function YOLOScanPage() {
  const router = useRouter()
  const { 
    setYOLOCount
  } = useStore()
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [detectedCount, setDetectedCount] = useState<number | null>(null)
  const [failureCount, setFailureCount] = useState(0)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCount, setManualCount] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const waitForVideoReady = (video: HTMLVideoElement, timeout = 3000) => {
    return new Promise<void>((resolve, reject) => {
      let resolved = false

      const onReady = () => {
        if (resolved) return
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolved = true
          cleanup()
          resolve()
        }
      }

      const onLoaded = () => onReady()
      const onTimeUpdate = () => onReady()

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded)
        video.removeEventListener('timeupdate', onTimeUpdate)
        video.removeEventListener('playing', onReady)
        if (timer) clearTimeout(timer)
      }

      video.addEventListener('loadedmetadata', onLoaded)
      video.addEventListener('timeupdate', onTimeUpdate)
      video.addEventListener('playing', onReady)

      const timer = setTimeout(() => {
        if (resolved) return
        cleanup()
        reject(new Error('video ready timeout'))
      }, timeout)

      onReady()
    })
  }

  const tryPlayVideo = async (video: HTMLVideoElement, tries = 3, delayMs = 200) => {
    for (let i = 0; i < tries; i++) {
      try {
        await video.play()
        return true
      } catch (e) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
    return false
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      try { videoRef.current.pause() } catch (e) {}
      try { videoRef.current.srcObject = null } catch (e) {}
    }
    setIsCapturing(false)
  }

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null
      }

      await new Promise(r => setTimeout(r, 200))

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (!videoRef.current) {
        const waitForRef = async (timeout = 1000) => {
          const start = Date.now()
          while (!videoRef.current && Date.now() - start < timeout) {
            await new Promise(r => setTimeout(r, 50))
          }
          return !!videoRef.current
        }
        await waitForRef(1000)
      }

      if (!videoRef.current) {
        setIsCapturing(false)
        return
      }

      const video = videoRef.current

      video.muted = true
      video.playsInline = true
      video.setAttribute('playsinline', 'true')
      video.srcObject = stream

      try {
        await waitForVideoReady(video, 3500)
      } catch (e) {}

      await tryPlayVideo(video, 5, 250)

      setIsCapturing(true)
    } catch (err: any) {
      if (err && err.name === 'NotAllowedError') {
        alert('카메라 권한이 거부되었습니다. 브라우저 설정에서 권한 허용 후 다시 시도하세요.')
      } else if (err && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError')) {
        alert('카메라를 찾을 수 없습니다. 다른 카메라를 연결하거나 제약을 완화해 보세요.')
      } else {
        alert('카메라 실행 중 오류가 발생했습니다. 콘솔을 확인하세요.')
      }
      setIsCapturing(false)
    }
  }

  const capturePhoto = async () => {
    let imageData: string | null = null

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        imageData = canvas.toDataURL('image/jpeg', 0.9)
      }

      stopCamera()
    }

    if (imageData) {
      setCapturedImage(imageData)
      await processImageWithData(imageData)
    }
  }

  const processImageWithData = async (imageData: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(imageData)
      const blob = await response.blob()

      const formData = new FormData()
      formData.append('image', blob, 'cart-image.jpg')

      const apiResponse = await fetch('/api/yolo', {
        method: 'POST',
        body: formData,
      })

      const result = await apiResponse.json()

      if (result.success) {
        if (result.count === 0) {
          setDetectedCount(0)
          setIsProcessing(false)
          setShowManualInput(true)
          return
        }
        
        setDetectedCount(result.count)
        setYOLOCount(result.count)
        setFailureCount(0)
        setTimeout(() => {
          router.push('/barcode-scan')
        }, 1500)
      } else {
        const newFailureCount = failureCount + 1
        setFailureCount(newFailureCount)
        
        if (newFailureCount >= 3) {
          setIsProcessing(false)
          setShowManualInput(true)
        } else {
          alert(`상품 탐지 중 오류가 발생했습니다 (${newFailureCount}/3): ${result.message || '알 수 없는 오류'}`)
          setIsProcessing(false)
          setCapturedImage(null)
          setDetectedCount(null)
          await startCamera()
        }
      }
    } catch (error) {
      const newFailureCount = failureCount + 1
      setFailureCount(newFailureCount)
      
      if (newFailureCount >= 3) {
        setIsProcessing(false)
        setShowManualInput(true)
      } else {
        alert(`상품 탐지 중 오류가 발생했습니다 (${newFailureCount}/3)`)
        setIsProcessing(false)
        setCapturedImage(null)
        setDetectedCount(null)
        await startCamera()
      }
    }
  }

  const processImage = async () => {
    if (!capturedImage) return

    setIsProcessing(true)
    try {
      const response = await fetch(capturedImage)
      const blob = await response.blob()

      const formData = new FormData()
      formData.append('image', blob, 'cart-image.jpg')

      const apiResponse = await fetch('/api/yolo', {
        method: 'POST',
        body: formData,
      })

      const result = await apiResponse.json()

      if (result.success) {
        if (result.count === 0) {
          setDetectedCount(0)
          setIsProcessing(false)
          setShowManualInput(true)
          return
        }
        
        setDetectedCount(result.count)
        setYOLOCount(result.count)
        setFailureCount(0)
        setTimeout(() => {
          router.push('/barcode-scan')
        }, 1500)
      } else {
        const newFailureCount = failureCount + 1
        setFailureCount(newFailureCount)
        
        if (newFailureCount >= 3) {
          setIsProcessing(false)
          setShowManualInput(true)
        } else {
          alert(`상품 탐지 중 오류가 발생했습니다 (${newFailureCount}/3): ${result.message || '알 수 없는 오류'}`)
          setIsProcessing(false)
          setCapturedImage(null)
          setDetectedCount(null)
          await startCamera()
        }
      }
    } catch (error) {
      const newFailureCount = failureCount + 1
      setFailureCount(newFailureCount)
      
      if (newFailureCount >= 3) {
        setIsProcessing(false)
        setShowManualInput(true)
        } else {
        alert('상품 탐지 중 오류가 발생했습니다.')
        setIsProcessing(false)
        setCapturedImage(null)
        setDetectedCount(null)
        await startCamera()
      }
    }
  }


  // 다시 촬영
  const retakePhoto = async () => {
    setCapturedImage(null)
    setDetectedCount(null)
    setIsProcessing(false)
    await new Promise(resolve => setTimeout(resolve, 100))
    await startCamera()
  }

  const handleManualInput = () => {
    const count = parseInt(manualCount)
    if (isNaN(count) || count < 0) {
      alert('올바른 숫자를 입력해주세요.')
      return
    }

    setDetectedCount(count)
    setYOLOCount(count)
    setShowManualInput(false)
    setFailureCount(0)
    setManualCount('')
        
    setTimeout(() => {
      router.push('/barcode-scan')
    }, 1500)
  }

  const handleCancelManualInput = () => {
    setShowManualInput(false)
    setManualCount('')
    retakePhoto()
  }
      
  useEffect(() => {
    startCamera()
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
    }
  }, [])

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="flex flex-col items-center min-h-screen px-4 sm:px-6 md:px-7 py-6 sm:py-10 md:py-16 lg:py-20">
        {/* 헤더 영역 */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-[1420px] mb-4 sm:mb-6 md:mb-8 gap-4 sm:gap-0">
          {/* 타이틀 */}
          <h1 
            className="text-3xl sm:text-4xl md:text-[52px] font-bold leading-tight sm:leading-[62px] tracking-[-1.5px] text-center flex-1 font-[var(--font-poppins)]"
            style={{ 
              color: '#090914',
              letterSpacing: '-0.02em'
            }}
          >
            결제를 시작합니다
          </h1>

          {!capturedImage && (
            <button
              onClick={capturePhoto}
              disabled={isProcessing || !isCapturing}
              className="flex items-center gap-2.5 px-5 sm:px-7 py-3.5 sm:py-4.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none text-sm sm:text-base"
              style={{ 
                backgroundColor: '#18181b',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(24, 24, 27, 0.15)'
              }}
            >
              <span 
                className="font-semibold leading-6 font-[var(--font-plus-jakarta-sans)] tracking-tight"
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

        <div 
          className="w-full max-w-[1364px] rounded-2xl overflow-hidden mx-auto shadow-xl"
          style={{ 
            backgroundColor: '#ffffff',
            aspectRatio: '1364/600',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
          }}
        >
          {!capturedImage ? (
            <div className="relative w-full h-full bg-black flex items-center justify-center" style={{ aspectRatio: '1364/600' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ 
                  opacity: isCapturing ? 1 : 0,
                  transition: 'opacity 160ms ease'
                }}
              />
              {!isCapturing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-lg font-medium tracking-wide">카메라 준비중...</div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full bg-black flex items-center justify-center" style={{ aspectRatio: '1364/600' }}>
              <img
                src={capturedImage}
                alt="촬영된 장바구니"
                className="w-full h-full object-contain"
              />
              
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-white text-xl font-semibold tracking-wide">
                    상품 탐지 중...
                  </div>
                </div>
              )}

              {detectedCount !== null && !isProcessing && (
                <div className="absolute top-4 left-4 bg-green-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg backdrop-blur-sm" style={{ boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }}>
                  탐지된 상품: {detectedCount}개
                </div>
              )}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {showManualInput && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200" style={{ boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}>
            <h2 className="text-2xl font-bold mb-5 text-center tracking-tight" style={{ color: '#090914' }}>상품 개수 직접 입력</h2>
            <p className="text-gray-600 mb-7 text-center leading-relaxed text-base">
              {detectedCount === 0 || detectedCount === null ? (
                <>
                  탐지된 상품이 없습니다.<br />
                  결제하실 상품 개수를 입력해주세요.
                </>
              ) : (
                <>
                  자동 탐지가 3번 실패했습니다.<br />
                  상품 개수를 직접 입력해주세요.
                </>
              )}
            </p>
            <div className="mb-7">
              <label className="block text-sm font-semibold mb-3 tracking-tight" style={{ color: '#374151' }}>상품 개수</label>
              <input
                type="number"
                min="0"
                value={manualCount}
                onChange={(e) => setManualCount(e.target.value)}
                className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-xl text-lg text-black focus:outline-none focus:ring-2 focus:ring-[#18181b] focus:border-transparent transition-all duration-200"
                placeholder="숫자를 입력하세요"
                style={{ backgroundColor: '#f9fafb' }}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelManualInput}
                className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 hover:shadow-md"
              >
                취소
              </button>
              <button
                onClick={handleManualInput}
                className="flex-1 px-6 py-3.5 bg-[#18181b] text-white rounded-xl font-semibold hover:opacity-90 transition-all duration-200 hover:shadow-lg"
                style={{ boxShadow: '0 4px 12px rgba(24, 24, 27, 0.2)' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

