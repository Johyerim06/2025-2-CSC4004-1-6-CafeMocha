import { NextResponse } from 'next/server'
import { YOLODetection } from '@/types'

// YOLO 팀에서 제공하는 API 엔드포인트로 요청을 전달
// 실제 YOLO API URL은 환경 변수로 설정 필요
const YOLO_API_URL = process.env.YOLO_API_URL || 'http://localhost:8000/api/yolo/detect'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json(
        { success: false, message: '이미지가 제공되지 않았습니다.' },
        { status: 400 }
      )
    }

    // YOLO 팀의 API로 이미지 전송
    const yoloFormData = new FormData()
    yoloFormData.append('image', image)

    const response = await fetch(YOLO_API_URL, {
      method: 'POST',
      body: yoloFormData,
    })

    if (!response.ok) {
      throw new Error('YOLO API 요청 실패')
    }

    const result: YOLODetection = await response.json()

    return NextResponse.json({
      success: true,
      count: result.count,
      objects: result.objects,
    })
  } catch (error) {
    console.error('YOLO API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        message: '객체 탐지 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

