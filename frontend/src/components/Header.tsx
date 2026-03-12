'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, LogOut } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import DarkModeToggle from './DarkModeToggle';

export default function Header() {
  const { user, clearUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await authService.logout();
    clearUser();
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
    <header suppressHydrationWarning className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">SMU</span>
          </Link>

          <div className="flex items-center space-x-2">
            <DarkModeToggle />
            <button
              onClick={handleBookmarksClick}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Bookmarks"
            >
              <Bookmark size={20} className="text-gray-600 dark:text-gray-400" />
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-600 text-white font-medium text-sm"
                  aria-label="User profile"
                >
                  {getInitials()}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut size={18} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                  Ulgama gir
                </Link>
                <Link href="/register" className="text-sm text-white bg-gray-900 dark:bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-700">
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
