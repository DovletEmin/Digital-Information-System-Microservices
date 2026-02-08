import { pdfjs } from 'react-pdf';

// Configure PDF.js worker with explicit https protocol
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}
