import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../contexts/SimpleAuthContext'
import { NotificationProvider } from '../contexts/NotificationContext'
import { reportWebVitals } from '../lib/performance'
import { ClientPerformance } from '../components/ClientPerformance'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration'
import { AppShell } from '../components/AppShell'
import { NotificationContainer } from '../components/ui/NotificationContainer'

// Optimize font loading with display: swap for better performance
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Sleek Chat Interface',
  description: 'A modern, lightweight chat interface for AI conversations',
}

function RootLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          {children}
          <NotificationContainer />
          <ClientPerformance />
          <ServiceWorkerRegistration />
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

        {/* Resource hints for performance - Removed API prefetch to prevent 401 errors */}

        {/* Theme color for PWA */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <RootLayoutContent>{children}</RootLayoutContent>
      </body>
    </html>
  )
}