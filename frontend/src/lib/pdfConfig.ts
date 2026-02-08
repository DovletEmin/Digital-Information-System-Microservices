import { pdfjs } from 'react-pdf';

// Serve worker from same origin to avoid path/CORS/mixed-content issues.
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/api/pdf-worker';
}
