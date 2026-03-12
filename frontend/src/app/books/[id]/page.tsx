import type { Metadata } from 'next';
import BookDetailsContent from './BookDetailsContent';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function getBook(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/books/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const book = await getBook(params.id);
  if (!book) return { title: 'Kitap tapylmady' };
  return {
    title: book.title,
    description: book.description || book.author || '',
    authors: book.author ? [{ name: book.author }] : undefined,
    openGraph: {
      title: book.title,
      description: book.description || '',
      type: 'book',
      ...(book.thumbnail ? { images: [{ url: book.thumbnail }] } : {}),
    },
  };
}

export default function BookPage() {
  return <BookDetailsContent />;
}
