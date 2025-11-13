import { NextResponse } from 'next/server'
import { redisUtils } from '@/lib/redis'

const BARCODE_TTL = 10 // 10초 (초 단위)

export async function POST(request: Request) {
  try {
    const { deviceId, barcode } = await request.json()

    if (!deviceId || !barcode) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 barcode가 필요합니다.' },
        { status: 400 }
      )
    }

    // Redis에 바코드 저장 (10초 TTL)
    const barcodeData = {
      barcode,
      timestamp: Date.now(),
    }
    
    await redisUtils.setWithTTL(`phone:barcode:${deviceId}`, barcodeData, BARCODE_TTL)

    return NextResponse.json({
      success: true,
      message: '바코드가 저장되었습니다.',
    })
  } catch (error) {
    console.error('바코드 저장 오류:', error)
    return NextResponse.json(
      {
        success: false,
        message: '바코드 저장 중 오류가 발생했습니다.',
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
    const barcodeData = await redisUtils.get<{ barcode: string; timestamp: number }>(
      `phone:barcode:${deviceId}`
    )

    if (!barcodeData) {
      return NextResponse.json(
        { success: false, message: '바코드를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // TTL은 Redis가 자동으로 처리하지만, 타임스탬프도 확인
    if (Date.now() - barcodeData.timestamp > BARCODE_TTL * 1000) {
      await redisUtils.delete(`phone:barcode:${deviceId}`)
      return NextResponse.json(
        { success: false, message: '바코드가 만료되었습니다.' },
        { status: 404 }
      )
    }

    // 바코드 반환 후 삭제 (한 번만 사용)
    await redisUtils.delete(`phone:barcode:${deviceId}`)

    return NextResponse.json({
      success: true,
      barcode: barcodeData.barcode,
    })
  } catch (error) {
    console.error('바코드 조회 오류:', error)
    return NextResponse.json(
      { success: false, message: '바코드 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

