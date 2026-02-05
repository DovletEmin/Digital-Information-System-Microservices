'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { dissertationService } from '@/services/dissertationService';
import { categoryService } from '@/services/categoryService';
import { CreateDissertationDto, Category } from '@/types';

export default function EditDissertationPage() {
  const params = useParams();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentCategoryId, setParentCategoryId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateDissertationDto>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dissertation, cats] = await Promise.all([
          dissertationService.getById(Number(params.id)),
          categoryService.getDissertationCategories()
        ]);
        
        setCategories(cats);
        setValue('title', dissertation.title);
        setValue('author', dissertation.author);
        setValue('authors_workplace', dissertation.authors_workplace || '');
        setValue('content', dissertation.content);
        setValue('language', dissertation.language);
        setValue('type', dissertation.type);
        const selectedSubcategoryIds = dissertation.categories.filter((c) => c.parent_id).map((c) => c.id);
        const selectedParentId =
          dissertation.categories.find((c) => c.parent_id)?.parent_id ||
          dissertation.categories.find((c) => !c.parent_id)?.id ||
          '';
        setParentCategoryId(selectedParentId as any);
        setValue('category_ids', selectedSubcategoryIds as any);
        
        if (dissertation.publication_date) {
          const date = new Date(dissertation.publication_date);
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

  const onSubmit = async (data: CreateDissertationDto) => {
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
        category_ids: parentCategoryId
          ? Array.from(new Set([parentCategoryId, ...normalizeCategoryIds(data.category_ids)]))
          : normalizeCategoryIds(data.category_ids),
        publication_date: normalizePublicationDate(data.publication_date),
        language: data.language || 'tm',
        type: data.type || 'local',
      };

      await dissertationService.update(Number(params.id), formattedData);
      router.push('/dashboard/dissertations');
    } catch (error) {
      console.error('Failed to update dissertation:', error);
      alert('Failed to update dissertation');
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const parentCategories = categories.filter((category) => !category.parent_id);
  const subCategories = categories.filter((category) => category.parent_id === parentCategoryId);

  const handleParentCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value ? Number(event.target.value) : '';
    setParentCategoryId(nextValue);
    setValue('category_ids', [] as any);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Edit Dissertation</h1>
      
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

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Main Category</label>
            <select
              value={parentCategoryId}
              onChange={handleParentCategoryChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select main category</option>
              {parentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subcategories</label>
            <select
              {...register('category_ids')}
              multiple
              disabled={!parentCategoryId}
              className="w-full border rounded px-3 py-2 h-32 disabled:bg-gray-100"
            >
              {subCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">Select main category to enable</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Update Dissertation
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/dissertations')}
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
