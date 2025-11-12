import { NextResponse } from 'next/server'

// 핸드폰에서 스캔한 바코드를 저장하는 메모리 스토어
const scannedBarcodes = new Map<string, { barcode: string; timestamp: number }>()

export async function POST(request: Request) {
  try {
    const { deviceId, barcode } = await request.json()

    if (!deviceId || !barcode) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 barcode가 필요합니다.' },
        { status: 400 }
      )
    }

    // 바코드 저장
    scannedBarcodes.set(deviceId, {
      barcode,
      timestamp: Date.now(),
    })

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

  const barcodeData = scannedBarcodes.get(deviceId)

  if (!barcodeData) {
    return NextResponse.json(
      { success: false, message: '바코드를 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  // 10초 이상 지난 바코드는 삭제
  if (Date.now() - barcodeData.timestamp > 10 * 1000) {
    scannedBarcodes.delete(deviceId)
    return NextResponse.json(
      { success: false, message: '바코드가 만료되었습니다.' },
      { status: 404 }
    )
  }

  // 바코드 반환 후 삭제 (한 번만 사용)
  scannedBarcodes.delete(deviceId)

  return NextResponse.json({
    success: true,
    barcode: barcodeData.barcode,
  })
}

