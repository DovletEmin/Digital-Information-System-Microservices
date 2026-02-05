'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, SlidersHorizontal, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { dissertationService } from '@/services/dissertationService';
import { categoryService } from '@/services/categoryService';
import { ratingService } from '@/services/ratingService';
import { savedService } from '@/services/savedService';
import { Dissertation, Category } from '@/types';

export default function DissertationsPage() {
  const router = useRouter();
  const [dissertations, setDissertations] = useState<Dissertation[]>([]);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('dissertations');
  const [activeCategoryTab, setActiveCategoryTab] = useState('Awtoreferatlar');
  const [showFilters, setShowFilters] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<'tk' | 'ru' | 'en' | null>(null);
  const [typeFilter, setTypeFilter] = useState<'local' | 'foreign' | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [page, selectedCategory]);

  useEffect(() => {
    const syncToken = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      setAuthToken(token);
    };

    syncToken();

    const handleAuthChange = () => syncToken();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'access_token' || event.key === 'refresh_token') {
        syncToken();
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!authToken || dissertations.length === 0) {
      setSavedIds(new Set());
      return;
    }

    Promise.all(dissertations.map((item) => savedService.checkIfDissertationSaved(item.id).catch(() => false)))
      .then((results) => {
        const next = new Set<number>();
        results.forEach((isSaved, index) => {
          if (isSaved) next.add(dissertations[index].id);
        });
        setSavedIds(next);
      })
      .catch(() => {
        setSavedIds(new Set());
      });
  }, [dissertations, authToken]);

  const attachRatings = async (items: Dissertation[]) => {
    const stats = await Promise.all(
      items.map((item) => ratingService.getStats('dissertation', item.id).catch(() => null))
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
      const [dissertationsData, categoriesData] = await Promise.all([
        dissertationService.getAll(page, 10, selectedCategory ? { category_id: selectedCategory } : {}),
        categoryService.getDissertationCategories(),
      ]);

      const itemsWithRatings = await attachRatings(dissertationsData.items);
      setDissertations(itemsWithRatings);
      setTotalPages(dissertationsData.pages);
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
      const data = await dissertationService.getAll(1, 10, { search, category_id: selectedCategory || undefined });
      const itemsWithRatings = await attachRatings(data.items);
      setDissertations(itemsWithRatings);
      setPage(1);
      setTotalPages(data.pages);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveCategories = () => {
    const parentCategory = categories.find(cat => 
      !cat.parent_id && cat.name.toLowerCase() === activeCategoryTab.toLowerCase()
    );
    
    if (!parentCategory) {
      return [];
    }
    
    return categories.filter(cat => cat.parent_id === parentCategory.id);
  };

  const activeCategories = getActiveCategories();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tk-TM', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const normalizeLanguage = (value?: string) => (value || '').toLowerCase();

  const matchesLanguage = (item: Dissertation) => {
    if (!languageFilter) return true;
    const lang = normalizeLanguage(item.language);
    if (languageFilter === 'tk') return lang.includes('tk') || lang.includes('turkmen');
    if (languageFilter === 'ru') return lang.includes('ru') || lang.includes('rus');
    return lang.includes('en') || lang.includes('ing');
  };

  const matchesType = (item: Dissertation) => {
    if (!typeFilter) return true;
    const type = (item.type || '').toLowerCase();
    if (typeFilter === 'local') return type.includes('local') || type.includes('ýerli') || type.includes('yerli');
    return type.includes('foreign') || type.includes('daşary') || type.includes('dasary');
  };

  const matchesYearRange = (item: Dissertation) => {
    if (!yearFrom && !yearTo) return true;
    if (!item.publication_date) return false;
    const year = new Date(item.publication_date).getFullYear();
    if (yearFrom && year < yearFrom) return false;
    if (yearTo && year > yearTo) return false;
    return true;
  };

  const filteredDissertations = dissertations.filter(
    (item) => matchesLanguage(item) && matchesType(item) && matchesYearRange(item)
  );

  const handleSaveToggle = async (id: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      if (savedIds.has(id)) {
        await savedService.unsaveDissertation(id);
        const next = new Set(savedIds);
        next.delete(id);
        setSavedIds(next);
      } else {
        await savedService.saveDissertation(id);
        const next = new Set(savedIds);
        next.add(id);
        setSavedIds(next);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container-custom py-8">
        {/* Main Navigation Tabs */}
        <div className="flex justify-center gap-3 mb-8">
          <Link href="/">
            <button className="px-6 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              Makalalar
            </button>
          </Link>
          <button
            onClick={() => setActiveTab('dissertations')}
            className="px-6 py-2 rounded-full text-sm font-medium bg-white border-2 border-gray-900 text-gray-900 transition-colors"
          >
            Dissertasiýalar
          </button>
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

        {/* Category Type Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveCategoryTab('Awtoreferatlar')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeCategoryTab === 'Awtoreferatlar'
                  ? 'text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Awtoreferatlar
            </button>
            <button
              onClick={() => setActiveCategoryTab('Dissertasiyalar')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeCategoryTab === 'Dissertasiyalar'
                  ? 'text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dissertasiýalar
            </button>
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeCategories && activeCategories.length > 0 ? (
              <>
                {[0, 1, 2].map((colIndex) => {
                  const itemsPerColumn = Math.ceil(activeCategories.length / 3);
                  const columnCategories = activeCategories.slice(
                    colIndex * itemsPerColumn, 
                    (colIndex + 1) * itemsPerColumn
                  );
                  
                  if (columnCategories.length === 0) return null;
                  
                  return (
                    <div key={colIndex} className="space-y-2">
                      {columnCategories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setPage(1);
                          }}
                          className={`block w-full text-left text-base transition-colors ${
                            selectedCategory === category.id
                              ? 'text-primary font-medium'
                              : 'text-gray-900 hover:text-primary'
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Fizika-Matematika</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Himiýa</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Biologiýa</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Tehnika</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Oba-hojalyk</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Taryh we arheologiýa</button>
                </div>
                <div className="space-y-2">
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Ykdysadyýet</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Filosofiýa</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Filologiýa</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Hukuk</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Pedagogika</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Lukmançylyk</button>
                </div>
                <div className="space-y-2">
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Sungaty öwreniş</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Psihologiýa</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Sosiologiýa</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Syýasýýet</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Medeniýeti öwreniş</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">Ýer baradaky ylymlar</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dissertations Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Iň köp okalanlar</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-primary"></div>
            </div>
          ) : filteredDissertations.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              Hiç zat tapylmady
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDissertations.map((dissertation) => (
                <article key={dissertation.id} className="mt-0 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6 lg:p-7">
                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-4">
                      <span className="text-gray-900 font-medium">{dissertation.author}</span>
                      <span>•</span>
                      <span className="inline-flex items-center text-primary">
                        {dissertation.authors_workplace || 'Turkmenistanyň Ylymlar akademiýasynyň Ýazuw institutynyň mugallymy'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4 leading-snug line-clamp-2 pb-1">
                      <Link href={`/dissertations/${dissertation.id}`} className="hover:text-primary transition-colors">
                        {dissertation.title}
                      </Link>
                    </h3>

                    {/* Excerpt */}
                    <p className="text-base text-gray-600 mb-6 line-clamp-2 leading-relaxed">
                      {truncateText(dissertation.content, 220)}
                    </p>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {dissertation.publication_date && (
                          <span>{formatDate(dissertation.publication_date)}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye size={16} />
                          {dissertation.views}
                        </span>
                        <span className="flex items-center gap-1">
                          ⭐ {dissertation.average_rating.toFixed(1)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleSaveToggle(dissertation.id)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          savedIds.has(dissertation.id)
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <Bookmark size={16} />
                        Ýatda sakla
                      </button>
                    </div>
                  </div>
                </article>
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
                    { label: 'Ýerli dissertasiýalar', value: 'local' as const },
                    { label: 'Daşary ýurt dissertasiýalar', value: 'foreign' as const },
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
