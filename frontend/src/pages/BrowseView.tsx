import React, { useEffect, useState, useCallback, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  X,
  ChevronLeft,
} from 'lucide-react';
import type {
  ResourceFilterParams,
  ResourceListItem,
  SubjectItem,
  ResourceType,
  SortByOption,
} from '../types';
import { resourcesApi, taxonomyApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ResourceFilterBar } from '../components/resources/ResourceFilterBar';
import { ResourceCard } from '../components/resources/ResourceCard';
import { ResourceSkeletonList } from '../components/resources/ResourceSkeletonList';
import { ResourceEmptyState } from '../components/resources/ResourceEmptyState';
import { MostUsefulModule } from '../components/resources/MostUsefulModule';

export const BrowseView: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [, startTransition] = useTransition();

  // State
  const [resources, setResources] = useState<ResourceListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [viewMode, setViewMode] = useState<'dense' | 'compact'>('dense');

  // Extract filters from URL search params
  const currentSubjectCode = searchParams.get('subject_code') || undefined;
  const currentUnitId = searchParams.get('unit_id') ? Number(searchParams.get('unit_id')) : undefined;
  const currentTopicId = searchParams.get('topic_id') ? Number(searchParams.get('topic_id')) : undefined;
  const currentSemester = searchParams.get('semester') ? Number(searchParams.get('semester')) : undefined;
  const currentType = (searchParams.get('type') as ResourceType) || undefined;
  const currentMinRating = searchParams.get('min_rating') ? Number(searchParams.get('min_rating')) : undefined;
  const currentQ = searchParams.get('q') || undefined;
  const currentSortBy = (searchParams.get('sort_by') as SortByOption) || 'ranked';
  const currentPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

  // Active filter params object
  const activeFilters: ResourceFilterParams = {
    subject_code: currentSubjectCode,
    unit_id: currentUnitId,
    topic_id: currentTopicId,
    semester: currentSemester,
    type: currentType,
    min_rating: currentMinRating,
    q: currentQ,
    sort_by: currentSortBy,
    page: currentPage,
    page_size: 20,
  };

  // Load subjects hierarchy on mount
  useEffect(() => {
    let mounted = true;
    taxonomyApi.getSubjectsTree().then((data) => {
      if (mounted) {
        setSubjects(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch resources from backend
  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [resData, bookmarksData] = await Promise.all([
        resourcesApi.list(activeFilters),
        user ? resourcesApi.getUserBookmarks(user.id) : Promise.resolve({ bookmarks: [] }),
      ]);

      const bookmarkedIds = new Set(bookmarksData.bookmarks.map((b) => b.resource_id));

      const itemsWithBookmarks = resData.items.map((item) => ({
        ...item,
        is_bookmarked: bookmarkedIds.has(item.id),
      }));

      setResources(itemsWithBookmarks);
      setTotalCount(resData.total);
      setTotalPages(resData.total_pages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query resource records';
      setError(msg);
      setResources([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentSubjectCode,
    currentUnitId,
    currentTopicId,
    currentSemester,
    currentType,
    currentMinRating,
    currentQ,
    currentSortBy,
    currentPage,
    user?.id,
  ]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Update URL search parameters
  const updateFilters = (newFilters: Partial<ResourceFilterParams>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newFilters).forEach(([key, val]) => {
        if (val === undefined || val === null || val === '') {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });

      // If updating filter criteria, reset page to 1 unless page itself was modified
      if (!('page' in newFilters)) {
        params.set('page', '1');
      }

      setSearchParams(params);
    });
  };

  // Reset all filters but preserve active subject/unit if wanted, or full reset
  const handleResetFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (currentSubjectCode) params.set('subject_code', currentSubjectCode);
      if (currentUnitId) params.set('unit_id', String(currentUnitId));
      if (currentTopicId) params.set('topic_id', String(currentTopicId));
      setSearchParams(params);
    });
  };

  const handleClearBranch = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete('subject_code');
      params.delete('unit_id');
      params.delete('topic_id');
      params.set('page', '1');
      setSearchParams(params);
    });
  };

  // Find active subject & unit for contextual strip
  const activeSubject = subjects.find(
    (s) => s.code.toUpperCase() === (currentSubjectCode || '').toUpperCase()
  );
  const activeUnit = activeSubject?.units?.find(
    (u) => String(u.id) === String(currentUnitId)
  );
  const activeTopic = activeUnit?.topics?.find(
    (t) => String(t.id) === String(currentTopicId)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Curriculum Context Branch Header */}
      {activeSubject ? (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '18px 22px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Header Row with Clear Branch Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'var(--accent-tint)',
                    color: 'var(--accent-core)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {activeSubject.code}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                  }}
                >
                  SEMESTER {activeSubject.semester} • {activeSubject.department || 'ENGINEERING'}
                </span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {activeSubject.name}
                {activeTopic && (
                  <span style={{ fontSize: '18px', color: 'var(--accent-core)', fontWeight: 500 }}>
                    {' '}
                    — {activeTopic.title}
                  </span>
                )}
              </h1>
            </div>

            <button
              type="button"
              onClick={handleClearBranch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                color: 'var(--text-muted)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
              }}
              title="View all subjects across curriculum"
            >
              <X size={13} strokeWidth={1.75} />
              <span>SHOW ALL SUBJECTS</span>
            </button>
          </div>

          {/* Unit Thumb Selector Strip */}
          {activeSubject.units && activeSubject.units.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
                whiteSpace: 'nowrap',
              }}
            >
              <button
                type="button"
                onClick={() => updateFilters({ unit_id: undefined, topic_id: undefined })}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  backgroundColor: !currentUnitId ? 'var(--accent-core)' : 'var(--bg-subdued)',
                  color: !currentUnitId ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${!currentUnitId ? 'var(--accent-core)' : 'var(--border-subtle)'}`,
                }}
              >
                ALL UNITS
              </button>

              {activeSubject.units.map((unit) => {
                const isSelected = String(currentUnitId) === String(unit.id);
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        unit_id: isSelected ? undefined : unit.id,
                        topic_id: undefined,
                      })
                    }
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      backgroundColor: isSelected ? 'var(--accent-core)' : 'var(--bg-subdued)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent-core)' : 'var(--border-subtle)'}`,
                    }}
                    title={`Unit ${unit.unit_number}: ${unit.title}`}
                  >
                    UNIT {unit.unit_number}
                  </button>
                );
              })}
            </div>
          )}

          {/* Topic Sub-strip if a Unit is selected */}
          {activeUnit?.topics && activeUnit.topics.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                fontSize: '11.5px',
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)' }}>TOPICS:</span>
              {activeUnit.topics.map((topic) => {
                const isSelected = String(currentTopicId) === String(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        topic_id: isSelected ? undefined : topic.id,
                      })
                    }
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--accent-tint)' : 'transparent',
                      color: isSelected ? 'var(--accent-core)' : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                      fontSize: '11.5px',
                    }}
                  >
                    {topic.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  marginBottom: '2px',
                }}
              >
                CENTRAL CURRICULUM ARCHIVE // ALL BRANCHES
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Academic Resource Catalog
              </h1>
            </div>
          </div>

          {/* Mobile & Tablet Subject Quick-Selector Rail */}
          {subjects.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                  }}
                >
                  CURRICULUM QUICK-JUMP:
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10.5px',
                    color: 'var(--text-muted)',
                  }}
                >
                  {subjects.length} COURSES
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  paddingBottom: '4px',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {subjects.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => updateFilters({ subject_code: sub.code, unit_id: undefined, topic_id: undefined })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subdued)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    className="touch-target"
                    title={`${sub.code}: ${sub.name}`}
                  >
                    <span style={{ color: 'var(--accent-core)' }}>{sub.code}</span>
                    <span
                      style={{
                        color: 'var(--text-secondary)',
                        fontWeight: 400,
                        fontSize: '11.5px',
                        maxWidth: '160px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sub.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prominent "Most Useful This Week" Algorithmic Ranking Module */}
      <MostUsefulModule />

      {/* Filter and Search Toolbar */}
      <ResourceFilterBar
        filters={activeFilters}
        onFilterChange={updateFilters}
        onResetFilters={handleResetFilters}
        totalCount={totalCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            color: 'var(--status-danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13.5px',
          }}
        >
          {error}
        </div>
      )}

      {/* Resource Feed Area */}
      {isLoading ? (
        <ResourceSkeletonList count={6} viewMode={viewMode} />
      ) : resources.length === 0 ? (
        <ResourceEmptyState
          searchQuery={currentQ}
          subjectCode={currentSubjectCode}
          unitNumber={activeUnit?.unit_number}
          hasFilters={!!(currentType || currentSemester || currentMinRating || currentQ)}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <div
          className={viewMode === 'compact' ? 'table-scroll-container' : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: viewMode === 'compact' ? '0' : '12px',
            border: viewMode === 'compact' ? '1px solid var(--border-subtle)' : 'none',
            borderRadius: viewMode === 'compact' ? 'var(--radius-sm)' : '0',
            overflowX: viewMode === 'compact' ? 'auto' : 'visible',
          }}
        >
          <div style={{ minWidth: viewMode === 'compact' ? '720px' : 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Compact View Column Header */}
            {viewMode === 'compact' && (
              <div
                role="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 100px 1fr 140px 90px 100px 80px',
                  gap: '12px',
                  padding: '8px 14px',
                  backgroundColor: 'var(--bg-subdued)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                }}
              >
                <div>TYPE</div>
                <div>COURSE</div>
                <div>DOCUMENT TITLE</div>
                <div>CONTRIBUTOR</div>
                <div>RATING</div>
                <div>VOTES</div>
                <div style={{ textAlign: 'right' }}>ACTIONS</div>
              </div>
            )}

          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              viewMode={viewMode}
              onVoteChange={(resId, newUp, newDown, newVote) => {
                setResources((prev) =>
                  prev.map((r) =>
                    r.id === resId
                      ? {
                          ...r,
                          upvotes_count: newUp,
                          downvotes_count: newDown,
                          user_vote: newVote,
                        }
                      : r
                  )
                );
              }}
              onBookmarkChange={(resId, isSaved) => {
                setResources((prev) =>
                  prev.map((r) =>
                    r.id === resId
                      ? {
                          ...r,
                          is_bookmarked: isSaved,
                        }
                      : r
                  )
                );
              }}
            />
          ))}
          </div>
        </div>
      )}

      {/* Academic Pagination Bar */}
      {!isLoading && totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '16px',
            marginTop: '8px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            PAGE <strong style={{ color: 'var(--text-primary)' }}>{currentPage}</strong> OF{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong> •{' '}
            <span>{totalCount} TOTAL ARCHIVED RESOURCES</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => updateFilters({ page: currentPage - 1 })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage <= 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={14} strokeWidth={1.75} />
              <span>PREVIOUS</span>
            </button>

            {/* Jump Buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => updateFilters({ page: pageNum })}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: isCurrent ? 700 : 500,
                    backgroundColor: isCurrent ? 'var(--accent-core)' : 'var(--bg-surface)',
                    color: isCurrent ? '#FFFFFF' : 'var(--text-primary)',
                    border: `1px solid ${isCurrent ? 'var(--accent-core)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => updateFilters({ page: currentPage + 1 })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.5 : 1,
              }}
            >
              <span>NEXT</span>
              <ChevronRight size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
