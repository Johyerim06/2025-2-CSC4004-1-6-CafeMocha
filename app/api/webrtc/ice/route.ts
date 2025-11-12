import { NextResponse } from 'next/server'

// ICE Candidate를 저장하는 메모리 스토어
const iceCandidates = new Map<string, RTCIceCandidateInit[]>()

export async function POST(request: Request) {
  try {
    const { deviceId, candidate, type } = await request.json()

    if (!deviceId || !candidate) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 candidate가 필요합니다.' },
        { status: 400 }
      )
    }

    // ICE Candidate 저장
    if (!iceCandidates.has(deviceId)) {
      iceCandidates.set(deviceId, [])
    }

    if (type === 'add') {
      iceCandidates.get(deviceId)!.push(candidate)
    }

    return NextResponse.json({
      success: true,
      message: 'ICE Candidate가 저장되었습니다.',
    })
  } catch (error) {
    console.error('ICE Candidate 저장 오류:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'ICE Candidate 저장 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('deviceId')
  const type = searchParams.get('type') || 'web' // 'web' 또는 'phone'

  if (!deviceId) {
    return NextResponse.json(
      { success: false, message: 'deviceId가 필요합니다.' },
      { status: 400 }
    )
  }

  const candidates = iceCandidates.get(`${deviceId}-${type}`) || []

  return NextResponse.json({
    success: true,
    candidates,
  })
}

