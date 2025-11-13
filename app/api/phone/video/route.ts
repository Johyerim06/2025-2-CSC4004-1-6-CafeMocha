import { NextResponse } from 'next/server'
import { redisUtils } from '@/lib/redis'

const VIDEO_FRAME_TTL = 5 // 5초 (초 단위)

export async function POST(request: Request) {
  try {
    const { deviceId, imageData } = await request.json()

    console.log('비디오 프레임 POST 요청 수신:', { deviceId, imageDataLength: imageData?.length })

    if (!deviceId || !imageData) {
      console.error('비디오 프레임 POST 요청 실패: 필수 파라미터 누락', { deviceId: !!deviceId, imageData: !!imageData })
      return NextResponse.json(
        { success: false, message: 'deviceId와 imageData가 필요합니다.' },
        { status: 400 }
      )
    }

    // Redis에 비디오 프레임 저장 (5초 TTL)
    const frameData = {
      imageData,
      timestamp: Date.now(),
    }
    
    await redisUtils.setWithTTL(`phone:video:${deviceId}`, frameData, VIDEO_FRAME_TTL)

    console.log('비디오 프레임 저장 완료:', { deviceId })

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

  console.log('비디오 프레임 GET 요청:', { deviceId })

  if (!deviceId) {
    console.error('비디오 프레임 GET 요청 실패: deviceId 누락')
    return NextResponse.json(
      { success: false, message: 'deviceId가 필요합니다.' },
      { status: 400 }
    )
  }

  try {
    const frameData = await redisUtils.get<{ imageData: string; timestamp: number }>(
      `phone:video:${deviceId}`
    )

    if (!frameData) {
      console.warn('비디오 프레임을 찾을 수 없음:', { deviceId })
      return NextResponse.json(
        { success: false, message: '비디오 프레임을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // TTL은 Redis가 자동으로 처리하지만, 타임스탬프도 확인
    const age = Date.now() - frameData.timestamp
    if (age > VIDEO_FRAME_TTL * 1000) {
      console.warn('비디오 프레임 만료:', { deviceId, age })
      await redisUtils.delete(`phone:video:${deviceId}`)
      return NextResponse.json(
        { success: false, message: '비디오 프레임이 만료되었습니다.' },
        { status: 404 }
      )
    }

    console.log('비디오 프레임 반환:', { deviceId, age })
    return NextResponse.json({
      success: true,
      imageData: frameData.imageData,
    })
  } catch (error) {
    console.error('비디오 프레임 조회 오류:', error)
    return NextResponse.json(
      { success: false, message: '비디오 프레임 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

