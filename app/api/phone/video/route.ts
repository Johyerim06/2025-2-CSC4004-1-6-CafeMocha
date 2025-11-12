import { NextResponse } from 'next/server'

// 핸드폰에서 전송한 비디오 프레임을 저장하는 메모리 스토어
const videoFrames = new Map<string, { imageData: string; timestamp: number }>()

export async function POST(request: Request) {
  try {
    const { deviceId, imageData } = await request.json()

    if (!deviceId || !imageData) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 imageData가 필요합니다.' },
        { status: 400 }
      )
    }

    // 비디오 프레임 저장 (최신 프레임만 유지)
    videoFrames.set(deviceId, {
      imageData,
      timestamp: Date.now(),
    })

    return NextResponse.json({
      success: true,
      message: '비디오 프레임이 저장되었습니다.',
    })
  } catch (error) {
    console.error('비디오 프레임 저장 오류:', error)
    return NextResponse.json(
      {
        success: false,
        message: '비디오 프레임 저장 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('deviceId')

  if (!deviceId) {
    return NextResponse.json(
      { success: false, message: 'deviceId가 필요합니다.' },
      { status: 400 }
    )
  }

  const frameData = videoFrames.get(deviceId)

  if (!frameData) {
    return NextResponse.json(
      { success: false, message: '비디오 프레임을 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  // 5초 이상 지난 프레임은 삭제
  if (Date.now() - frameData.timestamp > 5 * 1000) {
    videoFrames.delete(deviceId)
    return NextResponse.json(
      { success: false, message: '비디오 프레임이 만료되었습니다.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    imageData: frameData.imageData,
  })
}

