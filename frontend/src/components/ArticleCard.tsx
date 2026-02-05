'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Article } from '@/types';
import { Eye, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { savedService } from '@/services/savedService';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

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
    if (!authToken) {
      setIsSaved(false);
      return;
    }

    savedService
      .checkIfSaved(article.id)
      .then(setIsSaved)
      .catch(() => {});
  }, [article.id, authToken]);

  const handleSave = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      if (isSaved) {
        await savedService.unsaveArticle(article.id);
        setIsSaved(false);
      } else {
        await savedService.saveArticle(article.id);
        setIsSaved(true);
      }
    } catch {
      // ignore
    }
  };
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tk-TM', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Link href={`/articles/${article.id}`}>
      <article className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer mb-4">
        <div className="flex flex-col lg:flex-row gap-6 p-6 lg:p-7">
          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-4">
              <span className="text-gray-900 font-medium">{article.author}</span>
              <span>•</span>
              <span className="inline-flex items-center text-primary">
                {/* {article.categories[0]?.name || 'Turkmenistanyň Jemgat hojalygy instituty'} */
                article.authors_workplace 
                }
              </span>
            </div>

            {/* Title */}
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4 pb-1 leading-snug line-clamp-2 hover:text-primary transition-colors">
              {article.title}
            </h3>

            {/* Excerpt */}
            <p className="text-base text-gray-600 mb-6 line-clamp-2 leading-relaxed">
              {truncateText(article.content, 220)}
            </p>

            {/* Footer */}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {article.publication_date && (
                  <span>{formatDate(article.publication_date)}</span>
                )}
                <span className="flex items-center gap-1">
                  <Eye size={16} />
                  {article.views ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  ⭐ {(article.average_rating ?? 0).toFixed(1)}
                </span>
              </div>

              <button
                onClick={handleSave}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isSaved
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Bookmark size={16} />
                Ýatda sakla
              </button>
            </div>
          </div>

          {/* Image */}
          {article.thumbnail && (
            <div className="w-full lg:w-64 xl:w-72 aspect-[4/3] flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 lg:order-last">
              <img
                src={article.thumbnail}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
