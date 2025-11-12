import { NextResponse } from 'next/server'

// QR 코드 스캔 후 핸드폰에서 이 API를 호출하여 연결
export async function POST(request: Request) {
  try {
    const { deviceId, phoneId } = await request.json()

    if (!deviceId || !phoneId) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 phoneId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 실제로는 여기서 WebSocket 연결이나 세션 관리를 해야 합니다
    // 현재는 단순히 연결 성공 응답만 반환
    
    return NextResponse.json({
      success: true,
      message: '연결되었습니다.',
      deviceId,
      phoneId,
    })
  } catch (error) {
    console.error('QR 연결 오류:', error)
    return NextResponse.json(
      {
        success: false,
        message: '연결 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

