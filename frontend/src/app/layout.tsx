import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { pdfjs } from 'react-pdf';

// Configure PDF.js worker with explicit https protocol
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

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
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
