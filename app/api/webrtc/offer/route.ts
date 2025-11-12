import { NextResponse } from 'next/server'

// WebRTC Offer를 저장하는 간단한 메모리 스토어 (실제로는 Redis 등 사용 권장)
const offers = new Map<string, { offer: RTCSessionDescriptionInit; timestamp: number }>()

export async function POST(request: Request) {
  try {
    const { deviceId, offer } = await request.json()

    if (!deviceId || !offer) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 offer가 필요합니다.' },
        { status: 400 }
      )
    }

    // Offer 저장 (5분 후 자동 삭제)
    offers.set(deviceId, {
      offer: offer as RTCSessionDescriptionInit,
      timestamp: Date.now(),
    })

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

  const offerData = offers.get(deviceId)

  if (!offerData) {
    return NextResponse.json(
      { success: false, message: 'Offer를 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  // 5분 이상 지난 Offer는 삭제
  if (Date.now() - offerData.timestamp > 5 * 60 * 1000) {
    offers.delete(deviceId)
    return NextResponse.json(
      { success: false, message: 'Offer가 만료되었습니다.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    offer: offerData.offer,
  })
}

