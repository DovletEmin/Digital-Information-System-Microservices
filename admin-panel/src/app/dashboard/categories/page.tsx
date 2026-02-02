'use client';

import { useEffect, useState } from 'react';
import { categoryService } from '@/services/categoryService';
import { Category } from '@/types';
import { Plus, Edit, Trash2 } from 'lucide-react';

type CategoryType = 'articles' | 'books' | 'dissertations';

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<CategoryType>('articles');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', parent_id: '' });

  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      let data;
      if (activeTab === 'articles') {
        data = await categoryService.getArticleCategories();
      } else if (activeTab === 'books') {
        data = await categoryService.getBookCategories();
      } else {
        data = await categoryService.getDissertationCategories();
      }
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parent_id = formData.parent_id ? parseInt(formData.parent_id) : undefined;

      if (editingCategory) {
        // Update
        if (activeTab === 'articles') {
          await categoryService.updateArticleCategory(editingCategory.id, formData.name);
        } else if (activeTab === 'books') {
          await categoryService.updateBookCategory(editingCategory.id, formData.name, parent_id);
        } else {
          await categoryService.updateDissertationCategory(editingCategory.id, formData.name, parent_id);
        }
      } else {
        // Create
        if (activeTab === 'articles') {
          await categoryService.createArticleCategory(formData.name);
        } else if (activeTab === 'books') {
          await categoryService.createBookCategory(formData.name, parent_id);
        } else {
          await categoryService.createDissertationCategory(formData.name, parent_id);
        }
      }

      setShowModal(false);
      setFormData({ name: '', parent_id: '' });
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Failed to save category');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      if (activeTab === 'articles') {
        await categoryService.deleteArticleCategory(id);
      } else if (activeTab === 'books') {
        await categoryService.deleteBookCategory(id);
      } else {
        await categoryService.deleteDissertationCategory(id);
      }
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        parent_id: category.parent_id?.toString() || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', parent_id: '' });
    }
    setShowModal(true);
  };

  const parentCategories = categories.filter(c => !c.parent_id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          <span>New Category</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['articles', 'books', 'dissertations'] as CategoryType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                {activeTab !== 'articles' && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Parent Category
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {category.name}
                    </div>
                  </td>
                  {activeTab !== 'articles' && (
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {category.parent_id
                          ? categories.find((c) => c.id === category.parent_id)?.name || '-'
                          : '-'}
                      </div>
                    </td>
                  )}
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(category)}
                      className="mr-3 text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">
              {editingCategory ? 'Edit Category' : 'New Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
                />
              </div>

              {activeTab !== 'articles' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parent Category (optional)
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
                  >
                    <option value="">None</option>
                    {parentCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
