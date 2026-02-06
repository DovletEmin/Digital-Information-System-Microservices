'use client';

import { useEffect, useState } from 'react';
import { Search, Eye, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { articleService } from '@/services/articleService';
import { categoryService } from '@/services/categoryService';
import { ratingService } from '@/services/ratingService';
import { Article, Category } from '@/types';
import ArticleCard from '@/components/ArticleCard';

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
  const [languageFilter, setLanguageFilter] = useState<'tk' | 'ru' | 'en' | null>(null);
  const [typeFilter, setTypeFilter] = useState<'local' | 'foreign' | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [page, selectedCategory]);

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
      const [articlesData, categoriesData] = await Promise.all([
        articleService.getAll(page, 10, selectedCategory ? { category_id: selectedCategory } : undefined),
        categoryService.getArticleCategories(),
      ]);

      const itemsWithRatings = await attachRatings(articlesData.items);
      setArticles(itemsWithRatings);
      setTotalPages(articlesData.pages);
      setCategories(categoriesData);
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
      const data = await articleService.getAll(1, 10, { search, category_id: selectedCategory || undefined });
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

  const normalizeLanguage = (value?: string) => (value || '').toLowerCase();

  const matchesLanguage = (item: Article) => {
    if (!languageFilter) return true;
    const lang = normalizeLanguage(item.language);
    if (languageFilter === 'tk') return lang.includes('tk') || lang.includes('turkmen');
    if (languageFilter === 'ru') return lang.includes('ru') || lang.includes('rus');
    return lang.includes('en') || lang.includes('ing');
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
    <div className="bg-background min-h-screen">
      <div className="container-custom py-8">
        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab('makalalar')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'makalalar'
                ? 'bg-white border-2 border-gray-900 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-base"
              />
            </div>
            <button
              type="button"
              className="p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Filters"
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal size={20} className="text-gray-600" />
            </button>
          </form>
        </div>

        {/* Categories Section */}
        <div className="mb-10">
          <h2 className="text-sm text-gray-500 mb-4">Ýlmyň pudagy</h2>
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

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-primary"></div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              Hiç zat tapylmady
            </div>
          ) : (
            <div className="space-y-10">
              {filteredArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-10">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Öňki
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Sahypa {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Indiki
              </button>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Dili:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Türkmen dilinde', value: 'tk' as const },
                    { label: 'Rus dilinde', value: 'ru' as const },
                    { label: 'Iňlis dilinde', value: 'en' as const },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setLanguageFilter(languageFilter === item.value ? null : item.value)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        languageFilter === item.value
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
                      onClick={() => setTypeFilter(typeFilter === item.value ? null : item.value)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        typeFilter === item.value
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
                    value={yearFrom ?? ''}
                    onChange={(e) => setYearFrom(e.target.value ? Number(e.target.value) : null)}
                    className="w-24 px-3 py-2 rounded-full border border-gray-300 text-sm"
                  />
                  <span>-dan</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="< 2010"
                    value={yearTo ?? ''}
                    onChange={(e) => setYearTo(e.target.value ? Number(e.target.value) : null)}
                    className="w-24 px-3 py-2 rounded-full border border-gray-300 text-sm"
                  />
                  <span>-çenli</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <button
                onClick={() => {
                  setLanguageFilter(null);
                  setTypeFilter(null);
                  setYearFrom(null);
                  setYearTo(null);
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
                  onClick={() => setShowFilters(false)}
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
