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
  const [viewMode, setViewMode] = useState<'pdf' | 'epub' | 'text' | null>('pdf');

  // settings UI removed per design — PDF always opens at fixed scale

  // auth / progress
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);

  // epub
  const [epubError, setEpubError] = useState<string | null>(null);
  const epubViewerRef = useRef<HTMLDivElement | null>(null);
  // Use refs for epub instances to avoid triggering re-renders in cleanup effects
  const epubRenditionRef = useRef<any>(null);
  const epubBookRef = useRef<any>(null);
  // Stores the saved progress % so loadEpubBook can restore position after locations generate
  const savedEpubProgressRef = useRef<number>(0);
  // Tracks whether the initial display is done — after that, relocated events = user navigation
  const epubInitialDisplayDoneRef = useRef<boolean>(false);
  const epubUserNavigatedRef = useRef<boolean>(false);
  // Keep state versions only for things read in JSX
  const [epubRendition, setEpubRendition] = useState<any>(null);
  const [epubBookInstance, setEpubBookInstance] = useState<any>(null);
  const [totalEpubLocations, setTotalEpubLocations] = useState<number>(0);
  const [currentEpubLocationIndex, setCurrentEpubLocationIndex] = useState<number>(1);
  const [epubPercent, setEpubPercent] = useState<number>(0);
  const [readerLoading, setReaderLoading] = useState<boolean>(false);
  const [readerError, setReaderError] = useState<string | null>(null);

  // text
  const textContainerRef = useRef<HTMLDivElement | null>(null);
  const [totalTextPages, setTotalTextPages] = useState<number>(0);
  const [currentTextPage, setCurrentTextPage] = useState<number>(1);

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

  const [dragGlobalPage, setDragGlobalPage] = useState<number | null>(null);

  const pdfReadingPercent = totalPdfPages && totalPdfPages > 0 ? Math.round((currentPdfPage / totalPdfPages) * 100) : pdfLoadingProgress;

  // Thumb sizing (22px visual + 4px border each side = 30px outer). Use half-thumb padding so thumb centers at track ends.
  const THUMB_OUTER_PX = 30;
  const THUMB_HALF_PX = THUMB_OUTER_PX / 2;

  // Map pages to 0..100 range so page 1 -> 0% and last page -> 100%.
  // generic fill percent for slider (works for pdf, epub, text)
  const fillPercent = useMemo(() => {
    let total = 0;
    let current = 0;
    if (viewMode === 'pdf') {
      total = totalPdfPages || 0;
      current = currentPdfPage || 0;
    } else if (viewMode === 'epub') {
      total = totalEpubLocations || 0;
      current = currentEpubLocationIndex || 0;
    } else if (viewMode === 'text') {
      total = totalTextPages || 0;
      current = currentTextPage || 0;
    }
    if (!total || total <= 1) {
      if (viewMode === 'pdf') return pdfReadingPercent;
      if (viewMode === 'epub') return epubPercent;
      return total === 0 ? 0 : Math.round((current / Math.max(1, total)) * 100);
    }
    const pageForCalc = dragGlobalPage !== null ? dragGlobalPage : current;
    const pct = ((pageForCalc - 1) / (total - 1)) * 100;
    return Math.max(0, Math.min(100, Number(pct.toFixed(2))));
  }, [viewMode, currentPdfPage, totalPdfPages, currentEpubLocationIndex, totalEpubLocations, epubPercent, currentTextPage, totalTextPages, pdfReadingPercent, dragGlobalPage]);

  // adjust fill to account for half-thumb padding so the fill reaches the track edges
  const fillStyle = useMemo(() => ({
    // extend a couple pixels to avoid a visible hairline at the left edge
    width: `calc(${fillPercent}% + ${THUMB_HALF_PX + 2}px)`,
    marginLeft: `-${THUMB_HALF_PX + 2}px`,
    transform: fillPercent > 0 ? `translateX(-${THUMB_HALF_PX}px)` : undefined,
    minWidth: fillPercent > 0 ? `${Math.max(8, THUMB_OUTER_PX)}px` : '0px',
    borderRadius: '9999px',
  }), [fillPercent, THUMB_HALF_PX]);

  // computed urls
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  // Only build proxyPdfUrl when the book actually has a pdf_file_url to avoid
  // a spurious 404 probe request for epub-only books.
  const proxyPdfUrl = book && book.pdf_file_url && bookId !== null && apiBaseUrl ? `${apiBaseUrl}/api/v1/books/${bookId}/read` : '';
  const proxyEpubUrl = book && bookId !== null && apiBaseUrl ? `${apiBaseUrl}/api/v1/books/${bookId}/epub` : '';
  const absolutePdfUrl = book?.pdf_file_url && /^https?:\/\//i.test(book.pdf_file_url) ? book.pdf_file_url : '';
  const absoluteEpubUrl = book?.epub_file_url && /^https?:\/\//i.test(book.epub_file_url) ? book.epub_file_url : '';

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
        } else if (data?.content) {
          setViewMode('text');
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
            setCurrentTextPage(d.current_page);
            setCurrentEpubLocationIndex(d.current_page);
          }
          if (d.progress_percentage && typeof d.progress_percentage === 'number') {
            const pct = Math.round(d.progress_percentage);
            setEpubPercent(pct);
            // Store for use inside loadEpubBook
            savedEpubProgressRef.current = d.progress_percentage;
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

        // If proxy doesn't return a PDF, fall back — prefer absolutePdfUrl, otherwise switch viewMode to epub/text when available
        const fallback = absolutePdfUrl || null;
        if (!cancelled) setEffectivePdfUrl(fallback);
        if (!cancelled) {
          if (!fallback) {
            if (book?.epub_file_url) setViewMode('epub');
            else if (book?.content) setViewMode('text');
            else setViewMode(null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setEffectivePdfUrl(absolutePdfUrl || null);
          if (!absolutePdfUrl) {
            if (book?.epub_file_url) setViewMode('epub');
            else if (book?.content) setViewMode('text');
            else setViewMode(null);
          }
        }
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
        setReaderError(null);
        setReaderLoading(true);
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
        setReaderLoading(false);
      } catch (e) {
        setReaderLoading(false);
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
    // autosave for pdf, text, epub
    if (!authToken || bookId === null) return;
    if (viewMode === 'pdf' && totalPdfPages > 0) {
      const t = setTimeout(() => saveProgress(currentPdfPage, totalPdfPages), 800);
      return () => clearTimeout(t);
    }
    if (viewMode === 'text' && totalTextPages > 0) {
      const t = setTimeout(() => saveProgress(currentTextPage, totalTextPages), 800);
      return () => clearTimeout(t);
    }
    if (viewMode === 'epub' && totalEpubLocations > 0) {
      const t = setTimeout(() => saveProgress(currentEpubLocationIndex, totalEpubLocations), 800);
      return () => clearTimeout(t);
    }
  }, [viewMode, authToken, bookId, currentPdfPage, totalPdfPages, currentTextPage, totalTextPages, currentEpubLocationIndex, totalEpubLocations, saveProgress]);

  // EPUB loader — uses the two-step epub.js API to open a binary ArrayBuffer
  // so epub.js NEVER makes HTTP requests for internal zip entries (META-INF/…)
  const loadEpubBook = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const epubUrl = proxyEpubUrl || absoluteEpubUrl || book?.epub_file_url || '';
    if (!epubUrl) { setEpubError('EPUB URL not available'); return; }

    // Destroy any previous instance
    try { epubRenditionRef.current?.destroy?.(); } catch { }
    try { epubBookRef.current?.destroy?.(); } catch { }
    epubRenditionRef.current = null;
    epubBookRef.current = null;

    setEpubError(null);
    setReaderError(null);
    setReaderLoading(true);

    try {
      // 0. Fetch progress directly here so we always have it, regardless of effect timing.
      //    Use localStorage token directly — it's synchronously available, no React state needed.
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token && bookId !== null) {
        try {
          const pRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${bookId}/progress`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (pRes.ok) {
            const pd = await pRes.json();
            if (pd.progress_percentage && typeof pd.progress_percentage === 'number') {
              savedEpubProgressRef.current = pd.progress_percentage;
              setEpubPercent(Math.round(pd.progress_percentage));
            }
          }
        } catch { /* progress fetch failure is non-fatal */ }
      }

      // 1. Fetch the EPUB file as a binary ArrayBuffer
      const resp = await fetch(epubUrl, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching EPUB`);
      const arrayBuffer = await resp.arrayBuffer();

      // 2. Create an empty Book and open the buffer as 'binary'
      //    This keeps all zip parsing in-memory — no HTTP requests for paths
      //    like META-INF/container.xml which caused 404s against the dev server.
      const ePub = (await import('epubjs')).default;
      const bookInstance = ePub();
      await bookInstance.open(arrayBuffer, 'binary');
      epubBookRef.current = bookInstance;
      setEpubBookInstance(bookInstance);

      // 3. Render into the container
      if (!epubViewerRef.current) throw new Error('EPUB container not mounted');
      epubViewerRef.current.innerHTML = '';
      // scrolled-doc flow: epub.js expands the iframe vertically to fit the full
      // chapter — no fixed height needed. Width must be real pixels.
      const containerWidth = epubViewerRef.current.clientWidth || 860;
      const rendition = bookInstance.renderTo(epubViewerRef.current, {
        width: containerWidth,
        height: 900,
        spread: 'none',
        flow: 'scrolled-doc',
        manager: 'continuous',
        allowScriptedContent: true,
      });

      // Inject comfortable reading styles into every chapter iframe
      rendition.themes.default({
        body: {
          'font-family': 'Georgia, "Times New Roman", serif',
          'font-size': '18px',
          'line-height': '1.8',
          'max-width': '720px',
          'margin': '0 auto',
          'padding': '32px 24px',
          'color': '#1a1a1a',
          'word-break': 'break-word',
        },
        img: { 'max-width': '100%', height: 'auto', display: 'block', margin: '16px auto' },
        p: { 'margin-bottom': '1em' },
        h1: { 'font-size': '2em', 'margin-bottom': '0.5em' },
        h2: { 'font-size': '1.5em', 'margin-bottom': '0.5em' },
        h3: { 'font-size': '1.25em', 'margin-bottom': '0.5em' },
      });
      epubRenditionRef.current = rendition;
      setEpubRendition(rendition);

      // Reset navigation flags for this load
      epubInitialDisplayDoneRef.current = false;
      epubUserNavigatedRef.current = false;

      // 4. Track position changes
      rendition.on('relocated', (location: any) => {
        if (epubInitialDisplayDoneRef.current) {
          epubUserNavigatedRef.current = true;
        }
        // If locations aren't generated yet, skip — don't overwrite the server-loaded percent with 0
        const total = typeof bookInstance.locations?.length === 'function' ? bookInstance.locations.length() : 0;
        if (total === 0) return;
        try {
          const cfi = location?.start?.cfi;
          let pct = 0;
          if (bookInstance.locations?.percentageFromCfi && cfi) {
            pct = bookInstance.locations.percentageFromCfi(cfi) || 0;
          }
          const percent = Math.max(0, Math.min(100, Math.round(pct * 100)));
          setEpubPercent(percent);
          setCurrentEpubLocationIndex(Math.max(1, Math.round(pct * total)));
        } catch { }
      });

      // 5. Start location generation in parallel — don't await it so display is immediate.
      //    Use chunk=1600 (chars per location) — good balance of speed vs granularity.
      const locationsPromise = bookInstance.locations.generate(1600);

      // 6. Display: restore saved position if we have one, otherwise show first page
      const savedPct = savedEpubProgressRef.current;
      if (savedPct > 0) {
        // Try spine-based jump: open the chapter closest to the saved percentage
        try {
          const spineItems = (bookInstance.spine as any)?.items || [];
          if (spineItems.length > 0) {
            const targetIdx = Math.min(
              spineItems.length - 1,
              Math.floor((savedPct / 100) * spineItems.length)
            );
            await rendition.display(spineItems[targetIdx]?.href || undefined);
          } else {
            await rendition.display();
          }
        } catch {
          await rendition.display();
        }
      } else {
        await rendition.display();
      }
      // Mark initial restore as done — from now on, any navigation is the user's choice
      epubInitialDisplayDoneRef.current = true;
      setReaderLoading(false);

      // 7. After locations are ready: precise CFI restore if user hasn't navigated away, else recalc current %.
      locationsPromise.then(() => {
        const total = typeof bookInstance.locations?.length === 'function' ? bookInstance.locations.length() : 0;
        setTotalEpubLocations(total);
        if (total === 0) return;

        const savedPct = savedEpubProgressRef.current;
        if (!epubUserNavigatedRef.current && savedPct > 0) {
          // User hasn't moved — jump to the precise CFI position now that we have locations
          try {
            const targetCfi = bookInstance.locations.cfiFromPercentage(savedPct / 100);
            if (targetCfi) {
              rendition.display(targetCfi).catch(() => {});
              return; // 'relocated' will fire and update percent accurately
            }
          } catch { }
        }

        // Either user navigated or no saved position — just recalc % for current location
        try {
          const loc = epubRenditionRef.current?.currentLocation?.();
          const cfi = loc?.start?.cfi;
          if (cfi && bookInstance.locations?.percentageFromCfi) {
            const pct = bookInstance.locations.percentageFromCfi(cfi) || 0;
            setEpubPercent(Math.round(pct * 100));
            setCurrentEpubLocationIndex(Math.max(1, Math.round(pct * total)));
          }
        } catch { }
      }).catch(() => { });

    } catch (err: any) {
      console.error('EPUB load failed:', err);
      const msg = err?.message || String(err);
      setEpubError(msg);
      setReaderError(`EPUB load error: ${msg}`);
      setReaderLoading(false);
    }
  }, [book?.epub_file_url, proxyEpubUrl, absoluteEpubUrl, authToken, bookId]);

  // Auto-load EPUB when switching to epub mode
  useEffect(() => {
    if (viewMode === 'epub') loadEpubBook();
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup epub instances on unmount
  useEffect(() => {
    return () => {
      try { epubRenditionRef.current?.destroy?.(); } catch { }
      try { epubBookRef.current?.destroy?.(); } catch { }
    };
  }, []);

  // Open preferred format (PDF -> EPUB -> Text)
  const openPreferred = useCallback(() => {
    setReaderError(null);
    setReaderLoading(true);
    // prefer PDF if available
    const hasPdf = Boolean(effectivePdfUrl || absolutePdfUrl || pdfBlobUrl);
    const hasEpub = Boolean(proxyEpubUrl || absoluteEpubUrl || book?.epub_file_url);
    const hasText = Boolean(book?.content);
    if (hasPdf) {
      setViewMode('pdf');
      setReaderLoading(false);
      return;
    }
    if (hasEpub) {
      setViewMode('epub');
      // loadEpubBook effect will unset readerLoading
      return;
    }
    if (hasText) {
      setViewMode('text');
      setReaderLoading(false);
      return;
    }
    setReaderError('No readable content available');
    setReaderLoading(false);
  }, [effectivePdfUrl, absolutePdfUrl, pdfBlobUrl, proxyEpubUrl, absoluteEpubUrl, book]);

  // compute text pages when text view is active
  useEffect(() => {
    if (viewMode !== 'text') return;
    const el = textContainerRef.current;
    if (!el) return;
    const compute = () => {
      const pages = Math.max(1, Math.ceil(el.scrollHeight / Math.max(1, el.clientHeight)));
      setTotalTextPages(pages);
      if (progress?.current_page) {
        const p = Math.min(pages, Math.max(1, progress.current_page));
        el.scrollTop = (p - 1) * el.clientHeight;
        setCurrentTextPage(p);
      } else {
        setCurrentTextPage(1);
      }
    };
    // compute after a short delay in case images/fonts affect layout
    const t = setTimeout(compute, 120);
    window.addEventListener('resize', compute);
    return () => { clearTimeout(t); window.removeEventListener('resize', compute); };
  }, [viewMode, book?.content, progress]);

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
        {readerError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4">
            {readerError}
          </div>
        )}

        {readerLoading && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4 text-sm text-gray-700">Loading reader…</div>
        )}

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
                    <div className={`h-full bg-blue-500 ${isDragging ? '' : 'transition-all'}`} style={fillStyle} />
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
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 mx-auto max-w-4xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => { try { epubRenditionRef.current?.prev(); } catch { } }} className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50" aria-label="Previous chapter"><ChevronLeft size={18} /></button>
                  <button onClick={() => { try { epubRenditionRef.current?.next(); } catch { } }} className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50" aria-label="Next chapter"><ChevronRight size={18} /></button>
                  <div className="text-sm text-gray-700 ml-3">{totalEpubLocations > 0 ? `${epubPercent}%` : `${epubPercent}%`}</div>
                </div>
              </div>

              <div className="relative w-full rounded mb-4 overflow-visible">
                <div className="h-1.5 w-full bg-gray-100 rounded overflow-hidden" style={{ paddingLeft: THUMB_HALF_PX, paddingRight: THUMB_HALF_PX }}>
                  <div className={`h-full bg-blue-500 ${isDragging ? '' : 'transition-all'}`} style={fillStyle} />
                </div>

                {(totalEpubLocations > 0) ? (
                  <input
                    aria-label="Jump to location"
                    type="range"
                    min={1}
                    max={totalEpubLocations}
                    value={currentEpubLocationIndex}
                    onChange={async (e) => {
                      const v = Number((e.target as HTMLInputElement).value);
                      setCurrentEpubLocationIndex(v);
                      try {
                        const pct = totalEpubLocations > 0 ? (v / totalEpubLocations) : 0;
                        const cfi = epubBookRef.current?.locations && typeof epubBookRef.current.locations.cfiFromPercentage === 'function'
                          ? epubBookRef.current.locations.cfiFromPercentage(pct)
                          : null;
                        if (cfi && epubRenditionRef.current) await epubRenditionRef.current.display(cfi);
                      } catch { }
                    }}
                    onInput={(e) => { const v = Number((e.target as HTMLInputElement).value); setDragGlobalPage(v); setCurrentEpubLocationIndex(v); }}
                    onMouseDown={() => { setIsDragging(true); setDragGlobalPage(currentEpubLocationIndex); }}
                    onTouchStart={() => { setIsDragging(true); setDragGlobalPage(currentEpubLocationIndex); }}
                    onMouseUp={() => { setIsDragging(false); setDragGlobalPage(null); }}
                    onTouchEnd={() => { setIsDragging(false); setDragGlobalPage(null); }}
                    onMouseLeave={() => { setIsDragging(false); setDragGlobalPage(null); }}
                    className={`progress-range absolute top-0 h-6 z-20 transition-opacity ${showProgressSlider ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    style={{ marginTop: 0, left: THUMB_HALF_PX, width: `calc(100% - ${THUMB_OUTER_PX}px)` }}
                  />
                ) : (
                  <input
                    aria-label="Jump to percent"
                    type="range"
                    min={0}
                    max={100}
                    value={epubPercent}
                    onChange={async (e) => {
                      const v = Number((e.target as HTMLInputElement).value);
                      setEpubPercent(v);
                      try {
                        const pct = v / 100;
                        const cfi = epubBookRef.current?.locations && typeof epubBookRef.current.locations.cfiFromPercentage === 'function'
                          ? epubBookRef.current.locations.cfiFromPercentage(pct)
                          : null;
                        if (cfi && epubRenditionRef.current) await epubRenditionRef.current.display(cfi);
                      } catch { }
                    }}
                    onInput={(e) => { const v = Number((e.target as HTMLInputElement).value); setDragGlobalPage(v); setEpubPercent(v); }}
                    onMouseDown={() => { setIsDragging(true); setDragGlobalPage(epubPercent); }}
                    onTouchStart={() => { setIsDragging(true); setDragGlobalPage(epubPercent); }}
                    onMouseUp={() => { setIsDragging(false); setDragGlobalPage(null); }}
                    onTouchEnd={() => { setIsDragging(false); setDragGlobalPage(null); }}
                    onMouseLeave={() => { setIsDragging(false); setDragGlobalPage(null); }}
                    className={`progress-range absolute top-0 h-6 z-20 transition-opacity ${showProgressSlider ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    style={{ marginTop: 0, left: THUMB_HALF_PX, width: `calc(100% - ${THUMB_OUTER_PX}px)` }}
                  />
                )}
              </div>

              {epubError ? (
                <div className="text-red-600 text-center py-8">
                  <p className="mb-4">{epubError}</p>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => { setEpubError(null); loadEpubBook(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
                  </div>
                </div>
              ) : (
                <div
                  ref={epubViewerRef}
                  style={{
                    width: '100%',
                    minHeight: '80vh',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    position: 'relative',
                    background: '#fff',
                  }}
                />
              )}
            </div>
          </div>
        ) : viewMode === 'text' ? (
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden mx-auto max-w-4xl">
            <div className="p-6">
              <div className="p-2">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      const el = textContainerRef.current;
                      if (!el) return;
                      const h = el.clientHeight || 600;
                      el.scrollBy({ top: -h, behavior: 'smooth' });
                    }} className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50" aria-label="Previous page"><ChevronLeft size={18} /></button>
                    <button onClick={() => {
                      const el = textContainerRef.current;
                      if (!el) return;
                      const h = el.clientHeight || 600;
                      el.scrollBy({ top: h, behavior: 'smooth' });
                    }} className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50" aria-label="Next page"><ChevronRight size={18} /></button>
                    <div className="text-sm text-gray-700 ml-3">Page {currentTextPage} / {totalTextPages || '—'}</div>
                  </div>
                </div>

                <div className="relative w-full rounded mb-4 overflow-visible" onMouseEnter={() => setShowProgressSlider(true)} onMouseLeave={() => { setShowProgressSlider(false); setIsDragging(false); }}>
                  <div className="h-1.5 w-full bg-gray-100 rounded overflow-hidden" style={{ paddingLeft: THUMB_HALF_PX, paddingRight: THUMB_HALF_PX }}>
                    <div className={`h-full bg-blue-500 ${isDragging ? '' : 'transition-all'}`} style={fillStyle} />
                  </div>

                  {totalTextPages > 0 && (
                    <input
                      aria-label="Jump to page"
                      type="range"
                      min={1}
                      max={totalTextPages}
                      value={currentTextPage}
                      onChange={(e) => { const v = Number(e.target.value); setCurrentTextPage(v); const el = textContainerRef.current; if (el) el.scrollTop = (v - 1) * el.clientHeight; }}
                      onInput={(e) => { const v = Number((e.target as HTMLInputElement).value); setDragGlobalPage(v); setCurrentTextPage(v); }}
                      onMouseDown={() => { setIsDragging(true); setDragGlobalPage(currentTextPage); }}
                      onTouchStart={() => { setIsDragging(true); setDragGlobalPage(currentTextPage); }}
                      onMouseUp={() => { setIsDragging(false); setDragGlobalPage(null); }}
                      onTouchEnd={() => { setIsDragging(false); setDragGlobalPage(null); }}
                      onMouseLeave={() => { setIsDragging(false); setDragGlobalPage(null); }}
                      className={`progress-range absolute top-0 h-6 z-20 transition-opacity ${showProgressSlider ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                      style={{ marginTop: 0, left: THUMB_HALF_PX, width: `calc(100% - ${THUMB_OUTER_PX}px)` }}
                    />
                  )}
                </div>

                <div className="bg-white border rounded-lg p-6 max-h-[70vh] overflow-auto" ref={textContainerRef} onScroll={() => {
                  const el = textContainerRef.current;
                  if (!el) return;
                  const page = Math.floor(el.scrollTop / Math.max(1, el.clientHeight)) + 1;
                  setCurrentTextPage(page);
                }}>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: book?.content || '' }} />
                </div>
              </div>
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
