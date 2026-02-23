"use client";

import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { bookService } from '@/services/bookService';
import { Book } from '@/types';

const PDF_WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

export default function BookReadPage() {
  const params = useParams();
  const router = useRouter();
  const paramId = Array.isArray(params.id) ? params.id[0] : params.id;
  const parsedId = Number(paramId);
  const bookId = Number.isFinite(parsedId) ? parsedId : null;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'pdf' | 'epub' | null>('pdf');

  // settings UI removed per design — PDF always opens at fixed scale

  // auth / progress
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);

  // epub
  const [epubError, setEpubError] = useState<string | null>(null);
  const epubViewerRef = useRef<HTMLDivElement | null>(null);
  const [epubRendition, setEpubRendition] = useState<any>(null);

  // pdf state
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [effectivePdfUrl, setEffectivePdfUrl] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [totalPdfPages, setTotalPdfPages] = useState<number>(0);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(3.0);
  const [pdfLoadingProgress, setPdfLoadingProgress] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showProgressSlider, setShowProgressSlider] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPage, setDragPage] = useState<number | null>(null);

  const pdfReadingPercent = totalPdfPages && totalPdfPages > 0 ? Math.round((currentPdfPage / totalPdfPages) * 100) : pdfLoadingProgress;

  // Thumb sizing (22px visual + 4px border each side = 30px outer). Use half-thumb padding so thumb centers at track ends.
  const THUMB_OUTER_PX = 30;
  const THUMB_HALF_PX = THUMB_OUTER_PX / 2;

  // Map pages to 0..100 range so page 1 -> 0% and last page -> 100%.
  const fillPercent = useMemo(() => {
    if (!totalPdfPages || totalPdfPages <= 1) return pdfReadingPercent;
    const pageForCalc = dragPage !== null ? dragPage : currentPdfPage;
    const pct = ((pageForCalc - 1) / (totalPdfPages - 1)) * 100;
    return Math.max(0, Math.min(100, Number(pct.toFixed(2))));
  }, [currentPdfPage, totalPdfPages, pdfReadingPercent, dragPage]);

  // computed urls
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  const proxyPdfUrl = book && bookId !== null && apiBaseUrl ? `${apiBaseUrl}/api/v1/books/${bookId}/read` : '';
  const absolutePdfUrl = book?.pdf_file_url && /^https?:\/\//i.test(book.pdf_file_url) ? book.pdf_file_url : '';

  // keep auth token in sync with localStorage
  useEffect(() => {
    const syncToken = () => setAuthToken(typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
    syncToken();
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'access_token' || ev.key === 'refresh_token') syncToken();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-change', syncToken as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-change', syncToken as EventListener);
    };
  }, []);

  // fetch book
  useEffect(() => {
    if (bookId === null) return;
    const f = async () => {
      setLoading(true);
      try {
        const data = await bookService.getById(bookId);
        setBook(data);
        if (data?.pdf_file_url) {
          setViewMode('pdf');
        } else if (data?.epub_file_url) {
          setViewMode('epub');
        } else {
          setViewMode(null);
        }
      } catch (e) {
        console.error('Failed to fetch book', e);
      } finally {
        setLoading(false);
      }
    };
    f();
  }, [bookId]);

  // load saved progress
  useEffect(() => {
    if (!authToken || bookId === null) return;
    const f = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${bookId}/progress`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        if (res.ok) {
          const d = await res.json();
          setProgress(d);
          if (d.current_page) {
            setCurrentPdfPage(d.current_page);
          }
        }
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    };
    f();
  }, [authToken, bookId]);

  const saveProgress = useCallback(async (page: number, total?: number) => {
    if (!authToken || bookId === null) return;
    try {
      const finalTotal = total ?? totalPdfPages;
      const progressPercentage = finalTotal && finalTotal > 0 ? (page / finalTotal) * 100 : 0;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${bookId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ book_id: bookId, current_page: page, total_pages: finalTotal, progress_percentage: progressPercentage }),
      });
    } catch (e) {
      console.error('Failed to save progress', e);
    }
  }, [authToken, bookId, totalPdfPages]);

  // proxy check -> effectivePdfUrl
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      setEffectivePdfUrl(null);
      if (!book) return;
      if (!proxyPdfUrl) return setEffectivePdfUrl(absolutePdfUrl || null);
      try {
        const t = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(proxyPdfUrl, { method: 'GET', headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined, signal: controller.signal });
        clearTimeout(t);
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.toLowerCase().includes('pdf')) {
          if (!cancelled) setEffectivePdfUrl(proxyPdfUrl);
          return;
        }
        if (!cancelled) setEffectivePdfUrl(absolutePdfUrl || null);
      } catch (e) {
        if (!cancelled) setEffectivePdfUrl(absolutePdfUrl || null);
      }
    };
    run();
    return () => { cancelled = true; controller.abort(); };
  }, [book, proxyPdfUrl, absolutePdfUrl, authToken]);

  // load pdf (pdfjs)
  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;
    const load = async () => {
      if (typeof window === 'undefined') return;
      const url = pdfBlobUrl ?? effectivePdfUrl ?? absolutePdfUrl;
      if (!url) return;
      try {
        setPdfLoadingProgress(0);
        setPdfDoc(null);
        setTotalPdfPages(0);
        const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf');
        const pdfjs = (pdfjsModule && (pdfjsModule.default || pdfjsModule)) as any;
        if (pdfjs && pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        loadingTask = pdfjs.getDocument({ url, withCredentials: false });
        loadingTask.onProgress = (d: any) => { try { const p = d.total ? Math.round((d.loaded / d.total) * 100) : 0; setPdfLoadingProgress(p); } catch (e) {} };
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPdfPages(doc.numPages || 0);
        setPdfLoadingProgress(100);
      } catch (e) {
        console.error('PDF load failed', e);
      }
    };
    load();
    return () => { cancelled = true; try { loadingTask?.destroy && loadingTask.destroy(); } catch (e) {} };
  }, [effectivePdfUrl, absolutePdfUrl, pdfBlobUrl, authToken]);

  // render page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    const render = async () => {
      try {
        const page = await pdfDoc.getPage(currentPdfPage);
        const viewport = page.getViewport({ scale: pdfScale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {
        console.error('Render error', e);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPdfPage, pdfScale]);

  // page bounds
  useEffect(() => {
    if (totalPdfPages && currentPdfPage > totalPdfPages) setCurrentPdfPage(totalPdfPages);
    if (currentPdfPage < 1) setCurrentPdfPage(1);
  }, [currentPdfPage, totalPdfPages]);

  // autosave debounce
  useEffect(() => {
    if (!(viewMode === 'pdf' && authToken && bookId !== null && totalPdfPages > 0)) return;
    const t = setTimeout(() => saveProgress(currentPdfPage, totalPdfPages), 800);
    return () => clearTimeout(t);
  }, [currentPdfPage, totalPdfPages, viewMode, authToken, saveProgress, bookId]);

  // EPUB loader (minimal)
  const loadEpubBook = useCallback(async () => {
    if (typeof window === 'undefined' || !book?.epub_file_url) return;
    try {
      setEpubError(null);
      const ePub = (await import('epubjs')).default;
      const bookInstance = ePub(book.epub_file_url);
      if (epubViewerRef.current) {
        epubViewerRef.current.innerHTML = '';
        const rendition = bookInstance.renderTo(epubViewerRef.current, { width: '100%', height: '100%', spread: 'none' });
        await rendition.display();
        setEpubRendition(rendition);
      }
    } catch (e) {
      console.error('Failed to load EPUB', e);
      setEpubError('Failed to load EPUB');
    }
  }, [book]);

  // loading/progress guards
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-600 border-t-white"></div>
      </div>
    );
  }

  if (bookId === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Invalid book id</h1>
          <button onClick={() => router.push('/books')} className="text-blue-400 hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  if (!book || (!book.content && !book.pdf_file_url && !book.epub_file_url)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">No readable content</h1>
          <button onClick={() => router.push(`/books/${bookId}`)} className="text-blue-400 hover:underline">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container-custom py-3 flex items-center justify-between">
          <button onClick={() => router.push(`/books/${bookId}`)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex-1 text-center px-4">
            <h1 className="text-sm sm:text-base font-medium text-gray-900 truncate">{book.title}</h1>
          </div>
        </div>
      </div>

      {/* settings UI removed */}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {viewMode === 'pdf' ? (
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden mx-auto max-w-4xl">
            <div className="p-6">
              <div className="p-2">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPdfPage((p) => Math.max(1, p - 1))} className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50" aria-label="Previous page"><ChevronLeft size={18} /></button>
                    <button onClick={() => setCurrentPdfPage((p) => Math.min(totalPdfPages, p + 1))} className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50" aria-label="Next page"><ChevronRight size={18} /></button>
                    <div className="text-sm text-gray-700 ml-3">Page {currentPdfPage} / {totalPdfPages || '—'}</div>
                  </div>

                  {/* zoom controls removed — PDF opens at fixed 300% */}
                </div>

                <div
                  className="relative w-full rounded mb-4 overflow-visible"
                  onMouseEnter={() => setShowProgressSlider(true)}
                  onMouseLeave={() => { setShowProgressSlider(false); setIsDragging(false); }}
                >
                  <div className="h-1.5 w-full bg-gray-100 rounded overflow-hidden" style={{ paddingLeft: THUMB_HALF_PX, paddingRight: THUMB_HALF_PX }}>
                    <div className={`h-full bg-blue-500 ${isDragging ? '' : 'transition-all'}`} style={{ width: `${fillPercent}%` }} />
                  </div>

                  {totalPdfPages > 0 && (
                    <input
                      aria-label="Jump to page"
                      type="range"
                      min={1}
                      max={totalPdfPages}
                      value={currentPdfPage}
                      onChange={(e) => { setCurrentPdfPage(Number(e.target.value)); }}
                      onInput={(e) => { const v = Number((e.target as HTMLInputElement).value); setDragPage(v); setCurrentPdfPage(v); }}
                      onMouseDown={() => { setIsDragging(true); setDragPage(currentPdfPage); }}
                      onTouchStart={() => { setIsDragging(true); setDragPage(currentPdfPage); }}
                      onMouseUp={() => { setIsDragging(false); setDragPage(null); }}
                      onTouchEnd={() => { setIsDragging(false); setDragPage(null); }}
                      onMouseLeave={() => { setIsDragging(false); setDragPage(null); }}
                      className={`progress-range absolute top-0 h-6 z-20 transition-opacity ${showProgressSlider ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                      style={{ marginTop: 0, left: THUMB_HALF_PX, width: `calc(100% - ${THUMB_OUTER_PX}px)` }}
                    />
                  )}
                </div>

                <div className="bg-white border rounded-lg p-6 flex justify-center">
                  <div className="w-full max-w-3xl border rounded-sm bg-white p-6 relative flex justify-center">
                    <div style={{ userSelect: 'none' }}>
                      <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
                    </div>
                  </div>
                </div>

                {/* Open/Download links removed from card per design */}
              </div>
            </div>

            {/* footer removed per design */}
          </div>
        ) : viewMode === 'epub' ? (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4">
              {epubError ? (
                <div className="text-red-600 text-center py-8">
                  <p className="mb-4">{epubError}</p>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => { setEpubError(null); loadEpubBook(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
                    <a href={book?.pdf_file_url || '#'} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Open original</a>
                    <button onClick={() => router.push(`/books/${bookId}`)} className="px-4 py-2 bg-white text-gray-700 border rounded-lg">Back</button>
                  </div>
                </div>
              ) : (
                <div ref={epubViewerRef} style={{ minHeight: 400 }} />
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-gray-700">No readable view available for this book.</p>
          </div>
        )}
      </div>

      {/* text highlighting and image modal removed in PDF-only reader */}
      <style jsx>{`
        .progress-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          height: 6px;
        }

        /* WebKit track - keep transparent so underlying bar shows */
        .progress-range::-webkit-slider-runnable-track {
          height: 6px;
          background: transparent;
        }

        /* Thumb */
        .progress-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #065f46; /* emerald-800 */
          border: 4px solid #ffffff;
          box-shadow: 0 6px 14px rgba(2,6,23,0.15);
          margin-top: -10px; /* slight downward adjustment so circle is centered visually */
          cursor: pointer;
        }

        /* Firefox */
        .progress-range::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #065f46;
          border: 4px solid #ffffff;
          margin-top: -10px;
          box-shadow: 0 6px 14px rgba(2,6,23,0.15);
          cursor: pointer;
        }

        /* IE */
        .progress-range::-ms-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #065f46;
          border: 4px solid #ffffff;
          margin-top: -10px;
          cursor: pointer;
        }

        /* Hide default focus outline and provide subtle ring */
        .progress-range:focus {
          outline: none;
        }
        .progress-range:focus::-webkit-slider-thumb {
          box-shadow: 0 6px 18px rgba(2,6,23,0.25), 0 0 0 4px rgba(6,95,70,0.12);
        }
        .progress-range:focus::-moz-range-thumb {
          box-shadow: 0 6px 18px rgba(2,6,23,0.25), 0 0 0 4px rgba(6,95,70,0.12);
        }
      `}</style>
    </div>
  );
}
