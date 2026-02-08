import { pdfjs } from 'react-pdf';

if (typeof window !== 'undefined') {
  const origin = window.location.origin;
  pdfjs.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.js`;
}
