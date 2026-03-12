'use client';

import { useEffect, useState } from 'react';
import { Search, Eye, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { articleService } from '@/services/articleService';
import { categoryService } from '@/services/categoryService';
import { ratingService } from '@/services/ratingService';
import { savedService } from '@/services/savedService';
import { Article, Category } from '@/types';
import ArticleCard from '@/components/ArticleCard';
import SkeletonCard from '@/components/SkeletonCard';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('makalalar');
  const [showFilters, setShowFilters] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<'tm' | 'ru' | 'en' | null>(null);
  const [typeFilter, setTypeFilter] = useState<'local' | 'foreign' | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);
  const [pendingLanguageFilter, setPendingLanguageFilter] = useState<'tm' | 'ru' | 'en' | null>(null);
  const [pendingTypeFilter, setPendingTypeFilter] = useState<'local' | 'foreign' | null>(null);
  const [pendingYearFrom, setPendingYearFrom] = useState<number | null>(null);
  const [pendingYearTo, setPendingYearTo] = useState<number | null>(null);
  const [savedArticleIds, setSavedArticleIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchData();
  }, [page, selectedCategory, languageFilter]);

  const attachRatings = async (items: Article[]) => {
    const stats = await Promise.all(
      items.map((item) => ratingService.getStats('article', item.id).catch(() => null))
    );

    return items.map((item, index) => {
      const stat = stats[index];
      if (!stat) return item;
      return {
        ...item,
        average_rating: typeof stat.average === 'number' ? stat.average : item.average_rating,
        rating_count: typeof stat.count === 'number' ? stat.count : item.rating_count,
      };
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const articleFilters: Parameters<typeof articleService.getAll>[2] = { sort: 'views_desc' };
      if (selectedCategory) articleFilters.category_id = selectedCategory;
      if (languageFilter) articleFilters.language = languageFilter;

      const [articlesData, categoriesData] = await Promise.all([
        articleService.getAll(page, 10, articleFilters),
        categoryService.getArticleCategories(),
      ]);

      const itemsWithRatings = await attachRatings(articlesData.items);
      setArticles(itemsWithRatings);
      setTotalPages(articlesData.pages);
      setCategories(categoriesData);

      // Batch-fetch saved IDs in one request instead of N per-card calls
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token) {
        try {
          const savedData = await savedService.getSavedArticles(1, 200);
          setSavedArticleIds(new Set(savedData.items.map((a: { id: number }) => a.id)));
        } catch {
          setSavedArticleIds(new Set());
        }
      } else {
        setSavedArticleIds(new Set());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const filters: Parameters<typeof articleService.getAll>[2] = { search };
      if (selectedCategory) filters.category_id = selectedCategory;
      if (languageFilter) filters.language = languageFilter;
      const data = await articleService.getAll(1, 10, filters);
      const itemsWithRatings = await attachRatings(data.items);
      setArticles(itemsWithRatings);
      setPage(1);
      setTotalPages(data.pages);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFilters = () => {
    setPendingLanguageFilter(languageFilter);
    setPendingTypeFilter(typeFilter);
    setPendingYearFrom(yearFrom);
    setPendingYearTo(yearTo);
    setShowFilters(true);
  };

  const normalizeLanguage = (value?: string) => (value || '').toLowerCase();

  const matchesLanguage = (item: Article) => {
    if (!languageFilter) return true;
    const lang = normalizeLanguage(item.language);
    if (languageFilter === 'tm') return lang === 'tm' || lang.includes('turkmen') || lang.includes('türkmen') || lang === 'tk';
    if (languageFilter === 'ru') return lang === 'ru' || lang.includes('rus');
    return lang === 'en' || lang.includes('eng') || lang.includes('ing');
  };

  const matchesType = (item: Article) => {
    if (!typeFilter) return true;
    const type = (item.type || '').toLowerCase();
    if (typeFilter === 'local') return type.includes('local') || type.includes('ýerli') || type.includes('yerli');
    return type.includes('foreign') || type.includes('daşary') || type.includes('dasary');
  };

  const matchesYearRange = (item: Article) => {
    if (!yearFrom && !yearTo) return true;
    if (!item.publication_date) return false;
    const year = new Date(item.publication_date).getFullYear();
    if (yearFrom && year < yearFrom) return false;
    if (yearTo && year > yearTo) return false;
    return true;
  };

  const filteredArticles = articles.filter(
    (item) => matchesLanguage(item) && matchesType(item) && matchesYearRange(item)
  );

  return (
    <div className="bg-background dark:bg-gray-950 min-h-screen">
      <div className="container-custom py-8">
        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab('makalalar')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'makalalar'
                ? 'bg-white dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-400 text-gray-900 dark:text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Makalalar
          </button>
          <Link href="/dissertations">
            <button className="px-6 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              Dissertasiýalar
            </button>
          </Link>
          <Link href="/books">
            <button className="px-6 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              Kitaplar
            </button>
          </Link>
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
            Sizi gyzyklandyrýan temalary tapyň
          </h1>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Gözleg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-base"
              />
            </div>
            <button
              type="button"
              className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="Filters"
              onClick={openFilters}
            >
              <SlidersHorizontal size={20} className="text-gray-600" />
            </button>
          </form>
        </div>

        {/* Categories Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm text-gray-500">Ýlmyň pudagy</h2>
            {selectedCategory !== null && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-red-500 hover:text-red-700 border border-red-300 hover:border-red-500 px-3 py-0.5 rounded-full transition-colors"
              >
                Ýatyrmak
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.length > 0 ? (
              <>
                {[0, 1, 2, 3].map((colIndex) => (
                  <div key={colIndex} className="space-y-2">
                    {categories
                      .slice(colIndex * Math.ceil(categories.length / 4), (colIndex + 1) * Math.ceil(categories.length / 4))
                      .map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`block w-full text-left text-base transition-colors ${
                            selectedCategory === category.id
                              ? 'text-primary font-medium'
                              : 'text-gray-700 hover:text-primary'
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {/* <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Taryh</button>
                  <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Filologiýa</button>
                  <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Filosofiýa</button> */}
                </div>
                <div className="space-y-2">
                  {/* <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Ykdysadyýet</button>
                  <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Oba hojalyk</button>
                  <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Weterinariya</button> */}
                </div>
                <div className="space-y-2">
                  {/* <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Himiýa</button>
                  <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Biologiýa</button>
                  <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Geologiýa</button> */}
                </div>
                <div className="space-y-2">
                  {/* <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Geografiýa</button>
                  <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Pedagogika</button>
                  <button className="block w-full text-left text-gray-700 hover:text-primary transition-colors text-base">Psihologiýa</button> */}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Articles Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Iň köp okalanlar</h2>
          </div>

          <ErrorBoundary>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <EmptyState
                title="Hiç zat tapylmady"
                description="Başga gözleg sözlerini ýa-da filtrleri synap görüň."
              />
            ) : (
              <div className="space-y-10">
                {filteredArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    isSaved={savedArticleIds.has(article.id)}
                    onSaveToggle={(newState) => {
                      setSavedArticleIds((prev) => {
                        const next = new Set(prev);
                        if (newState) next.add(article.id);
                        else next.delete(article.id);
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </ErrorBoundary>
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-xl p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Dili:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Türkmen dilinde', value: 'tm' as const },
                    { label: 'Rus dilinde', value: 'ru' as const },
                    { label: 'Iňlis dilinde', value: 'en' as const },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setPendingLanguageFilter(pendingLanguageFilter === item.value ? null : item.value)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        pendingLanguageFilter === item.value
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Görnüşi:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Ýerli makalalar', value: 'local' as const },
                    { label: 'Daşary ýurt makalalar', value: 'foreign' as const },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setPendingTypeFilter(pendingTypeFilter === item.value ? null : item.value)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        pendingTypeFilter === item.value
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Çap edilen senesi:</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="< 2000"
                    value={pendingYearFrom ?? ''}
                    onChange={(e) => setPendingYearFrom(e.target.value ? Number(e.target.value) : null)}
                    className="w-24 px-3 py-2 rounded-full border border-gray-300 text-sm"
                  />
                  <span>-dan</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="< 2010"
                    value={pendingYearTo ?? ''}
                    onChange={(e) => setPendingYearTo(e.target.value ? Number(e.target.value) : null)}
                    className="w-24 px-3 py-2 rounded-full border border-gray-300 text-sm"
                  />
                  <span>-çenli</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <button
                onClick={() => {
                  setPendingLanguageFilter(null);
                  setPendingTypeFilter(null);
                  setPendingYearFrom(null);
                  setPendingYearTo(null);
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Filterleri arassala
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Goýbolsun et
                </button>
                <button
                  onClick={() => {
                    setLanguageFilter(pendingLanguageFilter);
                    setTypeFilter(pendingTypeFilter);
                    setYearFrom(pendingYearFrom);
                    setYearTo(pendingYearTo);
                    setShowFilters(false);
                  }}
                  className="px-4 py-2 text-sm rounded-full bg-gray-900 text-white hover:bg-gray-800"
                >
                  Ýatda sakla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
