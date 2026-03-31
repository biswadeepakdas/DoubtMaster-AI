'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sun, Moon, ArrowLeft, Bookmark, BookMarked, FolderPlus,
  Trash2, MoveRight, Plus, Search, Filter, RefreshCw,
  ChevronDown, Edit2, X, CheckCircle, BookOpen,
  Calculator, Atom, FlaskConical, Dna
} from 'lucide-react';
import api from '../../lib/api';

const subjectIcons = {
  Mathematics: Calculator, Physics: Atom, Chemistry: FlaskConical, Biology: Dna,
};
const subjectColors = {
  Mathematics: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-300',
  Physics: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300',
  Chemistry: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300',
  Biology: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-300',
};

export default function BookmarksPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeCollection, setActiveCollection] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [newCollDesc, setNewCollDesc] = useState('');
  const [newCollColor, setNewCollColor] = useState('#6366f1');

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

  const fetchCollections = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/bookmarks/collections');
      setCollections(res.collections || []);
    } catch (err) { /* ignore */ }
  }, []);

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let path = '/api/v1/bookmarks?limit=50';
      if (activeCollection) path += `&collection_id=${activeCollection}`;
      if (subjectFilter) path += `&subject=${subjectFilter}`;
      const res = await api.get(path);
      setBookmarks(res.bookmarks || []);
      setTotal(res.total || 0);
    } catch (err) {
      if (err?.status !== 401) setError(err?.message || 'Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  }, [activeCollection, subjectFilter]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dm-token');
      if (!token) { router.replace('/login'); return; }
      const savedDark = localStorage.getItem('dm-dark');
      if (savedDark === 'true') setDarkMode(true);
      fetchCollections();
      fetchBookmarks();
    }
  }, [router, fetchCollections, fetchBookmarks]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    if (typeof window !== 'undefined') localStorage.setItem('dm-dark', String(darkMode));
  }, [darkMode]);

  const handleCreateCollection = async () => {
    if (!newCollName.trim()) return;
    try {
      await api.post('/api/v1/bookmarks/collections', {
        name: newCollName.trim(),
        description: newCollDesc.trim(),
        color: newCollColor,
      });
      setShowNewCollection(false);
      setNewCollName('');
      setNewCollDesc('');
      fetchCollections();
    } catch (err) {
      alert(err?.message || 'Failed to create collection');
    }
  };

  const handleDeleteBookmark = async (questionId) => {
    if (!confirm('Remove this bookmark?')) return;
    try {
      await api.delete(`/api/v1/bookmarks/${questionId}`);
      fetchBookmarks();
    } catch (err) {
      alert(err?.message || 'Failed to remove bookmark');
    }
  };

  const handleDeleteCollection = async (collId) => {
    if (!confirm('Delete this collection? Bookmarks will be moved to Saved Questions.')) return;
    try {
      await api.delete(`/api/v1/bookmarks/collections/${collId}`);
      if (activeCollection === collId) setActiveCollection(null);
      fetchCollections();
      fetchBookmarks();
    } catch (err) {
      alert(err?.message || 'Failed to delete collection');
    }
  };

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(b =>
        b.questionText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.topic?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bookmarks;

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" /> <span className="font-medium">Dashboard</span>
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-500" /> Bookmarks
          </h1>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Collections sidebar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Collections</h2>
            <button onClick={() => setShowNewCollection(!showNewCollection)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-500">
              {showNewCollection ? <X className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            </button>
          </div>

          {showNewCollection && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
              <input type="text" placeholder="Collection name" value={newCollName}
                onChange={e => setNewCollName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
              <input type="text" placeholder="Description (optional)" value={newCollDesc}
                onChange={e => setNewCollDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-500">Color:</span>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewCollColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${newCollColor === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={handleCreateCollection}
                className="w-full py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600">
                Create Collection
              </button>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCollection(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !activeCollection
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All ({total})
            </button>
            {collections.map(coll => (
              <div key={coll.id} className="flex-shrink-0 flex items-center gap-1">
                <button
                  onClick={() => setActiveCollection(activeCollection === coll.id ? null : coll.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    activeCollection === coll.id
                      ? 'text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  style={activeCollection === coll.id ? { backgroundColor: coll.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: coll.color }} />
                  {coll.name} ({coll.bookmarkCount})
                </button>
                {!coll.isDefault && (
                  <button onClick={() => handleDeleteCollection(coll.id)}
                    className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search bookmarks..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
          </div>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <option value="">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
          </select>
        </div>

        {/* Bookmark list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="text-center py-16">
            <BookMarked className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
            <h3 className="text-lg font-bold mb-2">No bookmarks yet</h3>
            <p className="text-gray-500 text-sm">
              Bookmark questions from your dashboard to review them later.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookmarks.map(bm => {
              const SubjIcon = subjectIcons[bm.subject] || BookOpen;
              const subjClass = subjectColors[bm.subject] || 'text-gray-600 bg-gray-50 dark:bg-gray-800';
              return (
                <div key={bm.bookmarkId}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${subjClass}`}>
                      <SubjIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-relaxed line-clamp-2">{bm.questionText}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                          {bm.subject}
                        </span>
                        {bm.topic && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                            {bm.topic}
                          </span>
                        )}
                        {bm.difficulty && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            bm.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' :
                            bm.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' :
                            'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600'
                          }`}>
                            {bm.difficulty}
                          </span>
                        )}
                      </div>
                      {bm.finalAnswer && (
                        <p className="text-xs text-gray-500 mt-2 truncate">
                          Answer: {bm.finalAnswer}
                        </p>
                      )}
                      {bm.note && (
                        <p className="text-xs text-indigo-500 mt-1 italic">Note: {bm.note}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => router.push(`/questions/${bm.questionId}`)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-500"
                        title="View solution">
                        <BookOpen className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteBookmark(bm.questionId)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500"
                        title="Remove bookmark">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {bm.collection && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bm.collection.color || '#6366f1' }} />
                      <span className="text-[10px] text-gray-400">{bm.collection.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
