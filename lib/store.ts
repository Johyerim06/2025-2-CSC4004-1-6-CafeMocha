import { create } from 'zustand'
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

export const useStore = create<Store>((set, get) => ({
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
}))

