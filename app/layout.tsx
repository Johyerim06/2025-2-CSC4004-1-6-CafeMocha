import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter, Poppins } from 'next/font/google'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--font-plus-jakarta-sans',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-inter',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: '무인 결제 보조 시스템',
  description: '스캔을 빠트린 물건이 없는지 확인해보세요.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={`${plusJakartaSans.variable} ${inter.variable} ${poppins.variable}`}>
        {children}
      </body>
    </html>
  )
}

