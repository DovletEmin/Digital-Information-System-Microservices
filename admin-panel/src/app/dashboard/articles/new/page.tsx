'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { articleService } from '@/services/articleService';
import { categoryService } from '@/services/categoryService';
import { CreateArticleDto, Category } from '@/types';

export default function NewArticlePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CreateArticleDto>();

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
      await articleService.create(data);
      router.push('/dashboard/articles');
    } catch (error) {
      console.error('Failed to create article:', error);
      alert('Failed to create article');
    } finally {
      setLoading(false);
    }
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
            <label className="block text-sm font-medium text-gray-700">Thumbnail URL</label>
            <input
              type="text"
              {...register('thumbnail')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
            />
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
            <label className="block text-sm font-medium text-gray-700">Categories</label>
            <select
              multiple
              {...register('category_ids')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              size={5}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple</p>
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
