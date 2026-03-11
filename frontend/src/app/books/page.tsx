'use client';

import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { bookService } from '@/services/bookService';
import { categoryService } from '@/services/categoryService';
import { ratingService } from '@/services/ratingService';
import { Book, Category } from '@/types';
import BookCard from '@/components/BookCard';

export default function BooksPage() {
  const [latestBooks, setLatestBooks] = useState<Book[]>([]);
  const [mostViewedBooks, setMostViewedBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingLanguageFilter, setPendingLanguageFilter] = useState<'tm' | 'ru' | 'en' | null>(null);
  const [pendingTypeFilter, setPendingTypeFilter] = useState<'local' | 'foreign' | null>(null);
  const [pendingYearFrom, setPendingYearFrom] = useState<number | null>(null);
  const [pendingYearTo, setPendingYearTo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('books');
  const [activeCategoryTab, setActiveCategoryTab] = useState('okuw gollanmalary');
  const [showFilters, setShowFilters] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<'tm' | 'ru' | 'en' | null>(null);
  const [typeFilter, setTypeFilter] = useState<'local' | 'foreign' | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, languageFilter]);

  const attachRatings = async (items: Book[]) => {
    const stats = await Promise.all(
      items.map((item) => ratingService.getStats('book', item.id).catch(() => null))
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

  const fetchData = async (searchQuery?: string) => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (selectedCategory) filters.category_id = selectedCategory;
      if (languageFilter) filters.language = languageFilter;
      if (searchQuery?.trim()) filters.search = searchQuery.trim();

      const [data, categoriesData] = await Promise.all([
        bookService.getLatest(28, filters),
        categoryService.getBookCategories(),
      ]);

      const allWithRatings = await attachRatings(data);
      setLatestBooks(allWithRatings.slice(0, 14));
      setMostViewedBooks([...allWithRatings].sort((a, b) => b.views - a.views).slice(0, 14));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(search);
  };  const openFilters = () => {
    setPendingLanguageFilter(languageFilter);
    setPendingTypeFilter(typeFilter);
    setPendingYearFrom(yearFrom);
    setPendingYearTo(yearTo);
    setShowFilters(true);
  };

  const normalizeLanguage = (value?: string) => (value || '').toLowerCase();

  const matchesLanguage = (item: Book) => {
    if (!languageFilter) return true;
    const lang = normalizeLanguage(item.language);
    if (languageFilter === 'tm') return lang === 'tm' || lang.includes('turkmen') || lang.includes('türkmen') || lang === 'tk';
    if (languageFilter === 'ru') return lang === 'ru' || lang.includes('rus');
    return lang === 'en' || lang.includes('eng') || lang.includes('ing');
  };

  const matchesType = (item: Book) => {
    if (!typeFilter) return true;
    const type = (item.type || '').toLowerCase();
    if (typeFilter === 'local') return type.includes('local') || type.includes('ýerli') || type.includes('yerli');
    return type.includes('foreign') || type.includes('daşary') || type.includes('dasary');
  };

  const matchesYearRange = (item: Book) => {
    if (!yearFrom && !yearTo) return true;
    if (!item.publication_date) return false;
    const year = new Date(item.publication_date).getFullYear();
    if (yearFrom && year < yearFrom) return false;
    if (yearTo && year > yearTo) return false;
    return true;
  };

  const matchesSearch = (item: Book) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return item.title?.toLowerCase().includes(q) || item.author?.toLowerCase().includes(q);
  };

  const matchesCategory = (item: Book) => {
    if (!selectedCategory) return true;
    return item.categories?.some((cat) => cat.id === selectedCategory);
  };

  const applyFilters = (items: Book[]) =>
    items.filter(
      (item) =>
        matchesSearch(item) &&
        matchesCategory(item) &&
        matchesLanguage(item) &&
        matchesType(item) &&
        matchesYearRange(item)
    );

  const filteredLatestBooks = applyFilters(latestBooks);
  const filteredMostViewedBooks = applyFilters(mostViewedBooks);

  const getActiveCategories = () => {
    const parentCategory = categories.find(cat => 
      !cat.parent_id && cat.name.toLowerCase() === activeCategoryTab.toLowerCase()
    );
    
    if (!parentCategory) {
      return categories.filter(cat => !cat.parent_id);
    }
    
    return categories.filter(cat => cat.parent_id === parentCategory.id);
  };

  const activeCategories = getActiveCategories();

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
          <Link href="/dissertations">
            <button className="px-6 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              Dissertasiýalar
            </button>
          </Link>
          <button
            onClick={() => setActiveTab('books')}
            className="px-6 py-2 rounded-full text-sm font-medium bg-white border-2 border-gray-900 text-gray-900 transition-colors"
          >
            Kitaplar
          </button>
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
              onClick={openFilters}
            >
              <SlidersHorizontal size={20} className="text-gray-600" />
            </button>
          </form>
        </div>

        {/* Category Type Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => {
                setActiveCategoryTab('okuw gollanmalary');
                setSelectedCategory(null);
              }}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeCategoryTab === 'okuw gollanmalary'
                  ? 'text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Okuw gollanmalary
            </button>
            <button
              onClick={() => {
                setActiveCategoryTab('başga kitaplar');
                setSelectedCategory(null);
              }}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeCategoryTab === 'başga kitaplar'
                  ? 'text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Başga kitaplar
            </button>
          </div>
        </div>

        {/* Subcategories Section */}
        <div className="mb-12">
          {selectedCategory !== null && (
            <div className="mb-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-red-500 hover:text-red-700 border border-red-300 hover:border-red-500 px-3 py-0.5 rounded-full transition-colors"
              >
                Ýatyrmak
              </button>
            </div>
          )}
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
                          onClick={() => setSelectedCategory(category.id)}
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
                  {/* <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDU</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TMDDI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">HS we TU</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">HYY we ÖU</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TMK</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDLU</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TITU</button> */}
                </div>
                <div className="space-y-2">
                  {/* <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TOHU</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDMI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDB we SI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDBGI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDMal</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDMI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TT we II</button> */}
                </div>
                <div className="space-y-2">
                  {/* <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDY we DI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TOHI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDMHGI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDÇA</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TDEI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">TIT we UKI</button>
                  <button className="block w-full text-left text-gray-900 hover:text-primary transition-colors text-base">HNGU</button> */}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Latest Books Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Soňky goşulanlar</h2>
            <button className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-primary"></div>
            </div>
          ) : filteredLatestBooks.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              Hiç zat tapylmady
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
              {filteredLatestBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>

        {/* Most Viewed Books Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Köp okalanlar</h2>
            <button className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-primary"></div>
            </div>
          ) : filteredMostViewedBooks.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              Hiç zat tapylmady
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
              {filteredMostViewedBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
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
                    { label: 'Ýerli kitaplar', value: 'local' as const },
                    { label: 'Daşary ýurt kitaplar', value: 'foreign' as const },
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
                  Göýbolsun et
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
