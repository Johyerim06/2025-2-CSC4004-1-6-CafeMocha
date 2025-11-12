'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library'

export default function PhoneScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scannedText, setScannedText] = useState('')
  const [error, setError] = useState('')
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    // URL에서 deviceId 가져오기 (QR 코드에서 전달받음)
    const params = new URLSearchParams(window.location.search)
    const id = params.get('deviceId')
    setDeviceId(id)

    if (!id) {
      setError('deviceId가 필요합니다. QR 코드를 다시 스캔해주세요.')
      return
    }

    startScanning(id)
  }, [])

  const startScanning = async (deviceId: string) => {
    try {
      // 카메라 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      if (!videoRef.current) return

      videoRef.current.srcObject = stream
      await videoRef.current.play()

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

      return () => {
        try {
          // reader를 통해 스캔 중지
          if (readerRef.current) {
            readerRef.current.reset()
          }
        } catch (error) {
          console.error('스캔 중지 오류:', error)
        }
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
      }
    } catch (e: any) {
      setError(e?.message ?? String(e))
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">핸드폰 바코드 스캔</h1>
        
        <video
          ref={videoRef}
          playsInline
          className="w-full max-w-md rounded-xl bg-black"
          style={{ aspectRatio: '4/3' }}
        />

        <div className="mt-4 p-4 bg-white rounded-lg">
          <div className="text-sm">
            <div>
              <b>스캔 결과:</b> {scannedText || '대기 중...'}
            </div>
            {error && <div className="text-red-600 mt-2">오류: {error}</div>}
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

