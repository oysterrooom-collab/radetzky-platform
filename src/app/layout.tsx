import type { Metadata, Viewport } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'Radetzky · Gestione', robots: { index: false } }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#1e2d2a' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="it"><body className="min-h-dvh font-sans antialiased">{children}</body></html>)
}
