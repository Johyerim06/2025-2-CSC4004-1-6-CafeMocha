import { NextResponse } from 'next/server'
import products from '@/data/products.json'
import { Product } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const barcode = searchParams.get('barcode')

  if (barcode) {
    // 바코드로 상품 검색
    const product = products.find(
      (p: Product) => p.barcode === barcode
    ) as Product | undefined

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
}

