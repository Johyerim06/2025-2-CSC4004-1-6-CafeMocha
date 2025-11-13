import { Redis } from '@upstash/redis'

// Upstash Redis 클라이언트 초기화
// 환경 변수에서 자동으로 가져옴 (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

export default redis

// 유틸리티 함수들
export const redisUtils = {
  // TTL 설정 (초 단위)
  setWithTTL: async (key: string, value: any, ttlSeconds: number) => {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
      console.error('Redis setWithTTL 오류:', error)
      throw error
    }
  },

  // 값 가져오기
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await redis.get(key)
      if (value === null) return null
      return JSON.parse(value as string) as T
    } catch (error) {
      console.error('Redis get 오류:', error)
      return null
    }
  },

  // 값 설정
  set: async (key: string, value: any) => {
    try {
      await redis.set(key, JSON.stringify(value))
    } catch (error) {
      console.error('Redis set 오류:', error)
      throw error
    }
  },

  // 리스트에 추가 (TTL 설정 가능)
  listPush: async (key: string, value: any, ttlSeconds?: number) => {
    try {
      await redis.rpush(key, JSON.stringify(value))
      // TTL이 지정된 경우 설정 (리스트가 없으면 새로 생성되므로 TTL 설정)
      if (ttlSeconds !== undefined) {
        await redis.expire(key, ttlSeconds)
      }
    } catch (error) {
      console.error('Redis listPush 오류:', error)
      throw error
    }
  },

  // 리스트 가져오기
  listGet: async <T>(key: string): Promise<T[]> => {
    try {
      const values = await redis.lrange(key, 0, -1)
      return values.map((v) => JSON.parse(v as string) as T)
    } catch (error) {
      console.error('Redis listGet 오류:', error)
      return []
    }
  },

  // 리스트 삭제
  listDelete: async (key: string) => {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Redis listDelete 오류:', error)
    }
  },

  // 키 삭제
  delete: async (key: string) => {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Redis delete 오류:', error)
    }
  },
}

