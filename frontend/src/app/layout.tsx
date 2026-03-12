import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import Script from 'next/script';

export const metadata: Metadata = {
  title: {
    default: 'SMU — Sanly maglumatlar ulgamy',
    template: '%s | SMU',
  },
  description:
    'Türkmenistanyň döwlet lukmançylyk uniwersitetiniň ylmy makalalar, dissertasiýalar we kitaplar kitaphanasy. Iň köp okalýan ylmy işleri tapyň.',
  keywords: ['SMU', 'ylym', 'makala', 'dissertasiýa', 'kitap', 'Türkmenistan', 'lukmançylyk'],
  authors: [{ name: 'SMU Digital Library' }],
  creator: 'SMU',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'SMU — Sanly maglumatlar ulgamy',
    title: 'SMU — Sanly maglumatlar ulgamy',
    description:
      'Türkmenistanyň ylmy makalalar, dissertasiýalar we kitaplar kitaphanasy.',
    locale: 'tk_TM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SMU — Sanly maglumatlar ulgamy',
    description: 'Türkmenistanyň ylmy makalalar, dissertasiýalar we kitaplar kitaphanasy.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tm">
      <body className="bg-background min-h-screen flex flex-col">
        <Script id="remove-bis-skin" strategy="beforeInteractive">
          {`(function(){try{var a='bis_skin_checked';document.querySelectorAll('['+a+']').forEach(function(e){e.removeAttribute(a)});}catch(e){} })();`}
        </Script>
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
