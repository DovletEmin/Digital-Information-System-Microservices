'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Settings, FileText, FileType } from 'lucide-react';
import { bookService } from '@/services/bookService';
import { savedService, BookHighlight } from '@/services/savedService';
import { Book } from '@/types';
import dynamic from 'next/dynamic';
import '@/lib/pdfConfig';

// Dynamic import to avoid SSR issues
const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

export default function BookReadPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fontSize, setFontSize] = useState(18);
  const [showSettings, setShowSettings] = useState(false);
  const [highlights, setHighlights] = useState<BookHighlight[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<number[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
  const [epubBook, setEpubBook] = useState<any>(null);
  const [epubRendition, setEpubRendition] = useState<any>(null);
  const epubViewerRef = useRef<HTMLDivElement>(null);
  const [contentType, setContentType] = useState<'text' | 'pdf' | 'epub'>('text');

  const CHARS_PER_PAGE = 2000;

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
      if (contentType === 'text') {
        loadHighlights();
      }
    }
  }, [authToken, bookId, contentType]);

  useEffect(() => {
    // Load EPUB.js dynamically
    if (contentType === 'epub' && book?.epub_file_url && epubViewerRef.current) {
      loadEpubBook();
    }
    
    return () => {
      if (epubRendition) {
        epubRendition.destroy();
      }
    };
  }, [contentType, book]);

  const loadEpubBook = async () => {
    if (typeof window === 'undefined' || !book?.epub_file_url) return;

    try {
      const ePub = (await import('epubjs')).default;
      const bookInstance = ePub(book.epub_file_url);
      setEpubBook(bookInstance);

      if (epubViewerRef.current) {
        const rendition = bookInstance.renderTo(epubViewerRef.current, {
          width: '100%',
          height: 600,
          spread: 'none'
        });

        await rendition.display();
        setEpubRendition(rendition);

        // Get total pages (locations)
        bookInstance.ready.then(() => {
          return bookInstance.locations.generate(1024);
        }).then((locations: any) => {
          setTotalPages(locations.length);
        });
      }
    } catch (error) {
      console.error('Failed to load EPUB:', error);
    }
  };

  const fetchBook = async () => {
    try {
      setLoading(true);
      const data = await bookService.getById(bookId);
      setBook(data);
      
      // Determine content type
      if (data.pdf_file_url) {
        setContentType('pdf');
      } else if (data.epub_file_url) {
        setContentType('epub');
      } else if (data.content) {
        setContentType('text');
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
    if (!authToken) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${bookId}/progress`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
          'Authorization': `Bearer ${authToken}`,
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
    if (!authToken) return;
    try {
      const data = await savedService.getBookHighlights(bookId);
      setHighlights(data);
    } catch (error) {
      console.error('Failed to load highlights:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;

    setCurrentPage(newPage);
    saveProgress(newPage);

    if (contentType === 'epub' && epubRendition) {
      epubRendition.display(epubBook.locations.cfiFromLocation(newPage - 1));
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTextSelection = () => {
    if (!authToken || contentType !== 'text') {
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

  const getTextOffset = (parent: Node, targetNode: Node, targetOffset: number): number => {
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null);
    let textOffset = 0;
    let currentNode = walker.nextNode();

    while (currentNode) {
      if (currentNode === targetNode) {
        return textOffset + targetOffset;
      }
      textOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }

    return textOffset;
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
    let lastIndex = 0;

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

  const onPdfLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
    setTotalPages(numPages);
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
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-0.5">
              {contentType === 'pdf' && <FileType size={14} />}
              {contentType === 'epub' && <FileText size={14} />}
              <span className="capitalize">{contentType.toUpperCase()}</span>
            </div>
          </div>

          {contentType === 'text' && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Settings size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel - only for text */}
      {showSettings && contentType === 'text' && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mt-20" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Sazlamalar</h3>
            
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

            <button
              onClick={() => setShowSettings(false)}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Ýap
            </button>
          </div>
        </div>
      )}

      {/* Book Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          {/* Content Area */}
          <div className="min-h-[600px]">
            {contentType === 'text' && (
              <div
                id="book-page-content"
                className="px-8 sm:px-12 md:px-16 py-12 prose prose-gray max-w-none"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: '1.8',
                  fontFamily: 'Georgia, serif',
                }}
                onMouseUp={handleTextSelection}
                dangerouslySetInnerHTML={{ __html: getPageContent() }}
              />
            )}

            {contentType === 'pdf' && book.pdf_file_url && (
              <div className="flex items-center justify-center p-8">
                <Document
                  file={book.pdf_file_url}
                  onLoadSuccess={onPdfLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-primary"></div>
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 100 : 800)}
                  />
                </Document>
              </div>
            )}

            {contentType === 'epub' && (
              <div
                ref={epubViewerRef}
                className="epub-viewer"
                style={{ height: '600px', width: '100%' }}
              />
            )}
          </div>

          {/* Page Footer with Navigation */}
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
                  {currentPage} / {totalPages || '...'}
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
                  style={{ width: `${totalPages > 0 ? (currentPage / totalPages) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Color Picker for Highlights - only for text */}
      {showColorPicker && contentType === 'text' && (
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
