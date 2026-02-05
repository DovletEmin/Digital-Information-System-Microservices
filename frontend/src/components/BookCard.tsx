import { Book } from '@/types';
import Link from 'next/link';

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/books/${book.id}`}>
      <div className="group cursor-pointer">
        {/* Book Cover */}
        <div className="relative w-full aspect-[2/3] overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow bg-gray-100">
          {book.thumbnail ? (
            <img
              src={book.thumbnail}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
              <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="mt-3">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {book.title}
          </h3>
          <p className="mt-1 text-xs text-gray-600 line-clamp-1">
            {book.author}
          </p>
          <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
            ⭐ {(book.average_rating ?? 0).toFixed(1)}
          </p>
        </div>
      </div>
    </Link>
  );
}
