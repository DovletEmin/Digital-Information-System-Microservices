'use client';

import { useEffect, useState } from 'react';
import { articleService } from '@/services/articleService';
import { bookService } from '@/services/bookService';
import { dissertationService } from '@/services/dissertationService';
import { FileText, Book, GraduationCap, Eye } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    articles: 0,
    books: 0,
    dissertations: 0,
    totalViews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [articlesRes, booksRes, dissertationsRes] = await Promise.all([
          articleService.getAll(1, 1),
          bookService.getAll(1, 1),
          dissertationService.getAll(1, 1),
        ]);

        setStats({
          articles: articlesRes.total,
          books: booksRes.total,
          dissertations: dissertationsRes.total,
          totalViews: 0, // Can be calculated from backend
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: 'Total Articles',
      value: stats.articles,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Books',
      value: stats.books,
      icon: Book,
      color: 'bg-green-500',
    },
    {
      title: 'Total Dissertations',
      value: stats.dissertations,
      icon: GraduationCap,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Views',
      value: stats.totalViews,
      icon: Eye,
      color: 'bg-orange-500',
    },
  ];

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className={`rounded-lg p-3 ${card.color}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {card.title}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Welcome to SMU Admin Panel
        </h2>
        <p className="text-gray-600">
          Use the sidebar to navigate through different sections and manage
          your content.
        </p>
      </div>
    </div>
  );
}
