'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Settings, Download, ZoomIn, ZoomOut } from 'lucide-react';
import dynamic from 'next/dynamic';
import '@/lib/pdfConfig';
import { bookService } from '@/services/bookService';
import { savedService, BookHighlight } from '@/services/savedService';
import { Book } from '@/types';
import { pdfjs } from 'react-pdf';

if (typeof window !== 'undefined') {
  const origin = window.location.origin;
  pdfjs.GlobalWorkerOptions.workerSrc = `${origin}/api/pdf-worker`;
}


// Import PDF components dynamically to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);

export default function BookReadPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);

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
  
  // PDF reading state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  // EPUB reading state
  const [epubBook, setEpubBook] = useState<any>(null);
  const [epubRendition, setEpubRendition] = useState<any>(null);
  const [epubError, setEpubError] = useState<string | null>(null);
  const epubViewerRef = useRef<HTMLDivElement>(null);
  
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);

  const CHARS_PER_PAGE = 2000; // Approximate characters per page

  // Auth handling
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
    fetchBook();
  }, [bookId]);

  useEffect(() => {
    if (authToken) {
      loadProgress();
      loadHighlights();
    }
  }, [authToken, bookId]);




  // Load EPUB book when view mode is EPUB
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
    try {
      setLoading(true);
      const data = await bookService.getById(bookId);
      setBook(data);
      
      // Determine view mode: prefer PDF, then EPUB, then text
      if (data.pdf_file_url) {
        setViewMode('pdf');
      } else if (data.epub_file_url) {
        setViewMode('epub');
      } else if (data.content && data.content.trim().length > 0) {
        setViewMode('text');
        // Calculate total pages for text mode
        const pages = Math.max(1, Math.ceil(data.content.length / CHARS_PER_PAGE));
        setTotalPages(pages);
      }
    } catch (error) {
      console.error('Failed to fetch book:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${bookId}/progress`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
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
    if (!authToken) return;

    try {
      const progressPercentage = (page / totalPages) * 100;
      
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${bookId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
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
      // Dynamically import EPUB.js
      const ePub = (await import('epubjs')).default;
      const bookInstance = ePub(book.epub_file_url);
      setEpubBook(bookInstance);

      if (epubViewerRef.current) {
        // Clear previous rendition if any
        epubViewerRef.current.innerHTML = '';
        
        const rendition = bookInstance.renderTo(epubViewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none'
        });

        await rendition.display();
        setEpubRendition(rendition);

        // Get total pages (locations)
        bookInstance.ready.then(() => {
          return bookInstance.locations.generate(1600);
        }).then((locations: any) => {
          setTotalPages(locations.length);
        });
      }
    } catch (error) {
      console.error('Failed to load EPUB:', error);
      setEpubError('EPUB faýly ýüklenip bilinmedi');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    saveProgress(newPage);
    
    // Handle EPUB navigation
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
    if (selection && selection.toString().length > 0) {
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

    try {
      if (selectedHighlightIds.length > 0) {
        await Promise.all(
          selectedHighlightIds.map((id) => savedService.updateBookHighlight(id, { color }))
        );
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
    const pageHighlights = highlights.filter(
      (h) => h.start_offset < pageEnd && h.end_offset > pageStart
    );

    if (pageHighlights.length === 0) return content;

    const sortedHighlights = [...pageHighlights].sort((a, b) => a.start_offset - b.start_offset);
    let result = '';
    let lastIndex =0;

    sortedHighlights.forEach((highlight) => {
      const localStart = Math.max(0, highlight.start_offset - pageStart);
      const localEnd = Math.min(content.length, highlight.end_offset - pageStart);
      
      if (localStart < lastIndex || localStart >= content.length) return;

      result += content.slice(lastIndex, localStart);

      const colorClass = {
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
    if (!book || !book.content) return '';
    
    const start = (currentPage - 1) * CHARS_PER_PAGE;
    const end = start + CHARS_PER_PAGE;
    const pageContent = book.content.slice(start, end);
    
    return applyHighlights(pageContent, start, end);
  };

  // PDF handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setPdfError('Не удалось загрузить PDF файл');
  };

  const handlePdfPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > numPages) return;
    setPageNumber(newPage);
    if (authToken) {
      savePdfProgress(newPage, numPages);
    }
  };

  const savePdfProgress = async (page: number, total: number) => {
    if (!authToken) return;

    try {
      const progressPercentage = (page / total) * 100;
      
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${bookId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          book_id: bookId,
          current_page: page,
          total_pages: total,
          progress_percentage: progressPercentage,
        }),
      });
    } catch (error) {
      console.error('Failed to save PDF progress:', error);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const getPdfFile = () => {
    if (!book?.pdf_file_url) return '';

    const url = `/api/books/${bookId}/read`;
    if (!authToken) return url;

    return {
      url,
      httpHeaders: {
        Authorization: `Bearer ${authToken}`,
      },
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-600 border-t-white"></div>
      </div>
    );
  }

  if (!book || (!book.content && !book.pdf_file_url && !book.epub_file_url)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Kitap tapylmady ýa-da okalyp bilinmeýär</h1>
          <button
            onClick={() => router.push(`/books/${bookId}`)}
            className="text-blue-400 hover:underline"
          >
            Yza dolan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
      {/* Header */}
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
            <h1 className="text-sm sm:text-base font-medium text-gray-900 truncate">
              {book.title}
            </h1>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mt-20" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Sazlamalar</h3>
            
            {viewMode === 'text' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harp ölçegi: {fontSize}px
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Масштаб: {Math.round(scale * 100)}%
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleZoomOut}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <ZoomOut className="inline mr-2" size={16} />
                    Кичелт
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <ZoomIn className="inline mr-2" size={16} />
                    Uly
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSettings(false)}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Ýap
            </button>
          </div>
        </div>
      )}

      {/* Book Content Area */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {viewMode === 'pdf' ? (
          /* PDF Viewer */
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex justify-center items-center p-4 bg-gray-50">
              {pdfError ? (
                <div className="text-red-600 text-center py-8">
                  <p className="mb-4">{pdfError}</p>
                  <button
                    onClick={() => {
                      setPdfError(null);
                      fetchBook();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Gaýtadan synanyş
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Document
                    file={getPdfFile()}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-600 border-t-white"></div>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={
                        <div className="flex items-center justify-center py-12">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-400 border-t-gray-700"></div>
                        </div>
                      }
                    />
                  </Document>
                </div>
              )}
            </div>

            {/* PDF Navigation Footer */}
            {!pdfError && numPages > 0 && (
              <div className="border-t bg-gray-50 px-8 py-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handlePdfPageChange(pageNumber - 1)}
                    disabled={pageNumber === 1}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                    <span className="hidden sm:inline">Öňki</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {authToken && progress && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Bookmark size={16} className="text-primary" />
                        <span className="hidden sm:inline">Ýatda saklandy</span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {pageNumber} / {numPages}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePdfPageChange(pageNumber + 1)}
                    disabled={pageNumber === numPages}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Indiki</span>
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(pageNumber / numPages) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : viewMode === 'epub' ? (
          /* EPUB Viewer */
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
                    Gaýtadan synanyş
                  </button>
                </div>
              ) : (
                <div 
                  ref={epubViewerRef}
                  className="epub-viewer w-full"
                  style={{ height: '600px', minHeight: '600px' }}
                />
              )}
            </div>

            {/* EPUB Navigation Footer */}
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
                    <span className="hidden sm:inline">Öňki</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {authToken && progress && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Bookmark size={16} className="text-primary" />
                        <span className="hidden sm:inline">Ýatda saklandy</span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      EPUB
                    </span>
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
          /* Text Viewer */
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            {/* Book Content */}
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

            {/* Text Navigation Footer */}
            <div className="border-t bg-gray-50 px-8 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                  <span className="hidden sm:inline">Öňki</span>
                </button>

                <div className="flex items-center gap-3">
                  {authToken && progress && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Bookmark size={16} className="text-primary" />
                      <span className="hidden sm:inline">Ýatda saklandy</span>
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

              {/* Progress Bar */}
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

      {/* Color Picker for Highlights */}
      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowColorPicker(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-4 max-w-xs w-full">
            <p className="text-sm font-medium text-gray-700 mb-3">Reňk saýlaň:</p>
            <div className="flex gap-2 mb-3">
              {['yellow', 'green', 'blue', 'red'].map((color) => (
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
              {selectedHighlightIds.length > 0 ? 'Belgiňi aýyr' : 'Goýbolsun et'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
