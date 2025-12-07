import { NextResponse } from 'next/server'
import { YOLODetection } from '@/types'

const HF_API_URL = process.env.HF_YOLO_API_URL || 'https://koro277-yolo-fastapi.hf.space/predict'
const HF_API_TOKEN = process.env.HF_API_TOKEN

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

    const hfFormData = new FormData()
    hfFormData.append('file', image)

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      body: hfFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          success: false,
          message: `Hugging Face API 오류 (${response.status}): ${errorText.substring(0, 200)}`,
          error: errorText,
        },
        { status: response.status }
      )
    }

    const hfResult = await response.json()
    
    let resultImageBase64 = null
    let count = 0
    
    if (hfResult.data && Array.isArray(hfResult.data)) {
      resultImageBase64 = hfResult.data[0]
      count = hfResult.data[1] ?? 0
    } else if (hfResult.count !== undefined) {
      count = hfResult.count
      resultImageBase64 = hfResult.image || hfResult.result_image || hfResult.image_url
    } else {
      count = hfResult.count || hfResult.detected_count || 0
      resultImageBase64 = hfResult.image || hfResult.result_image || hfResult.image_url
    }

    let parsedCount = 0
    if (typeof count === 'number') {
      parsedCount = count
    } else if (typeof count === 'string') {
      parsedCount = parseInt(count) || 0
    }

    return NextResponse.json({
      success: true,
      count: parsedCount,
      objects: [],
      resultImage: resultImageBase64,
    } as YOLODetection & { resultImage?: string })
  } catch (error) {
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

