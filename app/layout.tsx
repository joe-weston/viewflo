import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import "./pasadena-theme.css";
const displayFont = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});
const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VIEWFLOW_APP_URL || "http://localhost:3188",
  ),
  title: {
    default: "ViewFlow | Business workspace",
    template: "%s | ViewFlow",
  },
  description: "Your business website and account, brought together.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "ViewFlow",
    images: ["/818aaed5-2de2-408a-9918-b48936405ebb.jpg"],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
