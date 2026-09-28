import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Search,
  BookOpen,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usersApi } from '../services/api';
import { ResourceCard } from '../components/resources/ResourceCard';
import type { ResourceListItem, ResourceType } from '../types';

export const BookmarksView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [savedItems, setSavedItems] = useState<ResourceListItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ResourceListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client-side filtering within saved bookmarks
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<ResourceType | ''>('');

  const loadBookmarks = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await usersApi.getBookmarks(user.id, 1, 100);
      const rawList = data?.items || [];
      const items = rawList.map((b) => ({
        ...b.resource,
        is_bookmarked: true,
      }));
      setSavedItems(items);
      setFilteredItems(items);
      setTotalCount(data?.total ?? rawList.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve saved bookmarks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, [user?.id]);

  // Apply filters
  useEffect(() => {
    let result = [...savedItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.breadcrumbs &&
            (item.breadcrumbs.subject.code.toLowerCase().includes(q) ||
              item.breadcrumbs.subject.name.toLowerCase().includes(q)))
      );
    }

    if (selectedSemester !== '') {
      result = result.filter((item) => item.semester === selectedSemester);
    }

    if (selectedType !== '') {
      result = result.filter((item) => item.type === selectedType);
    }

    setFilteredItems(result);
  }, [searchQuery, selectedSemester, selectedType, savedItems]);

  // Handle bookmark removal from card
  const handleBookmarkToggle = (resourceId: number, isBookmarked: boolean) => {
    if (!isBookmarked) {
      setSavedItems((prev) => prev.filter((item) => item.id !== resourceId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      showToast('Resource removed from your saved bookmarks.', 'info');
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ width: '220px', height: '24px', backgroundColor: 'var(--bg-muted)', borderRadius: '4px', marginBottom: '16px' }} />
        <div style={{ height: '44px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ height: '80px', backgroundColor: 'var(--bg-subdued)', borderRadius: 'var(--radius-sm)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '18px', marginBottom: '24px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--accent-core)',
            fontWeight: 700,
            letterSpacing: '0.05em',
            marginBottom: '4px',
            textTransform: 'uppercase',
          }}
        >
          Revision Desk // Personal Library
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Saved Study Resources
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Instant offline-friendly access to your bookmarked notes, exam question banks, and lab manuals.
            </p>
          </div>

          <div
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {totalCount} {totalCount === 1 ? 'RESOURCE' : 'RESOURCES'} SAVED
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--status-danger)',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadBookmarks}
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--status-danger)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      {savedItems.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search your saved library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px', height: '36px' }}
            />
          </div>

          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value === '' ? '' : Number(e.target.value))}
            style={{ height: '36px', minWidth: '130px' }}
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ResourceType | '')}
            style={{ height: '36px', minWidth: '140px' }}
          >
            <option value="">All Types</option>
            <option value="notes">Lecture Notes</option>
            <option value="pdf">Reference PDF</option>
            <option value="paper">Exam PYQ</option>
            <option value="question_bank">Question Bank</option>
            <option value="lab_record">Lab Manual</option>
            <option value="link">External Link</option>
          </select>

          {(searchQuery || selectedSemester !== '' || selectedType !== '') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSemester('');
                setSelectedType('');
              }}
              style={{
                fontSize: '12px',
                color: 'var(--accent-core)',
                fontWeight: 600,
                padding: '6px 10px',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Bookmarks List */}
      {filteredItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredItems.map((res, idx) => (
            <div
              key={res.id}
              className="stagger-item"
              style={{ '--stagger-i': Math.min(idx, 8) } as React.CSSProperties}
            >
              <ResourceCard
                resource={res}
                onBookmarkChange={handleBookmarkToggle}
              />
            </div>
          ))}
        </div>
      ) : savedItems.length > 0 ? (
        /* No items matching filter */
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <Filter size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No saved resources match your filter</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Try resetting your search query or semester selection.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSemester('');
              setSelectedType('');
            }}
            className="daq-btn-primary"
          >
            Clear Filters
          </button>
        </div>
      ) : !error ? (
        /* Empty Library */
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '64px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-tint)',
              color: 'var(--accent-core)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Bookmark size={26} />
          </div>

          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
            Your revision desk is empty
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Bookmark syllabus units, formula sheets, or midterm PYQs while browsing to assemble your personalized exam study pack.
          </p>
          <Link
            to="/"
            className="daq-btn-primary"
            style={{
              padding: '10px 24px',
              fontSize: '13.5px',
            }}
          >
            <BookOpen size={16} /> Browse Course Catalog <ArrowRight size={15} />
          </Link>
        </div>
      ) : null}
    </div>
  );
};
