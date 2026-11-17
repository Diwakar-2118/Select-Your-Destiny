import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Select Your Destiny — Book Smart. Travel Comfortably.', template: '%s | Select Your Destiny' },
  description: 'Premium bus ticket booking across India. Compare operators, choose your seat, pay securely and track your bus live.',
  applicationName: 'Select Your Destiny',
  keywords: ['bus booking', 'bus tickets', 'sleeper bus', 'volvo', 'India travel'],
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-ink">
        <Providers>
          <Navbar />
          <main id="main" className="min-h-[60vh]">
            {children}
          </main>
          <Footer />
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
