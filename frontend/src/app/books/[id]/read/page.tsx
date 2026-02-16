"use client";

import React from 'react';
import dynamic from 'next/dynamic';

class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError?: (error: any) => void;
}> {
  state = { hasError: false, error: null as any };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught error:', error, info);
    this.setState({ error });
    if (this.props.onError) {
      try {
        this.props.onError(error);
      } catch (e) {
        console.error('ErrorBoundary onError handler threw:', e);
      }
    }
  }

  render() {
    if ((this.state as any).hasError) {
      return null;
    }
    return this.props.children as React.ReactElement;
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import { bookService } from '@/services/bookService';
import { savedService, BookHighlight } from '@/services/savedService';
import { Book } from '@/types';

// Using browser-native PDF rendering via iframe/blob fallback.
const PDF_WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

export default function BookReadPage() {
  const params = useParams();
  const router = useRouter();
  const paramId = Array.isArray(params.id) ? params.id[0] : params.id;
  const parsedId = Number(paramId);
  const bookId = Number.isFinite(parsedId) ? parsedId : null;

  // Debug logging
  useEffect(() => {
    console.log('Book Read Page - params:', params);
    console.log('Book Read Page - bookId:', bookId);
  }, [params, bookId]);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'text' | 'pdf' | 'epub'>('text');

  // Text reading state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fontSize, setFontSize] = useState(18);
  const [showSettings, setShowSettings] = useState(false);
  const [highlights, setHighlights] = useState<BookHighlight[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<number[]>([]);

  // PDF reading state (simplified)
  const [pdfReloadKey, setPdfReloadKey] = useState(0);

  // EPUB reading state
  const [epubBook, setEpubBook] = useState<any>(null);
  const [epubRendition, setEpubRendition] = useState<any>(null);
  const [epubError, setEpubError] = useState<string | null>(null);
  const epubViewerRef = useRef<HTMLDivElement>(null);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);

  const CHARS_PER_PAGE = 2000;

  // removed complex PDF viewer plugin code in favor of a simpler iframe/blob approach

  useEffect(() => {
    const syncToken = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      setAuthToken(token);
    };

    syncToken();

    const handleAuthChange = () => syncToken();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'access_token' || event.key === 'refresh_token') {
        syncToken();
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (bookId === null) return;
    fetchBook();
  }, [bookId]);

  useEffect(() => {
    if (authToken && bookId !== null) {
      loadProgress();
      loadHighlights();
    }
  }, [authToken, bookId]);

  useEffect(() => {
    if (viewMode === 'epub' && book?.epub_file_url && epubViewerRef.current) {
      loadEpubBook();
    }

    return () => {
      if (epubRendition) {
        epubRendition.destroy();
      }
    };
  }, [viewMode, book]);

  const fetchBook = async () => {
  if (bookId === null) return;

  try {
    setLoading(true);

    const data = await bookService.getById(bookId);
    console.log('Fetched book data:', data);

    setBook(data);

    // --- PDF MODE ---
    if (data?.pdf_file_url) {
      console.log('Setting viewMode to pdf, url:', data.pdf_file_url);
      setViewMode('pdf');
      setTotalPages(1); // безопасный дефолт
      return;
    }

    // --- EPUB MODE ---
    if (data?.epub_file_url) {
      console.log('Setting viewMode to epub, url:', data.epub_file_url);
      setViewMode('epub');
      setTotalPages(1);
      return;
    }

    // --- TEXT MODE ---
    const content =
      typeof data?.content === "string"
        ? data.content.trim()
        : "";

    if (content.length > 0) {
      console.log('Setting viewMode to text, content length:', content.length);

      setViewMode('text');

      const pages = Math.max(
        1,
        Math.ceil(content.length / CHARS_PER_PAGE)
      );

      setTotalPages(pages);
      return;
    }

    // --- FALLBACK ---
    console.warn('No valid content found for book');
    setViewMode(null);
    setTotalPages(1);

  } catch (error) {
    console.error('Failed to fetch book:', error);
  } finally {
    setLoading(false);
  }
};


  const loadProgress = async () => {
    if (bookId === null) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${bookId}/progress`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
        if (data.current_page) {
          setCurrentPage(data.current_page);
        }
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const saveProgress = async (page: number) => {
    if (!authToken || bookId === null) return;

    try {
      const progressPercentage = (page / totalPages) * 100;

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${bookId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          book_id: bookId,
          current_page: page,
          total_pages: totalPages,
          progress_percentage: progressPercentage,
        }),
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const loadHighlights = async () => {
    if (bookId === null) return;
    try {
      const data = await savedService.getBookHighlights(bookId);
      setHighlights(data);
    } catch (error) {
      console.error('Failed to load highlights:', error);
    }
  };

  const loadEpubBook = async () => {
    if (typeof window === 'undefined' || !book?.epub_file_url) return;

    try {
      setEpubError(null);
      const ePub = (await import('epubjs')).default;
      const bookInstance = ePub(book.epub_file_url);
      setEpubBook(bookInstance);

      if (epubViewerRef.current) {
        epubViewerRef.current.innerHTML = '';

        const rendition = bookInstance.renderTo(epubViewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
        });

        await rendition.display();
        setEpubRendition(rendition);

        bookInstance.ready
          .then(() => bookInstance.locations.generate(1600))
          .then((locations: any) => {
            setTotalPages(locations.length);
          });
      }
    } catch (error) {
      console.error('Failed to load EPUB:', error);
      setEpubError('EPUB faÃ½ly Ã½Ã¼klenip bilinmedi');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    saveProgress(newPage);

    if (viewMode === 'epub' && epubRendition && epubBook) {
      epubRendition.display(epubBook.locations.cfiFromLocation(newPage - 1));
    }
  };

  const getTextOffset = (root: Node, target: Node, offset: number): number => {
    let textOffset = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode === target) {
        return textOffset + offset;
      }
      textOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }

    return textOffset;
  };

  const handleTextSelection = () => {
    if (!authToken) {
      window.getSelection()?.removeAllRanges();
      return;
    }

    const selection = window.getSelection();
    if (selection?.toString()?.length > 0) {
      const text = selection.toString();
      const range = selection.getRangeAt(0);
      const contentElement = document.getElementById('book-page-content');

      if (contentElement && contentElement.contains(range.commonAncestorContainer)) {
        const pageOffset = (currentPage - 1) * CHARS_PER_PAGE;
        const startOffset = pageOffset + getTextOffset(contentElement, range.startContainer, range.startOffset);
        const endOffset = startOffset + text.length;

        const overlappingHighlights = highlights.filter(
          (highlight) => highlight.start_offset < endOffset && highlight.end_offset > startOffset
        );

        setCurrentHighlight({ start: startOffset, end: endOffset, text });
        setSelectedHighlightIds(overlappingHighlights.map((highlight) => highlight.id));
        setShowColorPicker(true);
      }
    }
  };

  const handleHighlight = async (color: string) => {
    if (!currentHighlight) return;
    if (bookId === null) return;

    try {
      if (selectedHighlightIds.length > 0) {
        await Promise.all(selectedHighlightIds.map((id) => savedService.updateBookHighlight(id, { color })));
      } else {
        await savedService.createBookHighlight({
          book_id: bookId,
          text: currentHighlight.text,
          start_offset: currentHighlight.start,
          end_offset: currentHighlight.end,
          color,
        });
      }

      await loadHighlights();
      setShowColorPicker(false);
      setCurrentHighlight(null);
      setSelectedHighlightIds([]);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
  };

  const handleClearHighlight = async () => {
    if (selectedHighlightIds.length === 0) {
      setShowColorPicker(false);
      setCurrentHighlight(null);
      setSelectedHighlightIds([]);
      window.getSelection()?.removeAllRanges();
      return;
    }
    try {
      await Promise.all(selectedHighlightIds.map((id) => savedService.deleteBookHighlight(id)));
      await loadHighlights();
      setShowColorPicker(false);
      setCurrentHighlight(null);
      setSelectedHighlightIds([]);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  const applyHighlights = (content: string, pageStart: number, pageEnd: number) => {
    if (typeof content !== 'string' || content.length === 0) return '';

    const pageHighlights = highlights.filter((h) => h.start_offset < pageEnd && h.end_offset > pageStart);

    if (pageHighlights.length === 0) return content;

    const sortedHighlights = [...pageHighlights].sort((a, b) => a.start_offset - b.start_offset);
    let result = '';
    let lastIndex = 0;

    sortedHighlights.forEach((highlight) => {
      const localStart = Math.max(0, highlight.start_offset - pageStart);
      const localEnd = Math.min(content.length, highlight.end_offset - pageStart);

      if (localStart < lastIndex || localStart >= content.length) return;

      result += content.slice(lastIndex, localStart);

      const colorClass =
        {
          yellow: 'bg-yellow-200',
          green: 'bg-green-200',
          blue: 'bg-blue-200',
          red: 'bg-red-200',
        }[highlight.color] || 'bg-yellow-200';

      result += `<mark class="${colorClass} px-0.5 rounded">${content.slice(localStart, localEnd)}</mark>`;
      lastIndex = localEnd;
    });

    result += content.slice(lastIndex);
    return result;
  };

  const getPageContent = () => {
  // Гарантируем, что content — строка
  const content = typeof book?.content === "string" ? book.content : "";

  // Если пусто — возвращаем пустую строку
  if (content.length === 0) return "";

  // Защищаем currentPage
  const safePage = Math.max(1, currentPage || 1);

  const start = (safePage - 1) * CHARS_PER_PAGE;
  const end = start + CHARS_PER_PAGE;

  const pageContent = content.slice(start, end);

  // Если applyHighlights не определена — просто возвращаем текст
  return applyHighlights ? applyHighlights(pageContent, start, end) : pageContent;
};



  const handlePdfLoad = (event: any) => {
    // legacy placeholder (no-op for iframe mode)
    return;
  };
  // PDF navigation/progress via embedded viewer is not available in iframe mode

  // Calculate PDF URL
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  // Prefer direct media URL when available (helps avoid proxy/auth issues)
  const pdfFileUrl = (() => {
    if (!book?.pdf_file_url) return '';
    // Prefer serving through our API gateway/proxy to avoid CORS and auth issues
    if (bookId !== null && apiBaseUrl) return `${apiBaseUrl}/api/v1/books/${bookId}/read`;
    // Fallback to absolute URL only if proxy is not available
    if (/^https?:\/\//i.test(book.pdf_file_url)) return book.pdf_file_url;
    return '';
  })();
  
  // Debug logging for PDF URL
  useEffect(() => {
    if (book && viewMode === 'pdf') {
      const calculatedUrl = apiBaseUrl && bookId ? `${apiBaseUrl}/api/v1/books/${bookId}/read` : '';
      console.log('PDF Config:', {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        apiBaseUrl,
        bookId,
        pdf_file_url: book.pdf_file_url,
        calculatedPdfUrl: calculatedUrl,
        authToken: authToken ? 'present' : 'missing'
      });
      
      if (!apiBaseUrl) {
        console.error('CRITICAL: NEXT_PUBLIC_API_URL is not set!');
      }
      if (!calculatedUrl) {
        console.error('CRITICAL: pdfFileUrl is empty!');
      }
    }
  }, [book, viewMode, bookId, authToken]);
  const pdfHttpHeaders = authToken
    ? {
        Authorization: `Bearer ${authToken}`,
      }
    : undefined;

  // Dynamic import of the client-only PdfViewer component
  const PdfViewerClient = useMemo(
    () => dynamic(() => import('../PdfViewerClient'), { ssr: false }),
    []
  );

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<any>(null);
  const [hasClientError, setHasClientError] = useState<boolean>(false);
  // Removed HEAD validation to avoid servers that reject HEAD and CORS issues.

  // Global client error handlers: if a runtime error occurs anywhere, switch to a safe iframe fallback
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      console.error('Global error captured:', ev.error || ev.message, ev);
      setHasClientError(true);
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      console.error('Unhandled rejection captured:', ev.reason || ev, ev);
      setHasClientError(true);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection as EventListener);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection as EventListener);
    };
  }, []);

  // Note: blob fallback removed to avoid triggering CORS preflight / HEAD issues.
  // The iframe will load the proxied `/api/v1/books/{id}/read` URL directly.

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
          <button onClick={() => router.push('/books')} className="text-blue-400 hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!book || (!book.content && !book.pdf_file_url && !book.epub_file_url)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Kitap tapylmady Ã½a-da okalyp bilinmeÃ½Ã¤r</h1>
          <button onClick={() => router.push(`/books/${bookId}`)} className="text-blue-400 hover:underline">
            Yza dolan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container-custom py-3 flex items-center justify-between">
          <button
            onClick={() => router.push(`/books/${bookId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Yza</span>
          </button>

          <div className="flex-1 text-center px-4">
            <h1 className="text-sm sm:text-base font-medium text-gray-900 truncate">{book.title}</h1>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mt-20"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Sazlamalar</h3>

            {viewMode === 'text' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harp Ã¶lÃ§egi: {fontSize}px
                </label>
                <input
                  type="range"
                  min="14"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {viewMode === 'pdf' && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">PDF view uses the browser's built-in viewer. Use browser zoom and controls for best results.</p>
              </div>
            )}

            <button
              onClick={() => setShowSettings(false)}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Ãap
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {viewMode === 'pdf' ? (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="pdf-viewer">
              {/* Quick safe fallback: render PDF via iframe to avoid third-party viewer crashes. */}
              {(() => {
                  const viewerFileUrl = pdfBlobUrl ?? pdfFileUrl;
                  if (!viewerFileUrl) {
                    return (
                      <div className="text-red-600 text-center py-12">
                        <p className="mb-2">PDF url is missing</p>
                        <p className="text-xs text-gray-500 mb-4">Book has pdf_file_url: {book?.pdf_file_url || 'no'}</p>
                        <button onClick={() => router.push(`/books/${bookId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          Go back
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div>
                            <div className="p-4">
                              {PdfViewerClient ? (
                                <PdfViewerClient
                                  workerUrl={PDF_WORKER_URL}
                                  viewerFileUrl={viewerFileUrl}
                                  pdfHttpHeaders={pdfHttpHeaders}
                                  pdfReloadKey={pdfReloadKey}
                            
                                  renderError={(props: any) => (
                                    <div className="p-4 text-red-600">Ошибка отображения PDF: {props.error?.message ?? 'unknown'}</div>
                                  )}
                                  onDocumentLoad={(e: any) => {
                                    // optional: could set total pages
                                    // console.log('PDF loaded', e);
                                  }}
                                  onPageChange={(ev: any) => {
                                    // optional: ev.currentPage is zero-based
                                    // savePdfProgress could be implemented if needed
                                  }}
                                />
                              ) : (
                                <div className="text-sm text-gray-600 mb-2">Loading PDF viewer...</div>
                              )}
                            </div>

                            <div className="border-t bg-gray-50 px-8 py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {authToken && progress && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Bookmark size={16} className="text-primary" />
                                      <span className="hidden sm:inline">Ýatda saklandy</span>
                                    </div>
                                  )}
                                  <a href={viewerFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">Open PDF in new tab</a>
                                </div>

                                <div>
                                  <a href={viewerFileUrl} download className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">Download</a>
                                </div>
                              </div>
                            </div>
                    </div>
                  );
                })()}
              </div>
          </div>
        ) : viewMode === 'epub' ? (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex justify-center items-center p-4 bg-gray-50">
              {epubError ? (
                <div className="text-red-600 text-center py-8">
                  <p className="mb-4">{epubError}</p>
                  <button
                    onClick={() => {
                      setEpubError(null);
                      loadEpubBook();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    GaÃ½tadan synanyÅŸ
                  </button>
                </div>
              ) : (
                <div ref={epubViewerRef} className="epub-viewer w-full" style={{ height: '600px', minHeight: '600px' }} />
              )}
            </div>

            {!epubError && epubRendition && (
              <div className="border-t bg-gray-50 px-8 py-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (epubRendition) {
                        epubRendition.prev();
                        setCurrentPage((prev) => Math.max(1, prev - 1));
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft size={18} />
                    <span className="hidden sm:inline">Ã–Åˆki</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {authToken && progress && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Bookmark size={16} className="text-primary" />
                        <span className="hidden sm:inline">Ãatda saklandy</span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900">EPUB</span>
                  </div>

                  <button
                    onClick={() => {
                      if (epubRendition) {
                        epubRendition.next();
                        setCurrentPage((prev) => prev + 1);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="hidden sm:inline">Indiki</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div
              id="book-page-content"
              className="px-8 sm:px-12 md:px-16 py-12 min-h-[600px] prose prose-gray max-w-none"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: '1.8',
                fontFamily: 'Georgia, serif',
                columnCount: 1,
              }}
              onMouseUp={handleTextSelection}
              dangerouslySetInnerHTML={{ __html: getPageContent() }}
            />

            <div className="border-t bg-gray-50 px-8 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                  <span className="hidden sm:inline">Ã–Åˆki</span>
                </button>

                <div className="flex items-center gap-3">
                  {authToken && progress && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Bookmark size={16} className="text-primary" />
                      <span className="hidden sm:inline">Ãatda saklandy</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {currentPage} / {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Indiki</span>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="mt-4">
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(currentPage / totalPages) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowColorPicker(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-4 max-w-xs w-full">
            <p className="text-sm font-medium text-gray-700 mb-3">ReÅˆk saÃ½laÅˆ:</p>
            <div className="flex gap-2 mb-3">
              {(['yellow', 'green', 'blue', 'red'] as const).map((color) => (
                <button
                  key={color}
                  onClick={() => handleHighlight(color)}
                  className={`flex-1 h-10 rounded-lg border-2 transition-transform hover:scale-105 ${
                    color === 'yellow'
                      ? 'bg-yellow-200 border-yellow-400'
                      : color === 'green'
                      ? 'bg-green-200 border-green-400'
                      : color === 'blue'
                      ? 'bg-blue-200 border-blue-400'
                      : 'bg-red-200 border-red-400'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleClearHighlight}
              className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {selectedHighlightIds.length > 0 ? 'BelgiÅˆi aÃ½yr' : 'GoÃ½bolsun et'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
