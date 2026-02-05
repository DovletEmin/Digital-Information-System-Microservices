'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/authService';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.register(form);
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">Hasaba alyş</h1>
        <p className="text-sm text-gray-500 text-center mt-2">Täze hasap dörediň</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ulanyjy ady</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ady</label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={onChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Familiýasy</label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={onChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Parol</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 text-white py-2 font-medium hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Hasaba alynýar...' : 'Hasaba al'}
          </button>
        </form>

        <p className="text-sm text-gray-600 text-center mt-6">
          Hasap bar?{' '}
          <Link href="/login" className="text-primary hover:underline">Ulgama gir</Link>
        </p>
      </div>
    </div>
  );
}
