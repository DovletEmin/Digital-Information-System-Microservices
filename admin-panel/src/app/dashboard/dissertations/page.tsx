'use client';

import { useEffect, useState } from 'react';
import { dissertationService } from '@/services/dissertationService';
import { Dissertation } from '@/types';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import Link from 'next/link';

export default function DissertationsPage() {
  const [dissertations, setDissertations] = useState<Dissertation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDissertations();
  }, [page]);

  const fetchDissertations = async () => {
    try {
      setLoading(true);
      const data = await dissertationService.getAll(page, 20);
      setDissertations(data.items || []);
      setTotalPages(data.pages || 1);
    } catch (error) {
      console.error('Failed to fetch dissertations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dissertation?')) return;

    try {
      await dissertationService.delete(id);
      fetchDissertations();
    } catch (error) {
      console.error('Failed to delete dissertation:', error);
      alert('Failed to delete dissertation');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchDissertations();
      return;
    }

    try {
      setLoading(true);
      const data = await dissertationService.search(searchQuery, page, 20);
      setDissertations(data.items || []);
      setTotalPages(data.pages || 1);
    } catch (error) {
      console.error('Failed to search dissertations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dissertations</h1>
        <Link
          href="/dashboard/dissertations/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Dissertation
        </Link>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search dissertations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Search
        </button>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              fetchDissertations();
            }}
            className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">University</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dissertations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No dissertations found
                    </td>
                  </tr>
                ) : (
                  dissertations.map((dissertation) => (
                    <tr key={dissertation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dissertation.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{dissertation.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{dissertation.author}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{dissertation.authors_workplace || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{dissertation.views || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/dissertations/${dissertation.id}/edit`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(dissertation.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Öňki
              </button>
              <span className="px-4 py-2">
                Sahypa {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Indiki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
