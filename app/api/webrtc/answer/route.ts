import { NextResponse } from 'next/server'
import { redisUtils } from '@/lib/redis'

const ANSWER_TTL = 5 * 60 // 5분 (초 단위)

export async function POST(request: Request) {
  try {
    const { deviceId, answer } = await request.json()

    if (!deviceId || !answer) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 answer가 필요합니다.' },
        { status: 400 }
      )
    }

    // Redis에 Answer 저장 (5분 TTL)
    const answerData = {
      answer: answer as RTCSessionDescriptionInit,
      timestamp: Date.now(),
    }
    
    await redisUtils.setWithTTL(`webrtc:answer:${deviceId}`, answerData, ANSWER_TTL)

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

  try {
    const answerData = await redisUtils.get<{ answer: RTCSessionDescriptionInit; timestamp: number }>(
      `webrtc:answer:${deviceId}`
    )

    if (!answerData) {
      return NextResponse.json(
        { success: false, message: 'Answer를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // TTL은 Redis가 자동으로 처리하지만, 타임스탬프도 확인
    if (Date.now() - answerData.timestamp > ANSWER_TTL * 1000) {
      await redisUtils.delete(`webrtc:answer:${deviceId}`)
      return NextResponse.json(
        { success: false, message: 'Answer가 만료되었습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      answer: answerData.answer,
    })
  } catch (error) {
    console.error('Answer 조회 오류:', error)
    return NextResponse.json(
      { success: false, message: 'Answer 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

