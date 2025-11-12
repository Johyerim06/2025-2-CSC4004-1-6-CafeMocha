'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library'
import {
  createWebRTCPeerConnection,
  createAnswer,
  sendAnswerToServer,
  sendIceCandidateToServer,
  pollForOffer,
} from './webrtc'

export default function PhoneScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scannedText, setScannedText] = useState('')
  const [error, setError] = useState('')
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // URL에서 deviceId 가져오기 (QR 코드에서 전달받음)
    const params = new URLSearchParams(window.location.search)
    const id = params.get('deviceId')
    setDeviceId(id)

    if (!id) {
      setError('deviceId가 필요합니다. QR 코드를 다시 스캔해주세요.')
      return
    }

    // 이전 cleanup 실행
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    
    setError('') // 에러 초기화
    
    startScanning(id).then((cleanupFn) => {
      cleanupRef.current = cleanupFn
    }).catch((e) => {
      setError(e?.message ?? String(e))
    })

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [retryKey]) // retryKey가 변경되면 다시 실행

  const startScanning = async (deviceId: string): Promise<() => void> => {
    let videoInterval: NodeJS.Timeout | null = null
    let stream: MediaStream | null = null
    let pc: RTCPeerConnection | null = null
    let stopOfferPolling: (() => void) | null = null
    let stopIcePolling: (() => void) | null = null
    
    try {
      // 카메라 권한 확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('이 브라우저는 카메라 접근을 지원하지 않습니다. HTTPS 또는 localhost에서 실행해주세요.')
      }

      // 카메라 권한 요청 (더 유연한 설정)
      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // 후면 카메라 우선
        },
        audio: false,
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (error: any) {
        // 후면 카메라 실패 시 전면 카메라로 시도
        console.warn('후면 카메라 접근 실패, 전면 카메라로 시도:', error.message)
        constraints = {
          video: {
            facingMode: 'user', // 전면 카메라
          },
          audio: false,
        }
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      }

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error('비디오 요소를 찾을 수 없습니다.')
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()

      // 비디오가 준비될 때까지 대기
      await new Promise<void>((resolve) => {
        const checkVideoReady = () => {
          if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
            console.log('핸드폰 카메라 준비 완료:', {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight
            })
            resolve()
          } else {
            setTimeout(checkVideoReady, 100)
          }
        }
        checkVideoReady()
      })

      // 비디오 프레임을 주기적으로 웹으로 전송
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Canvas context를 가져올 수 없습니다.')
      }

      const sendVideoFrame = () => {
        if (!videoRef.current || !ctx) return
        
        // 비디오 크기가 0이면 스킵
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          return
        }
        
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        ctx.drawImage(videoRef.current, 0, 0)
        
        const imageData = canvas.toDataURL('image/jpeg', 0.7)
        
        // 웹으로 비디오 프레임 전송
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : ''
        fetch(`${baseUrl}/api/phone/video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            imageData,
          }),
        })
        .then(response => {
          if (!response.ok) {
            console.error('비디오 프레임 전송 실패:', response.status)
          }
        })
        .catch(error => {
          console.error('비디오 프레임 전송 오류:', error)
        })
      }

      // WebRTC 연결 시도 (서버리스 환경)
      try {
        console.log('WebRTC 연결 시작...')
        
        // WebRTC PeerConnection 생성
        pc = await createWebRTCPeerConnection(
          deviceId,
          stream,
          async (candidate) => {
            await sendIceCandidateToServer(deviceId, candidate)
          }
        )

        // Offer 폴링 시작
        stopOfferPolling = await pollForOffer(deviceId, async (offer) => {
          try {
            // Answer 생성 및 전송
            const answer = await createAnswer(deviceId, pc!, offer)
            await sendAnswerToServer(deviceId, answer)
            
            console.log('WebRTC Answer 전송 완료')
            
            // 웹에서 보낸 ICE Candidate 폴링 시작
            const pollWebIceCandidates = async () => {
              try {
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
                const response = await fetch(`${baseUrl}/api/webrtc/ice?deviceId=${deviceId}&type=web`)
                const result = await response.json()
                
                if (result.success && result.candidates) {
                  for (const candidate of result.candidates) {
                    try {
                      await pc!.addIceCandidate(new RTCIceCandidate(candidate))
                      console.log('웹 ICE Candidate 추가:', candidate)
                    } catch (error) {
                      console.error('ICE Candidate 추가 실패:', error)
                    }
                  }
                }
              } catch (error) {
                console.error('ICE Candidate 폴링 오류:', error)
              }
            }
            
            // ICE Candidate 폴링 시작
            const iceInterval = setInterval(pollWebIceCandidates, 500)
            stopIcePolling = () => clearInterval(iceInterval)
            
            // WebRTC 연결 성공 시 base64 전송 중지
            if (videoInterval) {
              clearInterval(videoInterval)
              videoInterval = null
            }
          } catch (error) {
            console.error('WebRTC Answer 생성 실패:', error)
            // 실패 시 base64 방식으로 폴백
            if (!videoInterval) {
              sendVideoFrame()
              videoInterval = setInterval(sendVideoFrame, 200)
            }
          }
        })
      } catch (error) {
        console.error('WebRTC 초기화 실패, base64 방식 사용:', error)
      }

      // 즉시 첫 프레임 전송 (연결 확인용, WebRTC 폴백용)
      sendVideoFrame()
      console.log('핸드폰 카메라 연결 완료! 비디오 프레임 전송 시작:', deviceId)
      
      // 200ms마다 비디오 프레임 전송 (약 5fps) - WebRTC 실패 시 사용
      if (!videoInterval) {
        videoInterval = setInterval(sendVideoFrame, 200)
      }

      // 바코드 스캔 설정
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ])

      const reader = new BrowserMultiFormatReader(hints, 500) // 500ms 간격
      readerRef.current = reader

      // 바코드 스캔 시작
      await reader.decodeFromVideoDevice(
        null,
        videoRef.current,
        async (result) => {
          if (result) {
            const barcode = result.getText()
            setScannedText(barcode)
            
            // 스캔된 바코드를 웹으로 전송
            try {
              const baseUrl = typeof window !== 'undefined' 
                ? window.location.origin 
                : ''
              const response = await fetch(`${baseUrl}/api/phone/barcode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  deviceId,
                  barcode,
                }),
              })

              const result = await response.json()
              if (result.success) {
                console.log('바코드 전송 성공:', barcode)
              }
            } catch (error) {
              console.error('바코드 전송 오류:', error)
            }
          }
        }
      )

      // cleanup 함수 반환
      return () => {
        console.log('핸드폰 스캔 정리 중...')
        
        // WebRTC 정리
        if (stopOfferPolling) {
          stopOfferPolling()
        }
        if (stopIcePolling) {
          stopIcePolling()
        }
        if (pc) {
          pc.close()
          pc = null
        }
        
        // Base64 전송 정리
        if (videoInterval) {
          clearInterval(videoInterval)
          videoInterval = null
        }
        
        // 바코드 스캔 정리
        try {
          if (readerRef.current) {
            readerRef.current.reset()
          }
        } catch (error) {
          console.error('스캔 중지 오류:', error)
        }
        
        // 스트림 정리
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
          stream = null
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
      }
    } catch (e: any) {
      console.error('카메라 접근 오류:', e)
      
      let errorMessage = '카메라 접근에 실패했습니다.'
      
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.'
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.'
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        errorMessage = '카메라가 다른 앱에서 사용 중이거나 접근할 수 없습니다.'
      } else if (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError') {
        errorMessage = '카메라 설정을 만족할 수 없습니다. 다른 카메라를 시도해주세요.'
      } else if (e.message) {
        errorMessage = e.message
      }
      
      setError(errorMessage)
      // 에러 발생 시 빈 cleanup 함수 반환
      return () => {}
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">핸드폰 바코드 스캔</h1>
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-w-md rounded-xl bg-black"
          style={{ 
            aspectRatio: '4/3',
            objectFit: 'cover',
            transform: 'scaleX(-1)' // 미러링 효과
          }}
        />

        <div className="mt-4 p-4 bg-white rounded-lg">
          <div className="text-sm">
            <div>
              <b>스캔 결과:</b> {scannedText || '대기 중...'}
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-800 font-semibold mb-2">⚠️ 카메라 오류</div>
                <div className="text-red-700 text-sm mb-3">{error}</div>
                <button
                  onClick={() => {
                    setRetryKey(prev => prev + 1) // retryKey 변경으로 useEffect 재실행
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                >
                  다시 시도
                </button>
              </div>
            )}
            {deviceId && (
              <div className="text-xs text-gray-500 mt-2">
                Device ID: {deviceId}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

