'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { articleService } from '@/services/articleService';
import { categoryService } from '@/services/categoryService';
import { CreateArticleDto, Category } from '@/types';
import ImageUpload from '@/components/ImageUpload';

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateArticleDto>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [article, cats] = await Promise.all([
          articleService.getById(Number(params.id)),
          categoryService.getArticleCategories()
        ]);
        
        setCategories(cats);
        setValue('title', article.title);
        setValue('author', article.author);
        setValue('authors_workplace', article.authors_workplace || '');
        setValue('content', article.content);
        setValue('language', article.language);
        setValue('type', article.type);
        setValue('thumbnail', article.thumbnail || '');
        setThumbnailUrl(article.thumbnail || ''); // Установить превью
        setValue('category_ids', (article.categories[0]?.id ?? '') as any);
        
        if (article.publication_date) {
          const date = new Date(article.publication_date);
          setValue('publication_date', date.toISOString().split('T')[0] as any);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, setValue]);

  const onSubmit = async (data: CreateArticleDto) => {
    try {
      const normalizeCategoryIds = (input: unknown): number[] => {
        if (Array.isArray(input)) {
          return input
            .map((id) => parseInt(String(id), 10))
            .filter((id) => Number.isFinite(id));
        }
        if (typeof input === 'string' && input.trim()) {
          const parsed = parseInt(input, 10);
          return Number.isFinite(parsed) ? [parsed] : [];
        }
        return [];
      };

      const normalizePublicationDate = (value?: string) => {
        if (!value) return undefined;
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
          const [day, month, year] = value.split('.');
          return `${year}-${month}-${day}T00:00:00`;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return `${value}T00:00:00`;
        }
        return value;
      };

      const formattedData = {
        ...data,
        thumbnail: thumbnailUrl || data.thumbnail,
        category_ids: normalizeCategoryIds(data.category_ids),
        publication_date: normalizePublicationDate(data.publication_date),
        language: data.language || 'tm',
        type: data.type || 'local',
      };

      await articleService.update(Number(params.id), formattedData);
      router.push('/dashboard/articles');
    } catch (error) {
      console.error('Failed to update article:', error);
      alert('Failed to update article');
    }
  };

  const handleThumbnailChange = (url: string) => {
    setThumbnailUrl(url);
    setValue('thumbnail', url);
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Edit Article</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            {...register('title', { required: 'Title is required' })}
            className="w-full border rounded px-3 py-2"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Author *</label>
          <input
            {...register('author', { required: 'Author is required' })}
            className="w-full border rounded px-3 py-2"
          />
          {errors.author && <p className="text-red-500 text-sm mt-1">{errors.author.message}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Author&apos;s Workplace</label>
          <input
            {...register('authors_workplace')}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Thumbnail Image</label>
          <ImageUpload
            value={thumbnailUrl}
            onChange={handleThumbnailChange}
            onError={(error) => alert(error)}
          />
          <p className="mt-2 text-sm text-gray-500">
            Upload a new image or keep the existing one
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Content *</label>
          <textarea
            {...register('content', { required: 'Content is required' })}
            rows={10}
            className="w-full border rounded px-3 py-2"
          />
          {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Language *</label>
            <select {...register('language')} className="w-full border rounded px-3 py-2">
              <option value="tm">Turkmen</option>
              <option value="ru">Russian</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type *</label>
            <select {...register('type')} className="w-full border rounded px-3 py-2">
              <option value="local">Local</option>
              <option value="foreign">Foreign</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Publication Date</label>
            <input
              type="date"
              {...register('publication_date')}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            {...register('category_ids')}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Update Article
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/articles')}
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
