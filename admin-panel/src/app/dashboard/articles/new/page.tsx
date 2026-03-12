'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articleService } from '@/services/articleService';
import { categoryService } from '@/services/categoryService';
import { CreateArticleDto, Category } from '@/types';
import ImageUpload from '@/components/ImageUpload';
import { articleSchema, ArticleFormData } from '@/lib/validationSchemas';
import { logAudit } from '@/lib/auditLog';

export default function NewArticlePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: { language: 'tm', type: 'local' },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getArticleCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const onSubmit = async (data: CreateArticleDto) => {
    try {
      setLoading(true);
      
      // Очищаем текстовые поля от проблемных символов
      const cleanText = (text: string) => {
        return text
          .replace(/\r\n/g, '\n')  // Нормализуем переносы строк
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');  // Удаляем control characters
      };
      
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

      // Преобразуем category_ids в массив чисел
      const formattedData = {
        ...data,
        title: cleanText(data.title),
        author: cleanText(data.author),
        content: cleanText(data.content),
        authors_workplace: data.authors_workplace ? cleanText(data.authors_workplace) : undefined,
        thumbnail: thumbnailUrl || data.thumbnail, // Используем загруженное изображение
        category_ids: normalizeCategoryIds(data.category_ids),
        publication_date: normalizePublicationDate(data.publication_date),
        language: data.language || 'tm',
        type: data.type || 'local',
      };
      
      const created = await articleService.create(formattedData);
      logAudit('create', 'article', { entityId: String(created?.id ?? ''), entityTitle: formattedData.title });
      router.push('/dashboard/articles');
    } catch (error) {
      console.error('Failed to create article:', error);
      alert('Failed to create article');
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailChange = (url: string) => {
    setThumbnailUrl(url);
    setValue('thumbnail', url);
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">New Article</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg bg-white p-6 shadow">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Author *</label>
              <input
                type="text"
                {...register('author', { required: 'Author is required' })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              />
              {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Author's Workplace</label>
              <input
                type="text"
                {...register('authors_workplace')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail Image</label>
            <ImageUpload
              value={thumbnailUrl}
              onChange={handleThumbnailChange}
              onError={(error) => alert(error)}
            />
            <p className="mt-2 text-sm text-gray-500">
              Upload an image or leave empty to use default
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Content *</label>
            <textarea
              {...register('content', { required: 'Content is required' })}
              rows={10}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
            />
            {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Language *</label>
              <select
                {...register('language')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="tm">Turkmen</option>
                <option value="ru">Russian</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type *</label>
              <select
                {...register('type')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="local">Local</option>
                <option value="foreign">Foreign</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Publication Date</label>
              <input
                type="date"
                {...register('publication_date')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              {...register('category_ids')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Article'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
