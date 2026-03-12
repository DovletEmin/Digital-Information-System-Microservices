'use client';

import { useEffect, useState } from 'react';
import { userService, AdminUser, UpdateUserPayload, CreateUserPayload } from '@/services/userService';
import {
  Search,
  Trash2,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  RefreshCw,
  Plus,
  Pencil,
  X,
} from 'lucide-react';

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit';

interface ModalState {
  mode: ModalMode;
  user?: AdminUser;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
}

const emptyForm = (): FormData => ({
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  is_active: true,
  is_staff: false,
});

function userToForm(u: AdminUser): FormData {
  return {
    username: u.username,
    email: u.email,
    password: '',
    first_name: u.first_name ?? '',
    last_name: u.last_name ?? '',
    is_active: u.is_active,
    is_staff: u.is_staff,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // modal
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? users.filter(
            (u) =>
              u.username.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              (u.first_name ?? '').toLowerCase().includes(q) ||
              (u.last_name ?? '').toLowerCase().includes(q)
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

  // ── inline toggles ──────────────────────────────────────────────────────────

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

  // ── modal helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (user: AdminUser) => {
    setForm(userToForm(user));
    setFormError(null);
    setModal({ mode: 'edit', user });
  };

  const closeModal = () => {
    if (formLoading) return;
    setModal(null);
    setFormError(null);
  };

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.username.trim()) return setFormError('Ulanyjy ady hökmanydyr');
    if (!form.email.trim()) return setFormError('E-poçta hökmanydyr');
    if (modal?.mode === 'create' && form.password.length < 6)
      return setFormError('Açar söz iň az 6 simwoldan ybarat bolmaly');

    setFormLoading(true);
    try {
      if (modal?.mode === 'create') {
        const payload: CreateUserPayload = {
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          first_name: form.first_name.trim() || undefined,
          last_name: form.last_name.trim() || undefined,
          is_active: form.is_active,
          is_staff: form.is_staff,
        };
        const created = await userService.createUser(payload);
        setUsers((prev) => [created, ...prev]);
      } else if (modal?.mode === 'edit' && modal.user) {
        const payload: UpdateUserPayload = {
          username: form.username.trim(),
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          is_active: form.is_active,
          is_staff: form.is_staff,
        };
        const updated = await userService.updateUser(modal.user.id, payload);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      }
      setModal(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Ýalňyşlyk ýüze çykdy';
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <div className="flex gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Täzele</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Täze ulanyjy</span>
          </button>
        </div>
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
                          {((user.first_name?.[0]) || user.username[0]).toUpperCase()}
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
                        {user.is_active
                          ? <UserCheck className="h-5 w-5 text-green-600" />
                          : <UserX className="h-5 w-5 text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStaff(user)}
                        disabled={busy}
                        title={user.is_staff ? 'Admin hukuklaryny aýyrmak' : 'Admin hukuklaryny bermek'}
                        className="inline-flex items-center justify-center rounded-full p-1 transition-colors hover:bg-gray-100"
                      >
                        {user.is_staff
                          ? <ShieldCheck className="h-5 w-5 text-blue-600" />
                          : <ShieldOff className="h-5 w-5 text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          disabled={busy}
                          title="Redaktirle"
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={busy}
                          title="Ulanyjyny poz"
                          className="rounded p-1 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal.mode === 'create' ? 'Täze ulanyjy döret' : 'Ulanyjyny redaktirle'}
              </h2>
              <button onClick={closeModal} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-4 px-6 py-5">
              {formError && (
                <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{formError}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ulanyjy ady *</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setField('username', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">E-poçta *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ady</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setField('first_name', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Ady"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Familiýasy</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setField('last_name', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Familiýasy"
                  />
                </div>
              </div>

              {modal.mode === 'create' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Açar söz *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Iň az 6 simwol"
                  />
                </div>
              )}

              <div className="flex gap-6">
                <label className="flex cursor-pointer items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setField('is_active', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Işjeň</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={form.is_staff}
                    onChange={(e) => setField('is_staff', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Administrator</span>
                </label>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={closeModal}
                disabled={formLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Ýatyr
              </button>
              <button
                onClick={handleSubmit}
                disabled={formLoading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                {modal.mode === 'create' ? 'Döret' : 'Ýatda sakla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
