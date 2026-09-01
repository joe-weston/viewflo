import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

const siteUrl = 'https://www.pasadenashadesandshutters.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Pasadena Shades & Shutters | Montrose, CA',
    template: '%s',
  },
  description:
    'Pasadena Shades & Shutters is your trusted Pasadena Shutter Company. Give us a call for shutters, blinds, and shade installations in Pasadena.',
  openGraph: {
    type: 'website',
    siteName: 'Pasadena Shades & Shutters',
    images: ['/images/logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" itemScope itemType="http://schema.org/ProfessionalService">
      <head>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-XHKPP6CVFR" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XHKPP6CVFR');`}
        </Script>
      </body>
    </html>
  );
}