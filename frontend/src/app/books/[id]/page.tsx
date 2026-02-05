'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Bookmark, Star } from 'lucide-react';
import { bookService } from '@/services/bookService';
import { savedService, BookHighlight } from '@/services/savedService';
import { ratingService } from '@/services/ratingService';
import { viewService } from '@/services/viewService';
import { Book } from '@/types';

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<BookHighlight[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState<{ start: number; end: number; text: string } | null>(null);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<number[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [myRating, setMyRating] = useState<number | null>(null);

  const ensureAuth = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/login');
      return false;
    }
    return true;
  };

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
    if (!Number.isNaN(bookId)) {
      viewService.recordView('book', bookId);
    }
  }, [bookId]);

  useEffect(() => {
    if (!authToken) {
      setIsSaved(false);
      setHighlights([]);
      setMyRating(null);
      setRating(0);
      return;
    }

    checkIfSaved();
    loadHighlights();
    loadMyRating();
  }, [authToken, bookId]);

  const fetchBook = async () => {
    try {
      setLoading(true);
      const data = await bookService.getById(bookId);
      setBook(data);
    } catch (error) {
      console.error('Failed to fetch book:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfSaved = async () => {
    try {
      const saved = await savedService.checkIfBookSaved(bookId);
      setIsSaved(saved);
    } catch {
      // not authenticated
    }
  };

  const loadHighlights = async () => {
    try {
      const data = await savedService.getBookHighlights(bookId);
      setHighlights(data);
    } catch {
      // not authenticated
    }
  };

  const loadMyRating = async () => {
    try {
      const data = await ratingService.getMyRating('book', bookId);
      if (data && typeof data.rating === 'number') {
        setMyRating(data.rating);
        setRating(data.rating);
      }
    } catch {
      // not authenticated
    }
  };

  const handleSave = async () => {
    try {
      if (!ensureAuth()) return;
      if (isSaved) {
        await savedService.unsaveBook(bookId);
        setIsSaved(false);
      } else {
        await savedService.saveBook(bookId);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      window.getSelection()?.removeAllRanges();
      setShowColorPicker(false);
      return;
    }
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const text = selection.toString();
      const range = selection.getRangeAt(0);
      const contentElement = document.getElementById('book-content');

      if (contentElement && contentElement.contains(range.commonAncestorContainer)) {
        const startOffset = getTextOffset(contentElement, range.startContainer, range.startOffset);
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

  const applyHighlights = (content: string) => {
    if (highlights.length === 0) return content;

    const sortedHighlights = [...highlights].sort((a, b) => a.start_offset - b.start_offset);
    let result = '';
    let lastIndex = 0;

    sortedHighlights.forEach((highlight) => {
      if (highlight.start_offset < lastIndex) {
        return;
      }

      result += content.slice(lastIndex, highlight.start_offset);

      const colorClass = {
        yellow: 'bg-yellow-200',
        green: 'bg-green-200',
        blue: 'bg-blue-200',
        red: 'bg-red-200',
      }[highlight.color] || 'bg-yellow-200';

      result += `<mark class="${colorClass} px-1 rounded">${content.slice(highlight.start_offset, highlight.end_offset)}</mark>`;
      lastIndex = highlight.end_offset;
    });

    result += content.slice(lastIndex);
    return result;
  };

  const handleSubmitRating = async () => {
    if (rating < 1 || rating > 5) return;
    try {
      if (!ensureAuth()) return;
      await ratingService.setRating({ contentType: 'book', contentId: bookId, rating });
      setMyRating(rating);
      setShowRatingDialog(false);
    } catch (error) {
      console.error('Failed to set rating:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tk-TM', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Ýüklenýär...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Kitap tapylmady</h1>
          <button
            onClick={() => router.push('/books')}
            className="text-primary hover:underline"
          >
            Kitaplara dolan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          Yza
        </button>

        <article className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {book.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6 pb-6 border-b">
            <div className="font-medium">{book.author}</div>
            {book.authors_workplace && (
              <>
                <span>|</span>
                <div>{book.authors_workplace}</div>
              </>
            )}
            {book.publication_date && (
              <>
                <span>|</span>
                <div className="flex items-center gap-1">
                  <Eye size={16} />
                  {book.views}
                </div>
                <span>|</span>
                <div>{formatDate(book.publication_date)}</div>
              </>
            )}
            {book.categories && book.categories.length > 0 && (
              <>
                <span>|</span>
                <div className="text-primary">{book.categories[0].name}</div>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mb-8 pb-6 border-b">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                isSaved
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
              Ýatda sakla
            </button>

            <button
              onClick={() => {
                if (!ensureAuth()) return;
                setShowRatingDialog(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                myRating
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Star size={18} />
              Reýting
            </button>
          </div>

          {showColorPicker && currentHighlight && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 z-50">
              <h3 className="text-lg font-semibold mb-4">Reňki saýlaň</h3>
              <div className="flex gap-3">
                <button onClick={() => handleHighlight('yellow')} className="w-12 h-12 bg-yellow-200 rounded-lg hover:scale-110 transition-transform" />
                <button onClick={() => handleHighlight('green')} className="w-12 h-12 bg-green-200 rounded-lg hover:scale-110 transition-transform" />
                <button onClick={() => handleHighlight('blue')} className="w-12 h-12 bg-blue-200 rounded-lg hover:scale-110 transition-transform" />
                <button onClick={() => handleHighlight('red')} className="w-12 h-12 bg-red-200 rounded-lg hover:scale-110 transition-transform" />
                <button
                  onClick={handleClearHighlight}
                  className="w-12 h-12 rounded-lg border border-gray-300 bg-transparent hover:bg-gray-100 transition-colors"
                  aria-label="Reňksiz"
                  title="Reňksiz"
                />
              </div>
              <button
                onClick={() => {
                  setShowColorPicker(false);
                  setCurrentHighlight(null);
                  setSelectedHighlightIds([]);
                }}
                className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Ýatyr
              </button>
            </div>
          )}

          {showRatingDialog && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 z-50">
              <h3 className="text-lg font-semibold mb-4">Reýting beriň</h3>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} onClick={() => setRating(value)} className="p-2 rounded-lg hover:bg-gray-100">
                    <Star size={24} className={value <= rating ? 'text-yellow-500' : 'text-gray-300'} />
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleSubmitRating} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                  Tassykla
                </button>
                <button onClick={() => setShowRatingDialog(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                  Ýatyr
                </button>
              </div>
              {/* {myRating && (
                <p className="mt-3 text-sm text-gray-500">Soňky bahanyňyz: {myRating}</p>
              )} */}
            </div>
          )}

          <div
            id="book-content"
            className="prose prose-lg max-w-none"
            onMouseUp={handleTextSelection}
            dangerouslySetInnerHTML={{ __html: applyHighlights(book.content) }}
          />
        </article>
      </div>

      {(showColorPicker || showRatingDialog) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => {
            setShowColorPicker(false);
            setShowRatingDialog(false);
          }}
        />
      )}
    </div>
  );
}
