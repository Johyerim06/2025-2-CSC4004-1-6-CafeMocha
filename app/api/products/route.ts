import { NextResponse } from 'next/server'
import { Product } from '@/types'
import fs from 'fs'
import path from 'path'

export async function GET(request: Request) {
  try {
    // JSON 파일 읽기
    const filePath = path.join(process.cwd(), 'data', 'products.json')
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const products: Product[] = JSON.parse(fileContents)

    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')

    if (barcode) {
      // 바코드로 상품 검색
      const product = products.find(
        (p: Product) => p.barcode === barcode
      )

      if (product) {
        return NextResponse.json({ success: true, product })
      } else {
        return NextResponse.json(
          { success: false, message: '상품을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
    }

    // 전체 상품 목록 반환
    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error('상품 조회 오류:', error)
    return NextResponse.json(
      { success: false, message: '상품 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

