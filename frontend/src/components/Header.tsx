'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, LogOut } from 'lucide-react';
import { authService } from '@/services/authService';
import { User } from '@/types';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const syncUser = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) {
        setUser(null);
        return;
      }

      authService
        .me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        });
    };

    syncUser();

    const handleAuthChange = () => syncUser();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'access_token' || event.key === 'refresh_token') {
        syncUser();
      }
    };

    window.addEventListener('auth-change', handleAuthChange as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const handleBookmarksClick = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    router.push('/bookmarks');
  };

  const getInitials = () => {
    if (!user) return 'A';
    const first = user.first_name?.charAt(0) || '';
    const last = user.last_name?.charAt(0) || '';
    return (first + last || user.username.charAt(0)).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">SMU</span>
          </Link>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleBookmarksClick}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Bookmarks"
            >
              <Bookmark size={20} className="text-gray-600" />
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-white font-medium text-sm"
                  aria-label="User profile"
                >
                  {getInitials()}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut size={18} className="text-gray-600" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm text-gray-700 hover:text-gray-900">
                  Ulgama gir
                </Link>
                <Link href="/register" className="text-sm text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800">
                  Hasaba al
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
