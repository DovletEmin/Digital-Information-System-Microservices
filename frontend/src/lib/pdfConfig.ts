import { pdfjs } from 'react-pdf';

// Configure PDF.js worker from CDN to avoid local worker 404s in Next.js
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}
