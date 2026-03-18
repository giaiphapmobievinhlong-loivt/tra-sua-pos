import type { Metadata, Viewport } from 'next'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Trà Sữa Nhà Mèo',
  description: 'Hệ thống quản lý bán hàng trà sữa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nhà Mèo',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f97316',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nhà Mèo" />
      </head>
      <body>
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js')
            }
          `}
        </Script>
      </body>
    </html>
  )
}
