'use client';

import { useEffect, useState } from 'react';
import { AuditEntry, getLocalAuditLog, clearLocalAuditLog } from '@/lib/auditLog';
import { Trash2, RefreshCw } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-purple-100 text-purple-700',
  logout: 'bg-gray-100 text-gray-700',
  upload: 'bg-yellow-100 text-yellow-700',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Döretdi',
  update: 'Üýtgetdi',
  delete: 'Pozdy',
  login: 'Girdi',
  logout: 'Çykdy',
  upload: 'Ýükledi',
};

const ENTITY_LABELS: Record<string, string> = {
  article: 'Makala',
  book: 'Kitap',
  dissertation: 'Dissertasiýa',
  category: 'Kategoriýa',
  user: 'Ulanyjy',
  media: 'Media',
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');

  const loadEntries = () => setEntries(getLocalAuditLog());

  useEffect(() => { loadEntries(); }, []);

  const handleClear = () => {
    if (window.confirm('Audit log-y arassalamak isleýärsiňizmi?')) {
      clearLocalAuditLog();
      setEntries([]);
    }
  };

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.action === filter);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('tk-TM', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(iso));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={loadEntries}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} />Täzele
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 size={16} />Arassala
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'create', 'update', 'delete', 'upload', 'login', 'logout'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Ählisi' : ACTION_LABELS[f] || f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-500">Audit ýazgylary ýok</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Wagt</th>
                <th className="px-4 py-3 text-left">Hereket</th>
                <th className="px-4 py-3 text-left">Obýekt</th>
                <th className="px-4 py-3 text-left">Ady / ID</th>
                <th className="px-4 py-3 text-left">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(entry.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-600'}`}>
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {entry.entity_title
                      ? <span title={entry.entity_id ? `ID: ${entry.entity_id}` : ''}>{entry.entity_title}</span>
                      : entry.entity_id
                        ? <span className="text-gray-500">#{entry.entity_id}</span>
                        : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{entry.admin_user || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        * Audit log ýerli saklanýar (brauzer). Maksimal {' '}
        <span className="font-medium">200</span> ýazgy.
      </p>
    </div>
  );
}
