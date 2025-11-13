'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import {
  createWebRTCPeerConnection,
  createOffer,
  sendOfferToServer,
  sendIceCandidateToServer,
  pollForAnswer,
  pollForIceCandidates,
} from './webrtc'

export default function YOLOScanPage() {
  const router = useRouter()
  const { 
    setYOLOCount, 
    isConnected, 
    deviceId,
    setConnected
  } = useStore()
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [detectedCount, setDetectedCount] = useState<number | null>(null)
  const [phoneVideoFrame, setPhoneVideoFrame] = useState<string | null>(null)
  const [webrtcStream, setWebrtcStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const webrtcVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const base64PollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
    let imageData: string | null = null

    // WebRTC 스트림이 있으면 그것을 사용 (최우선)
    if (webrtcStream && webrtcVideoRef.current && canvasRef.current) {
      const video = webrtcVideoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        imageData = canvas.toDataURL('image/jpeg', 0.9)
      }
    }
    // Base64 이미지가 있으면 그것을 사용
    else if (phoneVideoFrame) {
      imageData = phoneVideoFrame
    }
    // 로컬 카메라 사용
    else if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        imageData = canvas.toDataURL('image/jpeg', 0.9)
      }

      // 로컬 카메라 중지
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
        streamRef.current = null
      }
      setIsCapturing(false)
    }

    if (imageData) {
      setCapturedImage(imageData)
      // 사진 촬영 후 자동으로 YOLO API로 전송
      await processImageWithData(imageData)
    }
  }

  // 이미지 데이터로 YOLO 처리
  const processImageWithData = async (imageData: string) => {
    setIsProcessing(true)
    try {
      // base64 이미지를 Blob으로 변환
      const response = await fetch(imageData)
      const blob = await response.blob()

      // FormData 생성
      const formData = new FormData()
      formData.append('image', blob, 'cart-image.jpg')

      console.log('YOLO API로 이미지 전송 중...')

      // YOLO API 호출
      const apiResponse = await fetch('/api/yolo', {
        method: 'POST',
        body: formData,
      })

      const result = await apiResponse.json()

      console.log('YOLO API 응답:', result)

      if (result.success) {
        setDetectedCount(result.count)
        setYOLOCount(result.count)
        console.log(`YOLO 탐지 완료: ${result.count}개 객체 발견`)
        // 다음 페이지로 이동
        setTimeout(() => {
          router.push('/barcode-scan')
        }, 1500)
      } else {
        console.error('YOLO 탐지 실패:', result.message)
        alert(`YOLO 탐지 실패: ${result.message || '알 수 없는 오류'}`)
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('YOLO API 오류:', error)
      alert('YOLO API 호출 중 오류가 발생했습니다.')
      setIsProcessing(false)
    }
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

  // Base64 폴링 시작 함수 (외부에서 호출 가능하도록)
  const startBase64Polling = () => {
    if (!deviceId) return
    
    // 기존 폴링이 있으면 중지
    if (base64PollingIntervalRef.current) {
      clearInterval(base64PollingIntervalRef.current)
      base64PollingIntervalRef.current = null
    }
    
    console.log('Base64 비디오 프레임 폴링 시작:', deviceId)
    let retryCount = 0
    const maxRetries = 30 // 6초 동안 시도 (200ms * 30)
    
    base64PollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/phone/video?deviceId=${deviceId}`)
        const result = await response.json()

        if (result.success && result.imageData) {
          console.log('✅ 핸드폰 비디오 프레임 수신 성공 (base64)')
          setPhoneVideoFrame(result.imageData)
          retryCount = 0
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
            streamRef.current = null
            setIsCapturing(false)
          }
        } else {
          retryCount++
          if (retryCount % 10 === 0) {
            console.log(`핸드폰 비디오 프레임 대기 중... (시도 ${retryCount}/${maxRetries})`, result)
          }
          // 핸드폰 연결이 끊어졌을 때는 자동으로 로컬 카메라를 시작하지 않음
          // 사용자가 명시적으로 "로컬 카메라 사용" 버튼을 눌러야 함
          if (retryCount >= maxRetries && !phoneVideoFrame && !isCapturing) {
            if (!webrtcStream) {
              console.log('핸드폰 비디오를 받지 못함 - 사용자가 로컬 카메라 버튼을 눌러야 함')
            }
          }
        }
      } catch (error) {
        retryCount++
        console.error('비디오 프레임 폴링 오류:', error)
        // 핸드폰 연결이 끊어졌을 때는 자동으로 로컬 카메라를 시작하지 않음
        if (retryCount >= maxRetries && !phoneVideoFrame && !isCapturing) {
          if (!webrtcStream) {
            console.log('핸드폰 비디오 연결 실패 - 사용자가 로컬 카메라 버튼을 눌러야 함')
          }
        }
      }
    }, 200)
  }

  // WebRTC 연결 함수 (외부에서 호출 가능하도록)
  const reconnectWebRTC = async () => {
    // deviceId가 없으면 store에서 가져오기 시도
    const currentDeviceId = deviceId || (typeof window !== 'undefined' ? (() => {
      try {
        const stored = localStorage.getItem('smart-cart-storage')
        if (stored) {
          const parsed = JSON.parse(stored)
          return parsed.state?.deviceId || null
        }
      } catch (error) {
        console.error('LocalStorage 읽기 오류:', error)
      }
      return null
    })() : null)
    
    if (!currentDeviceId) {
      console.warn('deviceId가 없어 WebRTC 재연결 불가')
      return
    }
    
    // deviceId가 store와 다르면 업데이트
    if (currentDeviceId !== deviceId) {
      setConnected(currentDeviceId)
    }
    
    const targetDeviceId = currentDeviceId

    // 기존 PeerConnection 정리
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    let stopAnswerPolling: (() => void) | null = null
    let stopIcePolling: (() => void) | null = null

    try {
      console.log('WebRTC 재연결 시작...', { deviceId: targetDeviceId })
      
      // WebRTC PeerConnection 생성
      const pc = await createWebRTCPeerConnection(
        targetDeviceId,
        (stream) => {
          console.log('WebRTC 스트림 재연결 성공!', stream)
          // 로컬 state에만 저장 (Zustand에는 저장하지 않음)
          setWebrtcStream(stream)
          
          // 비디오 요소에 스트림 할당
          const assignStream = () => {
            if (webrtcVideoRef.current) {
              console.log('비디오 요소에 WebRTC 스트림 재할당')
              webrtcVideoRef.current.srcObject = stream
              webrtcVideoRef.current.play().catch((error) => {
                console.error('비디오 재생 오류:', error)
              })
            } else {
              setTimeout(assignStream, 100)
            }
          }
          assignStream()
        },
        async (candidate) => {
          await sendIceCandidateToServer(targetDeviceId, candidate)
        }
      )

      pcRef.current = pc

      // Offer 생성 및 전송
      const offer = await createOffer(targetDeviceId, pc)
      await sendOfferToServer(targetDeviceId, offer)

      // Answer 폴링 시작
      stopAnswerPolling = await pollForAnswer(targetDeviceId, pc, async (answer) => {
        console.log('WebRTC Answer 수신 완료 (재연결)')
      })

      // ICE Candidate 폴링 시작
      stopIcePolling = await pollForIceCandidates(targetDeviceId, pc, 'phone')
    } catch (error) {
      console.error('WebRTC 재연결 실패:', error)
      // 재연결 실패 시 Base64 폴백
      startBase64Polling()
    }
  }

  // 다시 촬영
  const retakePhoto = () => {
    console.log('다시 촬영 버튼 클릭:', {
      isConnected,
      deviceId
    })
    
    setCapturedImage(null)
    setDetectedCount(null)
    setIsProcessing(false)
    
    // 로컬 카메라 중지 (혹시 켜져 있다면)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      streamRef.current = null
      setIsCapturing(false)
    }
    
    // 핸드폰 연결 정보가 있으면 재연결 시도
    if (isConnected && deviceId) {
      console.log('저장된 핸드폰 연결 정보로 재연결 시도:', deviceId)
      reconnectWebRTC()
    } else {
      // 연결 정보가 없으면 QR 스캔 페이지로 이동
      console.log('핸드폰 연결 정보가 없어 QR 스캔 페이지로 이동')
      router.push('/qr-scan')
    }
  }

  // WebRTC 연결 시작 (QR 연동된 경우)
  useEffect(() => {
    // LocalStorage에서 복구된 연결 정보 확인 및 자동 재연결
    if (!isConnected || !deviceId) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('smart-cart-storage')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (parsed.state?.deviceId && parsed.state?.isConnected) {
              console.log('LocalStorage에서 연결 정보 복구됨:', parsed.state.deviceId)
              // store 업데이트
              setConnected(parsed.state.deviceId)
              // 약간의 지연 후 재연결 (Zustand state가 먼저 복구되도록)
              setTimeout(() => {
                reconnectWebRTC()
              }, 1000)
            }
          } catch (error) {
            console.error('LocalStorage 파싱 오류:', error)
          }
        }
      }
      return
    }

    let stopAnswerPolling: (() => void) | null = null
    let stopIcePolling: (() => void) | null = null

    const initWebRTC = async () => {
      try {
        console.log('WebRTC 연결 시작...')
        
        // WebRTC PeerConnection 생성
        const pc = await createWebRTCPeerConnection(
          deviceId,
          (stream) => {
            console.log('WebRTC 스트림 수신 성공!', stream, {
              id: stream.id,
              active: stream.active,
              tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
            })
            // 로컬 state에만 저장 (Zustand에는 저장하지 않음)
            setWebrtcStream(stream)
            
            // 비디오 요소에 스트림 할당 (즉시 시도)
            const assignStream = () => {
              if (webrtcVideoRef.current) {
                console.log('비디오 요소에 WebRTC 스트림 할당 시도:', {
                  videoElement: !!webrtcVideoRef.current,
                  streamId: stream.id,
                  streamActive: stream.active
                })
                webrtcVideoRef.current.srcObject = stream
                
                // 강제로 재생 시도
                const playPromise = webrtcVideoRef.current.play()
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      console.log('✅ WebRTC 비디오 재생 성공')
                    })
                    .catch((error) => {
                      console.error('❌ WebRTC 비디오 재생 오류:', error)
                      // 재생 실패 시 다시 시도
                      setTimeout(() => {
                        if (webrtcVideoRef.current && webrtcVideoRef.current.srcObject === stream) {
                          webrtcVideoRef.current.play().catch((err) => {
                            console.error('재시도 후 재생 오류:', err)
                          })
                        }
                      }, 500)
                    })
                }
              } else {
                // 비디오 요소가 아직 준비되지 않았으면 잠시 후 재시도
                console.log('비디오 요소가 아직 준비되지 않음, 100ms 후 재시도')
                setTimeout(assignStream, 100)
              }
            }
            assignStream()
            
            // WebRTC 연결 성공 시 로컬 카메라 중지
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
              streamRef.current = null
              setIsCapturing(false)
            }
          },
          async (candidate) => {
            await sendIceCandidateToServer(deviceId, candidate)
          }
        )

        pcRef.current = pc

        // Offer 생성 및 전송
        const offer = await createOffer(deviceId, pc)
        await sendOfferToServer(deviceId, offer)

        // Answer 폴링 시작
        stopAnswerPolling = await pollForAnswer(deviceId, pc, async (answer) => {
          console.log('WebRTC Answer 수신 완료')
        })

        // ICE Candidate 폴링 시작
        stopIcePolling = await pollForIceCandidates(deviceId, pc, 'phone')
        
        // WebRTC 연결 타임아웃 체크 (10초 후에도 연결되지 않으면 Base64 폴백)
        setTimeout(() => {
          if (!webrtcStream && !phoneVideoFrame) {
            console.log('WebRTC 연결 타임아웃 (10초), Base64 폴백 시작')
            startBase64Polling()
          }
        }, 10000) // 10초 후
      } catch (error) {
        console.error('WebRTC 초기화 실패:', error)
        // WebRTC 실패 시 base64 방식으로 폴백
        console.log('WebRTC 연결 실패, Base64 폴백 시작')
        startBase64Polling()
      }
    }

    // WebRTC만 사용 (Base64는 WebRTC 실패 시에만 폴백)
    initWebRTC()

    return () => {
      if (stopAnswerPolling) stopAnswerPolling()
      if (stopIcePolling) stopIcePolling()
      if (base64PollingIntervalRef.current) {
        clearInterval(base64PollingIntervalRef.current)
        base64PollingIntervalRef.current = null
      }
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
    }
  }, [isConnected, deviceId])

  // WebRTC 스트림이 변경될 때 비디오 요소에 할당
  useEffect(() => {
    if (webrtcStream && webrtcVideoRef.current) {
      console.log('WebRTC 스트림 변경 감지 - 비디오 요소에 할당:', {
        streamId: webrtcStream.id,
        streamActive: webrtcStream.active,
        videoElement: !!webrtcVideoRef.current,
        hasSrcObject: !!webrtcVideoRef.current.srcObject
      })
      
      // 기존 스트림과 다를 때만 할당
      if (webrtcVideoRef.current.srcObject !== webrtcStream) {
        webrtcVideoRef.current.srcObject = webrtcStream
        
        // 재생 시도
        const playPromise = webrtcVideoRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ WebRTC 비디오 재생 성공 (useEffect)')
            })
            .catch((error) => {
              console.error('❌ WebRTC 비디오 재생 오류 (useEffect):', error)
            })
        }
      } else {
        // 같은 스트림이면 재생만 확인
        if (webrtcVideoRef.current.paused) {
          console.log('비디오가 일시정지 상태, 재생 시도')
          webrtcVideoRef.current.play().catch((error) => {
            console.error('재생 오류:', error)
          })
        }
      }
    }
  }, [webrtcStream])

  // QR 연동 상태 확인 및 카메라 시작 (핸드폰 비디오가 없을 때만)
  useEffect(() => {
    // QR 연동이 되어 있지만 핸드폰 비디오가 없고, 로컬 카메라도 시작되지 않은 경우
    // 이 useEffect는 핸드폰 비디오 폴링에서 처리하므로 여기서는 제거
    return () => {
      // 컴포넌트 언마운트 시 카메라 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
    }
  }, [])

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
              disabled={isProcessing || (!isCapturing && !webrtcStream && !phoneVideoFrame)}
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
          className="w-full max-w-[600px] rounded-[20px] overflow-hidden mx-auto"
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
              {webrtcStream ? (
                // WebRTC 스트림 표시 (최우선)
                <div className="w-full h-full relative overflow-hidden">
                  <video
                    key={`webrtc-${webrtcStream.id}`}
                    ref={webrtcVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                    style={{ 
                      backgroundColor: '#000'
                    }}
                    onLoadedMetadata={() => {
                      console.log('✅ 비디오 메타데이터 로드 완료', {
                        videoWidth: webrtcVideoRef.current?.videoWidth,
                        videoHeight: webrtcVideoRef.current?.videoHeight,
                        readyState: webrtcVideoRef.current?.readyState,
                        paused: webrtcVideoRef.current?.paused,
                        srcObject: !!webrtcVideoRef.current?.srcObject
                      })
                      if (webrtcVideoRef.current && webrtcVideoRef.current.paused) {
                        webrtcVideoRef.current.play().catch((error) => {
                          console.error('비디오 재생 오류:', error)
                        })
                      }
                    }}
                    onCanPlay={() => {
                      console.log('✅ 비디오 재생 가능')
                      if (webrtcVideoRef.current && webrtcVideoRef.current.paused) {
                        webrtcVideoRef.current.play().catch((error) => {
                          console.error('canPlay 후 재생 오류:', error)
                        })
                      }
                    }}
                    onPlay={() => {
                      console.log('✅ 비디오 재생 시작')
                    }}
                    onPlaying={() => {
                      console.log('✅ 비디오 재생 중')
                    }}
                    onPause={() => {
                      console.warn('⚠️ 비디오 일시정지됨')
                    }}
                    onWaiting={() => {
                      console.warn('⚠️ 비디오 버퍼링 대기 중')
                    }}
                    onError={(e) => {
                      console.error('❌ 비디오 오류:', e, {
                        error: webrtcVideoRef.current?.error,
                        networkState: webrtcVideoRef.current?.networkState,
                        readyState: webrtcVideoRef.current?.readyState
                      })
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs z-10">
                    WebRTC 연결됨 (실시간)
                  </div>
                </div>
              ) : phoneVideoFrame ? (
                // Base64 이미지 표시 (WebRTC 폴백)
                <div className="w-full h-full relative overflow-hidden">
                  <img
                    src={phoneVideoFrame}
                    alt="핸드폰 카메라 화면"
                    className="w-full h-full object-contain"
                    key={phoneVideoFrame.substring(0, 50)} // 강제 리렌더링
                    style={{ 
                      backgroundColor: '#000'
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs">
                    Base64 연결됨
                  </div>
                </div>
              ) : (
                // 로컬 카메라 화면 (핸드폰 비디오가 없을 때만)
                <>
                  {isCapturing ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="text-center">
                        <p className="text-white mb-2 text-lg">핸드폰 카메라 연결 대기 중...</p>
                        <p className="text-white mb-4 text-sm opacity-75">
                          WebRTC: {webrtcStream ? '✅ 연결됨' : '❌ 대기 중'} | 
                          Base64: {phoneVideoFrame ? '✅ 수신됨' : '❌ 대기 중'}
                        </p>
                        <p className="text-white mb-4 text-xs opacity-50">
                          Device ID: {deviceId}
                        </p>
                        <button
                          onClick={startCamera}
                          className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-100"
                        >
                          로컬 카메라 사용
                        </button>
                      </div>
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

