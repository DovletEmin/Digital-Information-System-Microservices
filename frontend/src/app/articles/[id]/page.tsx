import type { Metadata } from 'next';
import ArticleContent from './ArticleContent';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function getArticle(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const article = await getArticle(params.id);
  if (!article) return { title: 'Makala tapylmady' };
  const description = article.content
    ? article.content.replace(/<[^>]+>/g, '').slice(0, 160)
    : article.abstract || '';
  return {
    title: article.title,
    description,
    authors: article.author ? [{ name: article.author }] : undefined,
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      ...(article.thumbnail ? { images: [{ url: article.thumbnail }] } : {}),
    },
  };
}

export default function ArticlePage() {
  return <ArticleContent />;
}
