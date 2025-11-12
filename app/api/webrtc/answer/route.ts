import { NextResponse } from 'next/server'

// WebRTC Answer를 저장하는 간단한 메모리 스토어
const answers = new Map<string, { answer: RTCSessionDescriptionInit; timestamp: number }>()

export async function POST(request: Request) {
  try {
    const { deviceId, answer } = await request.json()

    if (!deviceId || !answer) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 answer가 필요합니다.' },
        { status: 400 }
      )
    }

    // Answer 저장
    answers.set(deviceId, {
      answer: answer as RTCSessionDescriptionInit,
      timestamp: Date.now(),
    })

    return NextResponse.json({
      success: true,
      message: 'Answer가 저장되었습니다.',
    })
  } catch (error) {
    console.error('Answer 저장 오류:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Answer 저장 중 오류가 발생했습니다.',
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

  const answerData = answers.get(deviceId)

  if (!answerData) {
    return NextResponse.json(
      { success: false, message: 'Answer를 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  // 5분 이상 지난 Answer는 삭제
  if (Date.now() - answerData.timestamp > 5 * 60 * 1000) {
    answers.delete(deviceId)
    return NextResponse.json(
      { success: false, message: 'Answer가 만료되었습니다.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    answer: answerData.answer,
  })
}

