import { NextResponse } from 'next/server'
import { redisUtils } from '@/lib/redis'

const OFFER_TTL = 5 * 60 // 5분 (초 단위)

export async function POST(request: Request) {
  try {
    const { deviceId, offer } = await request.json()

    if (!deviceId || !offer) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 offer가 필요합니다.' },
        { status: 400 }
      )
    }

    // Redis에 Offer 저장 (5분 TTL)
    const offerData = {
      offer: offer as RTCSessionDescriptionInit,
      timestamp: Date.now(),
    }
    
    await redisUtils.setWithTTL(`webrtc:offer:${deviceId}`, offerData, OFFER_TTL)

    return NextResponse.json({
      success: true,
      message: 'Offer가 저장되었습니다.',
    })
  } catch (error) {
    console.error('Offer 저장 오류:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Offer 저장 중 오류가 발생했습니다.',
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

  try {
    const offerData = await redisUtils.get<{ offer: RTCSessionDescriptionInit; timestamp: number }>(
      `webrtc:offer:${deviceId}`
    )

    if (!offerData) {
      return NextResponse.json(
        { success: false, message: 'Offer를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // TTL은 Redis가 자동으로 처리하지만, 타임스탬프도 확인
    if (Date.now() - offerData.timestamp > OFFER_TTL * 1000) {
      await redisUtils.delete(`webrtc:offer:${deviceId}`)
      return NextResponse.json(
        { success: false, message: 'Offer가 만료되었습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      offer: offerData.offer,
    })
  } catch (error) {
    console.error('Offer 조회 오류:', error)
    return NextResponse.json(
      { success: false, message: 'Offer 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

