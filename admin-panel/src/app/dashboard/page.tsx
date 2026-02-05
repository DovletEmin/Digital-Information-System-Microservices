'use client';

import { useEffect, useMemo, useState } from 'react';
import { articleService } from '@/services/articleService';
import { bookService } from '@/services/bookService';
import { dissertationService } from '@/services/dissertationService';
import { activityService } from '@/services/activityService';
import { userService } from '@/services/userService';
import {
  FileText,
  Book,
  GraduationCap,
  Eye,
  Users,
  Globe2,
  Languages,
  ShieldCheck,
  ShieldOff
} from 'lucide-react';
import { Article, Book as BookType, Dissertation } from '@/types';

type LanguageKey = 'tm' | 'ru' | 'en';
type TypeKey = 'local' | 'foreign';

interface ContentBreakdown {
  total: number;
  views: number;
  language: Record<LanguageKey, number>;
  type: Record<TypeKey, number>;
}

interface DashboardStats {
  articles: ContentBreakdown;
  books: ContentBreakdown;
  dissertations: ContentBreakdown;
  totalContent: number;
  totalViews: number;
  totalByLanguage: Record<LanguageKey, number>;
  totalByType: Record<TypeKey, number>;
  users: number;
  traffic: {
    total: number;
    authenticated: number;
    anonymous: number;
  };
}

const emptyBreakdown: ContentBreakdown = {
  total: 0,
  views: 0,
  language: { tm: 0, ru: 0, en: 0 },
  type: { local: 0, foreign: 0 }
};

const emptyStats: DashboardStats = {
  articles: { ...emptyBreakdown },
  books: { ...emptyBreakdown },
  dissertations: { ...emptyBreakdown },
  totalContent: 0,
  totalViews: 0,
  totalByLanguage: { tm: 0, ru: 0, en: 0 },
  totalByType: { local: 0, foreign: 0 },
  users: 0,
  traffic: {
    total: 0,
    authenticated: 0,
    anonymous: 0
  }
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatNumber = (value: number) => new Intl.NumberFormat('tk-TM').format(value);

  const normalizeLanguage = (value?: string): LanguageKey | null => {
    const v = (value || '').toLowerCase();
    if (v.startsWith('tm') || v.startsWith('tk') || v.includes('turk')) return 'tm';
    if (v.startsWith('ru')) return 'ru';
    if (v.startsWith('en')) return 'en';
    return null;
  };

  const normalizeType = (value?: string): TypeKey | null => {
    const v = (value || '').toLowerCase();
    if (v.includes('local') || v.includes('ýerli') || v.includes('yerli')) return 'local';
    if (v.includes('foreign') || v.includes('daşary') || v.includes('dasary')) return 'foreign';
    return null;
  };

  const fetchAllItems = async <T,>(
    fetchPage: (page: number, perPage: number) => Promise<{ items: T[]; total: number; pages: number }>,
    perPage = 100
  ) => {
    const first = await fetchPage(1, perPage);
    const items = [...(first.items || [])];

    for (let page = 2; page <= first.pages; page += 1) {
      const next = await fetchPage(page, perPage);
      items.push(...(next.items || []));
    }

    return { items, total: first.total };
  };

  const calcBreakdown = (items: Array<Article | BookType | Dissertation>): ContentBreakdown => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        acc.views += item.views ?? 0;

        const lang = normalizeLanguage(item.language);
        if (lang) acc.language[lang] += 1;

        const type = normalizeType(item.type);
        if (type) acc.type[type] += 1;

        return acc;
      },
      {
        total: 0,
        views: 0,
        language: { tm: 0, ru: 0, en: 0 },
        type: { local: 0, foreign: 0 }
      }
    );
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const [articlesData, booksData, dissertationsData, viewSummary, usersCount] = await Promise.all([
          fetchAllItems(articleService.getAll),
          fetchAllItems(bookService.getAll),
          fetchAllItems(dissertationService.getAll),
          activityService.getViewSummary().catch(() => null),
          userService.getUsersCount().catch(() => ({ total: 0 }))
        ]);

        const articlesBreakdown = calcBreakdown(articlesData.items);
        const booksBreakdown = calcBreakdown(booksData.items);
        const dissertationsBreakdown = calcBreakdown(dissertationsData.items);

        const viewTotals = viewSummary?.byContentType;
        if (viewTotals?.article) {
          articlesBreakdown.views = viewTotals.article.total ?? articlesBreakdown.views;
        }
        if (viewTotals?.book) {
          booksBreakdown.views = viewTotals.book.total ?? booksBreakdown.views;
        }
        if (viewTotals?.dissertation) {
          dissertationsBreakdown.views = viewTotals.dissertation.total ?? dissertationsBreakdown.views;
        }

        const totalByLanguage = {
          tm: articlesBreakdown.language.tm + booksBreakdown.language.tm + dissertationsBreakdown.language.tm,
          ru: articlesBreakdown.language.ru + booksBreakdown.language.ru + dissertationsBreakdown.language.ru,
          en: articlesBreakdown.language.en + booksBreakdown.language.en + dissertationsBreakdown.language.en
        };

        const totalByType = {
          local: articlesBreakdown.type.local + booksBreakdown.type.local + dissertationsBreakdown.type.local,
          foreign: articlesBreakdown.type.foreign + booksBreakdown.type.foreign + dissertationsBreakdown.type.foreign
        };

        const totalViewsResolved =
          viewSummary?.total ??
          (articlesBreakdown.views + booksBreakdown.views + dissertationsBreakdown.views);
        const trafficAuthenticated = viewSummary?.authenticated ?? 0;
        const trafficAnonymous = viewSummary?.anonymous ?? 0;
        const trafficTotal = viewSummary?.total ?? 0;
        const fallbackAnonymous = totalViewsResolved > 0 && trafficTotal === 0;

        setStats({
          articles: articlesBreakdown,
          books: booksBreakdown,
          dissertations: dissertationsBreakdown,
          totalContent: articlesBreakdown.total + booksBreakdown.total + dissertationsBreakdown.total,
          totalViews: totalViewsResolved,
          totalByLanguage,
          totalByType,
          users: usersCount.total || 0,
          traffic: {
            total: fallbackAnonymous ? totalViewsResolved : trafficTotal,
            authenticated: fallbackAnonymous ? 0 : trafficAuthenticated,
            anonymous: fallbackAnonymous ? totalViewsResolved : trafficAnonymous
          }
        });
      } catch (err) {
        setError('Analitika maglumatlaryny ýüklemek başartmady');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = useMemo(
    () => [
      {
        title: 'Jemi kontent',
        value: stats.totalContent,
        icon: Globe2,
        color: 'from-blue-500 to-blue-600'
      },
      {
        title: 'Makalalar',
        value: stats.articles.total,
        icon: FileText,
        color: 'from-indigo-500 to-indigo-600'
      },
      {
        title: 'Kitaplar',
        value: stats.books.total,
        icon: Book,
        color: 'from-emerald-500 to-emerald-600'
      },
      {
        title: 'Dissertasiýalar',
        value: stats.dissertations.total,
        icon: GraduationCap,
        color: 'from-purple-500 to-purple-600'
      },
      {
        title: 'Jemi serediş',
        value: stats.totalViews,
        icon: Eye,
        color: 'from-orange-500 to-orange-600'
      },
      {
        title: 'Ulanyjylar',
        value: stats.users,
        icon: Users,
        color: 'from-sky-500 to-sky-600'
      }
    ],
    [stats]
  );

  const getPercent = (value: number, total: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  if (loading) {
    return <div className="text-center">Ýüklenýär...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analitika paneli</h1>
          <p className="mt-1 text-sm text-gray-500">Kontentiň ähli görnüşi boýunça ýagdaý</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {formatNumber(card.value)}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}
                >
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Languages className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">Diller boýunça paýlanyş</h2>
          </div>
          {(['tm', 'ru', 'en'] as LanguageKey[]).map((lang) => (
            <div key={lang} className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{lang === 'tm' ? 'Türkmen dili' : lang === 'ru' ? 'Rus dili' : 'Iňlis dili'}</span>
                <span>{formatNumber(stats.totalByLanguage[lang])}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{ width: `${getPercent(stats.totalByLanguage[lang], stats.totalContent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Globe2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900">Ýerli / daşarky kontent</h2>
          </div>
          {(['local', 'foreign'] as TypeKey[]).map((type) => (
            <div key={type} className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{type === 'local' ? 'Ýerli' : 'Daşary ýurt'}</span>
                <span>{formatNumber(stats.totalByType[type])}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${getPercent(stats.totalByType[type], stats.totalContent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="h-5 w-5 text-sky-500" />
            <h2 className="text-lg font-semibold text-gray-900">Giriş statistikasy</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between rounded-xl bg-sky-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-sky-700">
                <ShieldCheck className="h-4 w-4" />
                Girmekli seredişler
              </div>
              <span className="text-sm font-semibold text-sky-900">{formatNumber(stats.traffic.authenticated)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <ShieldOff className="h-4 w-4" />
                Girmesiz seredişler
              </div>
              <span className="text-sm font-semibold text-orange-900">{formatNumber(stats.traffic.anonymous)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Eye className="h-4 w-4" />
                Jemi serediş
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatNumber(stats.traffic.total)}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Seredişler: girişli we girişsiz sessiýalaryň jemi.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Kontent boýunça giňişleýin görkeziji</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            { title: 'Makalalar', data: stats.articles },
            { title: 'Kitaplar', data: stats.books },
            { title: 'Dissertasiýalar', data: stats.dissertations }
          ].map((block) => (
            <div key={block.title} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{block.title}</h3>
                <span className="text-xs text-gray-500">{formatNumber(block.data.total)} kontent</span>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Türkmen dili</span>
                  <span>{formatNumber(block.data.language.tm)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rus dili</span>
                  <span>{formatNumber(block.data.language.ru)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Iňlis dili</span>
                  <span>{formatNumber(block.data.language.en)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span>Ýerli</span>
                  <span>{formatNumber(block.data.type.local)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Daşary ýurt</span>
                  <span>{formatNumber(block.data.type.foreign)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span>Seredişler</span>
                  <span>{formatNumber(block.data.views)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
