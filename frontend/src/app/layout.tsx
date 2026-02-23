import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import Script from 'next/script';

export const metadata: Metadata = {
  title: "SMU - Sanly maglumatlar ulgamy",
  description: "Türkmenistanyň ylmy makalalar, dissertasiýalar we kitaplar kitaphanasy",
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
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
