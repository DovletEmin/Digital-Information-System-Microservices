'use client';

import { useEffect, useState } from 'react';
import { userService, AdminUser } from '@/services/userService';
import {
  Search,
  Trash2,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  RefreshCw,
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? users.filter(
            (u) =>
              u.username.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              u.first_name.toLowerCase().includes(q) ||
              u.last_name.toLowerCase().includes(q)
          )
        : users
    );
  }, [search, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.listUsers();
      setUsers(data ?? []);
    } catch {
      setError('Ulanyjylary ýükläp bolmady');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      const updated = await userService.updateUser(user.id, { is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch {
      alert('Ýalňyşlyk ýüze çykdy');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStaff = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      const updated = await userService.updateUser(user.id, { is_staff: !user.is_staff });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch {
      alert('Ýalňyşlyk ýüze çykdy');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`"${user.username}" ulanyjyny pozmak isleýärsiňizmi?`)) return;
    setActionLoading(user.id);
    try {
      await userService.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      alert('Ulanyjyny pozup bolmady');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <button
          onClick={fetchUsers}
          className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Täzele</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Ulanyjy adyny, e-poçtany gözle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 flex gap-4 text-sm text-gray-500">
        <span>Jemi: <strong className="text-gray-800">{users.length}</strong></span>
        <span>Işjeň: <strong className="text-green-700">{users.filter((u) => u.is_active).length}</strong></span>
        <span>Admin: <strong className="text-blue-700">{users.filter((u) => u.is_staff).length}</strong></span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            Ýüklenýär...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Ulanyjy tapylmady</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ulanyjy</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">E-poçta</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Doly ady</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Işjeň</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Döredilen</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.map((user) => {
                const busy = actionLoading === user.id;
                return (
                  <tr key={user.id} className={busy ? 'opacity-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={busy}
                        title={user.is_active ? 'Işjeňligini ýapmak' : 'Işjeňligi açmak'}
                        className="inline-flex items-center justify-center rounded-full p-1 transition-colors hover:bg-gray-100"
                      >
                        {user.is_active ? (
                          <UserCheck className="h-5 w-5 text-green-600" />
                        ) : (
                          <UserX className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStaff(user)}
                        disabled={busy}
                        title={user.is_staff ? 'Admin hukuklaryny aýyrmak' : 'Admin hukuklaryny bermek'}
                        className="inline-flex items-center justify-center rounded-full p-1 transition-colors hover:bg-gray-100"
                      >
                        {user.is_staff ? (
                          <ShieldCheck className="h-5 w-5 text-blue-600" />
                        ) : (
                          <ShieldOff className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={busy}
                        title="Ulanyjyny poz"
                        className="rounded p-1 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
