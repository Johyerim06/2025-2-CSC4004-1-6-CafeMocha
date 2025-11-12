// 상품 타입
export interface Product {
  id: string
  barcode: string
  name: string
  price: number
  image?: string
}

// 장바구니 아이템 타입
export interface CartItem {
  product: Product
  quantity: number
}

// YOLO 탐지 결과 타입
export interface YOLODetection {
  count: number
  objects: Array<{
    label: string
    confidence: number
    bbox: [number, number, number, number]
  }>
}

// 앱 상태 타입
export interface AppState {
  isConnected: boolean
  deviceId: string | null
  cartItems: CartItem[]
  yoloCount: number | null
  scanResult: 'success' | 'error' | null
}

