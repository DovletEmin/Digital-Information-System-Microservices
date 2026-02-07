'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Download, Bookmark, Star } from 'lucide-react';
import { bookService } from '@/services/bookService';
import { savedService } from '@/services/savedService';
import { ratingService } from '@/services/ratingService';
import { viewService } from '@/services/viewService';
import { Book } from '@/types';
import Image from 'next/image';

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
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
      setMyRating(null);
      setRating(0);
      return;
    }

    checkIfSaved();
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
    } catch (error) {
      console.error('Failed to check if book is saved:', error);
    }
  };

  const loadMyRating = async () => {
    try {
      const userRating = await ratingService.getMyRating('book', bookId);
      setMyRating(userRating);
      setRating(userRating || 0);
    } catch (error) {
      console.error('Failed to load rating:', error);
    }
  };

  const handleToggleSave = async () => {
    if (!ensureAuth()) return;

    try {
      if (isSaved) {
        await savedService.removeBook(bookId);
        setIsSaved(false);
      } else {
        await savedService.saveBook(bookId);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
    }
  };

  const handleRead = () => {
    // Navigate to reading page
    router.push(`/books/${bookId}/read`);
  };

  const handleDownload = async (fileType: 'pdf' | 'epub') => {
    if (!book) return;
    
    const fileUrl = fileType === 'pdf' ? book.pdf_file_url : book.epub_file_url;
    if (!fileUrl) {
      alert(`${fileType.toUpperCase()} faýly ýok`);
      return;
    }

    try {
      // Open file in new tab for download
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Failed to download:', error);
      alert('Ýükläp almak başartmady');
    }
  };

  const handleSubmitRating = async () => {
    if (rating < 1 || rating > 5) return;
    try {
      if (!ensureAuth()) return;
      await ratingService.setRating({ contentType: 'book', contentId: bookId, rating });
      setMyRating(rating);
      setShowRatingDialog(false);
      // Refresh book data to get updated rating
      await fetchBook();
    } catch (error) {
      console.error('Failed to set rating:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tk-TM', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-primary"></div>
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

  const hasFiles = book.pdf_file_url || book.epub_file_url;
  const canRead = hasFiles || book.content;

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Yza</span>
        </button>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
          <div className="grid md:grid-cols-[300px,1fr] gap-8 md:gap-12">
            {/* Left: Thumbnail */}
            <div className="flex justify-center md:justify-start">
              <div className="relative w-full max-w-[300px] aspect-[3/4] rounded-xl overflow-hidden shadow-lg bg-gray-100">
                {book.thumbnail ? (
                  <Image
                    src={book.thumbnail}
                    alt={book.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-gray-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Right: Book Info */}
            <div className="flex flex-col">
              {/* Title and Metadata */}
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {book.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Awtor:</span>
                    <span>{book.author}</span>
                  </div>
                  {book.authors_workplace && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Iş ýeri:</span>
                      <span>{book.authors_workplace}</span>
                    </div>
                  )}
                  {book.publication_date && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Çap edilen:</span>
                      <span>{formatDate(book.publication_date)}</span>
                    </div>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          className={`${
                            star <= Math.round(book.average_rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {book.average_rating.toFixed(1)} ({book.rating_count} baha)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (ensureAuth()) setShowRatingDialog(true);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    {myRating ? 'Bahany üýtget' : 'Baha ber'}
                  </button>
                </div>

                {/* Categories */}
                {book.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {book.categories.map((category) => (
                      <span
                        key={category.id}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              {book.description && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Düşündiriş</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {book.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-auto">
                {canRead && (
                  <button
                    onClick={handleRead}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    <BookOpen size={20} />
                    <span>Oka</span>
                  </button>
                )}

                {book.pdf_file_url && (
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    <Download size={20} />
                    <span>PDF Ýükle</span>
                  </button>
                )}

                {book.epub_file_url && (
                  <button
                    onClick={() => handleDownload('epub')}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    <Download size={20} />
                    <span>EPUB Ýükle</span>
                  </button>
                )}

                <button
                  onClick={handleToggleSave}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${
                    isSaved
                      ? 'bg-primary/10 text-primary border-2 border-primary'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary hover:text-primary'
                  }`}
                >
                  <Bookmark size={20} className={isSaved ? 'fill-current' : ''} />
                  <span>{isSaved ? 'Saklanan' : 'Sakla'}</span>
                </button>
              </div>

              {/* File Info */}
              {hasFiles && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Elýeterli formatlar:</span>
                    {book.pdf_file_url && ' PDF'}
                    {book.pdf_file_url && book.epub_file_url && ','}
                    {book.epub_file_url && ' EPUB'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating Dialog */}
      {showRatingDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRatingDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Kitaba baha ber</h3>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={`${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRatingDialog(false)}
                className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Goýbolsun et
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={rating === 0}
                className="flex-1 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tassykla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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
