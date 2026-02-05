'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Bookmark } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { savedService } from '@/services/savedService';
import { ratingService } from '@/services/ratingService';
import ArticleCard from '@/components/ArticleCard';
import BookCard from '@/components/BookCard';
import { Article, Book, Dissertation } from '@/types';

type TabKey = 'articles' | 'dissertations' | 'books';

export default function BookmarksPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('articles');
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [dissertations, setDissertations] = useState<Dissertation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAll();
  }, []);

  const attachRatings = async <T extends { id: number; average_rating?: number; rating_count?: number }>(
    items: T[],
    contentType: TabKey
  ) => {
    const stats = await Promise.all(
      items.map((item) => ratingService.getStats(contentType.slice(0, -1) as 'article' | 'book' | 'dissertation', item.id).catch(() => null))
    );

    return items.map((item, index) => {
      const stat = stats[index];
      if (!stat) return item;
      return {
        ...item,
        average_rating: typeof stat.average === 'number' ? stat.average : item.average_rating,
        rating_count: typeof stat.count === 'number' ? stat.count : item.rating_count,
      };
    });
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const [articlesData, booksData, dissertationsData] = await Promise.all([
        savedService.getSavedArticles(1, 50),
        savedService.getSavedBooks(1, 50),
        savedService.getSavedDissertations(1, 50),
      ]);

      const [articlesWithRatings, booksWithRatings, dissertationsWithRatings] = await Promise.all([
        attachRatings(articlesData.items || [], 'articles'),
        attachRatings(booksData.items || [], 'books'),
        attachRatings(dissertationsData.items || [], 'dissertations'),
      ]);

      setArticles(articlesWithRatings);
      setBooks(booksWithRatings);
      setDissertations(dissertationsWithRatings);
    } catch (err) {
      setError('Ýatda saklanan maglumatlary ýüklemek başartmady');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('tk-TM', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDissertationUnsave = async (id: number) => {
    try {
      await savedService.unsaveDissertation(id);
      setDissertations((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container-custom py-8">
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'articles'
                ? 'bg-white border-2 border-gray-900 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Makalalar
          </button>
          <button
            onClick={() => setActiveTab('dissertations')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'dissertations'
                ? 'bg-white border-2 border-gray-900 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Dissertasiýalar
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'books'
                ? 'bg-white border-2 border-gray-900 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Kitaplar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-gray-500">{error}</div>
        ) : (
          (activeTab === 'articles' && articles.length === 0) ||
          (activeTab === 'books' && books.length === 0) ||
          (activeTab === 'dissertations' && dissertations.length === 0)
        ) ? (
          <div className="text-center py-16 text-gray-500">Hiç zat tapylmady</div>
        ) : (
          <>
            {activeTab === 'articles' && (
              <div className="space-y-10">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}

            {activeTab === 'dissertations' && (
              <div className="space-y-4">
                {dissertations.map((dissertation) => (
                  <article key={dissertation.id} className="mt-0 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6 lg:p-7">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-4">
                        <span className="text-gray-900 font-medium">{dissertation.author}</span>
                        <span>•</span>
                        <span className="inline-flex items-center text-primary">
                          {dissertation.authors_workplace || 'Turkmenistanyň Ylymlar akademiýasynyň Ýazuw institutynyň mugallymy'}
                        </span>
                      </div>

                      <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4 leading-snug line-clamp-2 pb-1">
                        <Link href={`/dissertations/${dissertation.id}`} className="hover:text-primary transition-colors">
                          {dissertation.title}
                        </Link>
                      </h3>

                      <p className="text-base text-gray-600 mb-6 line-clamp-2 leading-relaxed">
                        {dissertation.content?.length > 220 ? `${dissertation.content.substring(0, 220)}...` : dissertation.content}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {dissertation.publication_date && (
                            <span>{formatDate(dissertation.publication_date)}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye size={16} />
                            {dissertation.views}
                          </span>
                          <span className="flex items-center gap-1">
                            ⭐ {dissertation.average_rating.toFixed(1)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDissertationUnsave(dissertation.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors bg-primary text-white"
                        >
                          <Bookmark size={16} />
                          Ýatda sakla
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeTab === 'books' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
