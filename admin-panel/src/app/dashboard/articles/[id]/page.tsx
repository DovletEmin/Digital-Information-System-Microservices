'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { articleService } from '@/services/articleService';
import { Article } from '@/types';

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const data = await articleService.getById(Number(params.id));
        setArticle(data);
      } catch (error) {
        console.error('Failed to fetch article:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchArticle();
    }
  }, [params.id]);

  const handleDelete = async () => {
    if (!article || !confirm('Are you sure you want to delete this article?')) return;

    try {
      await articleService.delete(article.id);
      router.push('/dashboard/articles');
    } catch (error) {
      console.error('Failed to delete article:', error);
      alert('Failed to delete article');
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!article) {
    return <div className="p-8">Article not found</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Article Details</h1>
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/dashboard/articles/${article.id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={() => router.push('/dashboard/articles')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <label className="text-gray-600 font-semibold">Title:</label>
          <p className="text-lg">{article.title}</p>
        </div>

        <div className="mb-4">
          <label className="text-gray-600 font-semibold">Author:</label>
          <p>{article.author}</p>
        </div>

        {article.authors_workplace && (
          <div className="mb-4">
            <label className="text-gray-600 font-semibold">Workplace:</label>
            <p>{article.authors_workplace}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="text-gray-600 font-semibold">Content:</label>
          <div className="prose max-w-none mt-2">{article.content}</div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-gray-600 font-semibold">Language:</label>
            <p>{article.language}</p>
          </div>
          <div>
            <label className="text-gray-600 font-semibold">Type:</label>
            <p>{article.type}</p>
          </div>
          <div>
            <label className="text-gray-600 font-semibold">Views:</label>
            <p>{article.views}</p>
          </div>
        </div>

        {article.categories && article.categories.length > 0 && (
          <div className="mb-4">
            <label className="text-gray-600 font-semibold">Categories:</label>
            <div className="flex gap-2 mt-2">
              {article.categories.map((cat) => (
                <span key={cat.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded">
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {article.publication_date && (
          <div className="mb-4">
            <label className="text-gray-600 font-semibold">Publication Date:</label>
            <p>{new Date(article.publication_date).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
