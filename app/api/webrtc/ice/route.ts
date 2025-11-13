import { NextResponse } from 'next/server'
import { redisUtils } from '@/lib/redis'

const ICE_CANDIDATE_TTL = 5 * 60 // 5분 (초 단위)

export async function POST(request: Request) {
  try {
    const { deviceId, candidate, type } = await request.json()

    if (!deviceId || !candidate) {
      return NextResponse.json(
        { success: false, message: 'deviceId와 candidate가 필요합니다.' },
        { status: 400 }
      )
    }

    // ICE Candidate 저장 (deviceId에 타입 포함)
    const candidateKey = `webrtc:ice:${deviceId}-${type || 'default'}`
    
    if (type === 'add') {
      // 리스트에 추가 (TTL 설정)
      await redisUtils.listPush(candidateKey, candidate, ICE_CANDIDATE_TTL)
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

  try {
    const candidateKey = `webrtc:ice:${deviceId}-${type}`
    const candidates = await redisUtils.listGet<RTCIceCandidateInit>(candidateKey)

    return NextResponse.json({
      success: true,
      candidates: candidates || [],
    })
  } catch (error) {
    console.error('ICE Candidate 조회 오류:', error)
    return NextResponse.json(
      { success: false, message: 'ICE Candidate 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

