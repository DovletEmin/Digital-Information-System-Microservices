'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { dissertationService } from '@/services/dissertationService';
import { categoryService } from '@/services/categoryService';
import { CreateDissertationDto, Category } from '@/types';

export default function NewDissertationPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentCategoryId, setParentCategoryId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CreateDissertationDto>();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getDissertationCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const onSubmit = async (data: CreateDissertationDto) => {
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

      const selectedSubcategoryIds = normalizeCategoryIds(data.category_ids);
      const finalCategoryIds = parentCategoryId
        ? Array.from(new Set([parentCategoryId, ...selectedSubcategoryIds]))
        : selectedSubcategoryIds;

      // Преобразуем category_ids в массив чисел
      const formattedData = {
        ...data,
        title: cleanText(data.title),
        author: cleanText(data.author),
        content: cleanText(data.content),
        authors_workplace: data.authors_workplace ? cleanText(data.authors_workplace) : undefined,
        category_ids: finalCategoryIds,
        publication_date: normalizePublicationDate(data.publication_date),
        language: data.language || 'tm',
        type: data.type || 'local',
      };
      
      await dissertationService.create(formattedData);
      router.push('/dashboard/dissertations');
    } catch (error) {
      console.error('Failed to create dissertation:', error);
      alert('Failed to create dissertation');
    } finally {
      setLoading(false);
    }
  };

  const parentCategories = categories.filter((category) => !category.parent_id);
  const subCategories = categories.filter((category) => category.parent_id === parentCategoryId);

  const handleParentCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value ? Number(event.target.value) : '';
    setParentCategoryId(nextValue);
    setValue('category_ids', [] as any);
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">New Dissertation</h1>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Main Category</label>
              <select
                value={parentCategoryId}
                onChange={handleParentCategoryChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="">Select main category</option>
                {parentCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Subcategories</label>
              <select
                multiple
                {...register('category_ids')}
                disabled={!parentCategoryId}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 disabled:bg-gray-100"
                size={5}
              >
                {subCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">Select main category to enable</p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Dissertation'}
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
