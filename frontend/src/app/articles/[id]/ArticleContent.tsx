'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, Bookmark, Star, ArrowLeft } from 'lucide-react';
import { articleService } from '@/services/articleService';
import { savedService, Highlight } from '@/services/savedService';
import { ratingService } from '@/services/ratingService';
import { viewService } from '@/services/viewService';
import { Article } from '@/types';
import SkeletonCard from '@/components/SkeletonCard';
import { PageErrorFallback } from '@/components/ErrorBoundary';

export default function ArticleContent() {
  const params = useParams();
  const router = useRouter();
  const articleId = Number(params.id);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState<{ start: number; end: number; text: string } | null>(null);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<number[]>([]);
  const [rating, setRating] = useState(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reader-font-size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 24) return parsed;
      }
    }
    return 16;
  });

  const ensureAuth = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) { router.push('/login'); return false; }
    return true;
  };

  useEffect(() => {
    const syncToken = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      setAuthToken(token);
    };
    syncToken();
    const handleAuthChange = () => syncToken();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'access_token' || event.key === 'refresh_token') syncToken();
    };
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => { fetchArticle(); }, [articleId]);
  useEffect(() => { if (!Number.isNaN(articleId)) viewService.recordView('article', articleId); }, [articleId]);
  useEffect(() => {
    if (!authToken) { setIsSaved(false); setHighlights([]); setMyRating(null); setRating(0); return; }
    checkIfSaved();
    loadHighlights();
    loadMyRating();
  }, [authToken, articleId]);
  useEffect(() => { localStorage.setItem('reader-font-size', fontSize.toString()); }, [fontSize]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const data = await articleService.getById(articleId);
      setArticle(data);
    } catch (error) {
      console.error('Failed to fetch article:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const checkIfSaved = async () => {
    try { const saved = await savedService.checkIfSaved(articleId); setIsSaved(saved); } catch { /* not authed */ }
  };
  const loadHighlights = async () => {
    try { const data = await savedService.getHighlights(articleId); setHighlights(data); } catch { /* not authed */ }
  };
  const loadMyRating = async () => {
    try {
      const data = await ratingService.getMyRating('article', articleId);
      if (data && typeof data.rating === 'number') { setMyRating(data.rating); setRating(data.rating); }
    } catch { /* not authed or no rating */ }
  };

  const handleSave = async () => {
    try {
      if (!ensureAuth()) return;
      if (isSaved) { await savedService.unsaveArticle(articleId); setIsSaved(false); }
      else { await savedService.saveArticle(articleId); setIsSaved(true); }
    } catch (error) { console.error('Failed to toggle save:', error); }
  };

  const handleTextSelection = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) { window.getSelection()?.removeAllRanges(); setShowColorPicker(false); return; }
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const text = selection.toString();
      const range = selection.getRangeAt(0);
      const contentElement = document.getElementById('article-content');
      if (contentElement && contentElement.contains(range.commonAncestorContainer)) {
        const startOffset = getTextOffset(contentElement, range.startContainer, range.startOffset);
        const endOffset = startOffset + text.length;
        const overlappingHighlights = highlights.filter(
          (h) => h.start_offset < endOffset && h.end_offset > startOffset
        );
        setCurrentHighlight({ start: startOffset, end: endOffset, text });
        setSelectedHighlightIds(overlappingHighlights.map((h) => h.id));
        setShowColorPicker(true);
      }
    }
  };

  const getTextOffset = (root: Node, target: Node, offset: number): number => {
    let textOffset = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode === target) return textOffset + offset;
      textOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }
    return textOffset;
  };

  const handleHighlight = async (color: string) => {
    if (!currentHighlight) return;
    try {
      if (selectedHighlightIds.length > 0) {
        await Promise.all(selectedHighlightIds.map((id) => savedService.updateHighlight(id, { color })));
      } else {
        await savedService.createHighlight({
          article_id: articleId,
          text: currentHighlight.text,
          start_offset: currentHighlight.start,
          end_offset: currentHighlight.end,
          color,
        });
      }
      await loadHighlights();
      setShowColorPicker(false);
      setCurrentHighlight(null);
      setSelectedHighlightIds([]);
      window.getSelection()?.removeAllRanges();
    } catch (error) { console.error('Failed to create highlight:', error); }
  };

  const handleClearHighlight = async () => {
    if (selectedHighlightIds.length === 0) {
      setShowColorPicker(false);
      setCurrentHighlight(null);
      setSelectedHighlightIds([]);
      window.getSelection()?.removeAllRanges();
      return;
    }
    try {
      await Promise.all(selectedHighlightIds.map((id) => savedService.deleteHighlight(id)));
      await loadHighlights();
      setShowColorPicker(false);
      setCurrentHighlight(null);
      setSelectedHighlightIds([]);
      window.getSelection()?.removeAllRanges();
    } catch (error) { console.error('Failed to delete highlight:', error); }
  };

  const handleSubmitRating = async () => {
    if (rating < 1 || rating > 5) return;
    try {
      if (!ensureAuth()) return;
      await ratingService.setRating({ contentType: 'article', contentId: articleId, rating });
      setMyRating(rating);
      setShowRatingDialog(false);
    } catch (error) { console.error('Failed to set rating:', error); }
  };

  const applyHighlights = (content: string) => {
    if (highlights.length === 0) return content;
    const sortedHighlights = [...highlights].sort((a, b) => a.start_offset - b.start_offset);
    let result = '';
    let lastIndex = 0;
    sortedHighlights.forEach((highlight) => {
      if (highlight.start_offset < lastIndex) return;
      result += content.slice(lastIndex, highlight.start_offset);
      const colorClass = { yellow: 'bg-yellow-200', green: 'bg-green-200', blue: 'bg-blue-200', red: 'bg-red-200' }[highlight.color] || 'bg-yellow-200';
      result += `<mark class="${colorClass} px-1 rounded">${content.slice(highlight.start_offset, highlight.end_offset)}</mark>`;
      lastIndex = highlight.end_offset;
    });
    result += content.slice(lastIndex);
    return result;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('tk-TM', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-custom py-8">
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 space-y-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-10 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="flex gap-4 py-4 border-y">
              {[1,2,3].map(i => <div key={i} className="h-4 bg-gray-200 rounded animate-pulse w-24" />)}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) return <PageErrorFallback message="Makala ýüklenende näsazlyk boldy." />;

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Makala tapylmady</h1>
          <button onClick={() => router.push('/')} className="text-primary hover:underline">Baş sahypa</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft size={20} />Yza
        </button>

        <article className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6 pb-6 border-b">
            <div className="font-medium">{article.author}</div>
            {article.authors_workplace && (<><span>|</span><div>{article.authors_workplace}</div></>)}
            {article.publication_date && (<><span>|</span><div>{formatDate(article.publication_date)}</div></>)}
            <span>|</span>
            <div className="flex items-center gap-1"><Eye size={16} />{article.views}</div>
            {article.categories && article.categories.length > 0 && (
              <><span>|</span><div className="text-primary">{article.categories[0].name}</div></>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mb-8 pb-6 border-b">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${isSaved ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />Ýatda sakla
            </button>
            <button
              onClick={() => { if (!ensureAuth()) return; setShowRatingDialog(true); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${myRating ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Star size={18} />Reýting
            </button>
          </div>

          {showColorPicker && currentHighlight && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 z-50">
              <h3 className="text-lg font-semibold mb-4">Reňki saýlaň</h3>
              <div className="flex gap-3">
                {(['yellow','green','blue','red'] as const).map((c) => (
                  <button key={c} onClick={() => handleHighlight(c)} className={`w-12 h-12 bg-${c}-200 rounded-lg hover:scale-110 transition-transform`} />
                ))}
                <button onClick={handleClearHighlight} className="w-12 h-12 rounded-lg border border-gray-300 bg-transparent hover:bg-gray-100 transition-colors" aria-label="Reňksiz" />
              </div>
              <button onClick={() => { setShowColorPicker(false); setCurrentHighlight(null); setSelectedHighlightIds([]); }} className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Ýatyr
              </button>
            </div>
          )}

          {showRatingDialog && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 z-50">
              <h3 className="text-lg font-semibold mb-4">Reýting beriň</h3>
              <div className="flex gap-2 mb-4">
                {[1,2,3,4,5].map((value) => (
                  <button key={value} onClick={() => setRating(value)} className="p-2 rounded-lg hover:bg-gray-100">
                    <Star size={24} className={value <= rating ? 'text-yellow-500' : 'text-gray-300'} />
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleSubmitRating} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">Tassykla</button>
                <button onClick={() => setShowRatingDialog(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Ýatyr</button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <span className="text-sm text-gray-400">Ýazuw ölçegi:</span>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setFontSize(prev => Math.max(12, prev - 2))} disabled={fontSize <= 12} className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-gray-200">A−</button>
              <button onClick={() => setFontSize(16)} className={`px-3 py-2 text-sm font-medium transition-colors ${fontSize === 16 ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}>A</button>
              <button onClick={() => setFontSize(prev => Math.min(24, prev + 2))} disabled={fontSize >= 24} className="px-3 py-2 text-base font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-200">A+</button>
            </div>
          </div>

          <div
            id="article-content"
            className="prose prose-lg max-w-none"
            style={{ fontSize: `${fontSize}px`, textAlign: 'justify', hyphens: 'auto' } as React.CSSProperties}
            onMouseUp={handleTextSelection}
            dangerouslySetInnerHTML={{ __html: applyHighlights(article.content) }}
          />
        </article>
      </div>

      {(showColorPicker || showRatingDialog) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => { setShowColorPicker(false); setShowRatingDialog(false); }} />
      )}
    </div>
  );
}
