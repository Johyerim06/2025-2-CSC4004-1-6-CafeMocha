import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppState, CartItem, Product } from '@/types'

interface Store extends AppState {
  // Actions
  setConnected: (deviceId: string) => void
  addProduct: (product: Product) => void
  removeProduct: (barcode: string) => void
  decreaseQuantity: (barcode: string) => void
  setYOLOCount: (count: number) => void
  setScanResult: (result: 'success' | 'error' | null) => void
  resetCart: () => void
  getTotalCount: () => number
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: false,
      deviceId: null,
      cartItems: [],
      yoloCount: null,
      scanResult: null,

  // Actions
  setConnected: (deviceId: string) =>
    set({ isConnected: true, deviceId }),

  addProduct: (product: Product) =>
    set((state) => {
      const existingItem = state.cartItems.find(
        (item) => item.product.barcode === product.barcode
      )

      if (existingItem) {
        return {
          cartItems: state.cartItems.map((item) =>
            item.product.barcode === product.barcode
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }
      }

      return {
        cartItems: [...state.cartItems, { product, quantity: 1 }],
      }
    }),

  removeProduct: (barcode: string) =>
    set((state) => ({
      cartItems: state.cartItems.filter(
        (item) => item.product.barcode !== barcode
      ),
    })),

  decreaseQuantity: (barcode: string) =>
    set((state) => {
      const item = state.cartItems.find(
        (item) => item.product.barcode === barcode
      )

      if (!item) return state

      if (item.quantity > 1) {
        return {
          cartItems: state.cartItems.map((item) =>
            item.product.barcode === barcode
              ? { ...item, quantity: item.quantity - 1 }
              : item
          ),
        }
      } else {
        // 수량이 1이면 제거
        return {
          cartItems: state.cartItems.filter(
            (item) => item.product.barcode !== barcode
          ),
        }
      }
    }),

  setYOLOCount: (count: number) => set({ yoloCount: count }),

  setScanResult: (result: 'success' | 'error' | null) =>
    set({ scanResult: result }),

  resetCart: () =>
    set({
      cartItems: [],
      yoloCount: null,
      scanResult: null,
    }),

  getTotalCount: () => {
    const state = get()
    return state.cartItems.reduce((sum, item) => sum + item.quantity, 0)
  },
    }),
    {
      name: 'smart-cart-storage', // LocalStorage 키 이름
      partialize: (state) => ({
        // 새로고침 후에도 유지할 상태만 저장
        isConnected: state.isConnected,
        deviceId: state.deviceId,
        // cartItems, yoloCount, scanResult는 세션별로 관리하므로 저장하지 않음
      }),
    }
  )
)

