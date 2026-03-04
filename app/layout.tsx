import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Trà Sữa POS',
  description: 'Hệ thống quản lý bán hàng trà sữa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
