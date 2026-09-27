import React, { useEffect, useState } from 'react';
import {
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  LayoutList,
  Rows3,
} from 'lucide-react';
import type { ResourceFilterParams, ResourceType, SortByOption } from '../../types';

interface ResourceFilterBarProps {
  filters: ResourceFilterParams;
  onFilterChange: (filters: Partial<ResourceFilterParams>) => void;
  onResetFilters: () => void;
  totalCount: number;
  viewMode: 'dense' | 'compact';
  onViewModeChange: (mode: 'dense' | 'compact') => void;
}

export const ResourceFilterBar: React.FC<ResourceFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  viewMode,
  onViewModeChange,
}) => {
  const [searchInput, setSearchInput] = useState(filters.q || '');

  // Debounced search synchronization
  useEffect(() => {
    setSearchInput(filters.q || '');
  }, [filters.q]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if ((filters.q || '') !== searchInput.trim()) {
        onFilterChange({ q: searchInput.trim() || undefined, page: 1 });
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  const hasActiveFilters = !!(
    filters.type ||
    filters.semester ||
    filters.min_rating ||
    filters.q ||
    (filters.sort_by && filters.sort_by !== 'ranked')
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Top Row: Search Input + Sort + Density Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Debounced Search Field */}
        <div
          style={{
            flex: 1,
            minWidth: '240px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={16}
            color="var(--text-muted)"
            strokeWidth={1.75}
            aria-hidden="true"
            style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
          />
          <input
            id="catalog-search-input"
            type="text"
            placeholder="Search syllabus topics, exam keywords, problem sets..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search syllabus topics, exam keywords, problem sets"
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: searchInput ? '34px' : '12px',
              height: '38px',
              fontSize: '13.5px',
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                onFilterChange({ q: undefined, page: 1 });
              }}
              aria-label="Clear search query"
              style={{
                position: 'absolute',
                right: '10px',
                padding: '6px',
                color: 'var(--text-muted)',
              }}
              className="touch-target"
            >
              <X size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sort Dimension Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0 8px',
              height: '38px',
            }}
          >
            <ArrowUpDown size={14} color="var(--text-muted)" strokeWidth={1.75} aria-hidden="true" />
            <label
              htmlFor="catalog-sort-select"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              SORT:
            </label>
            <select
              id="catalog-sort-select"
              aria-label="Sort resources catalog"
              value={filters.sort_by || 'ranked'}
              onChange={(e) => onFilterChange({ sort_by: e.target.value as SortByOption, page: 1 })}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0 4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--accent-core)',
                cursor: 'pointer',
              }}
            >
              <option value="ranked">Most Useful (Score)</option>
              <option value="recent">Most Recent</option>
              <option value="highest_rated">Highest Rated (5★)</option>
              <option value="most_upvoted">Most Upvoted</option>
              <option value="most_downloaded">Most Downloaded</option>
            </select>
          </div>

          {/* View Density Mode Toggle (Dense List vs Compact Table) */}
          <div
            role="group"
            aria-label="Catalog View Mode"
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              height: '38px',
            }}
          >
            <button
              type="button"
              onClick={() => onViewModeChange('dense')}
              aria-pressed={viewMode === 'dense'}
              aria-label="Dense Ledger List View"
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                color: viewMode === 'dense' ? 'var(--accent-core)' : 'var(--text-muted)',
                backgroundColor: viewMode === 'dense' ? 'var(--bg-surface)' : 'transparent',
                boxShadow: viewMode === 'dense' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
              title="Dense Ledger List View"
            >
              <LayoutList size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>DENSE</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('compact')}
              aria-pressed={viewMode === 'compact'}
              aria-label="Compact Ledger Table Rows"
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                color: viewMode === 'compact' ? 'var(--accent-core)' : 'var(--text-muted)',
                backgroundColor: viewMode === 'compact' ? 'var(--bg-surface)' : 'transparent',
                boxShadow: viewMode === 'compact' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
              title="Compact Ledger Table Rows"
            >
              <Rows3 size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>ROWS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Filter Controls Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
        }}
      >
        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Resource Type Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label
              htmlFor="filter-type-select"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              TYPE:
            </label>
            <select
              id="filter-type-select"
              aria-label="Filter by resource type"
              value={filters.type || ''}
              onChange={(e) =>
                onFilterChange({
                  type: (e.target.value as ResourceType) || undefined,
                  page: 1,
                })
              }
              style={{
                height: '34px',
                fontSize: '12px',
                padding: '2px 8px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: filters.type ? 'var(--accent-tint)' : 'var(--bg-surface)',
                borderColor: filters.type ? 'var(--accent-border)' : 'var(--border-subtle)',
                color: filters.type ? 'var(--accent-core)' : 'var(--text-primary)',
                fontWeight: filters.type ? 600 : 400,
              }}
            >
              <option value="">All Document Types</option>
              <option value="notes">Notes / Slides</option>
              <option value="pdf">Complete PDF Guides</option>
              <option value="question_bank">Question Banks / PYQs</option>
              <option value="lab_record">Lab Manuals & Code</option>
              <option value="paper">Academic Monographs</option>
              <option value="link">Reference Links</option>
            </select>
          </div>

          {/* Semester Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label
              htmlFor="filter-semester-select"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              SEMESTER:
            </label>
            <select
              id="filter-semester-select"
              aria-label="Filter by semester"
              value={filters.semester || ''}
              onChange={(e) =>
                onFilterChange({
                  semester: e.target.value ? Number(e.target.value) : undefined,
                  page: 1,
                })
              }
              style={{
                height: '34px',
                fontSize: '12px',
                padding: '2px 8px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: filters.semester ? 'var(--accent-tint)' : 'var(--bg-surface)',
                borderColor: filters.semester ? 'var(--accent-border)' : 'var(--border-subtle)',
                color: filters.semester ? 'var(--accent-core)' : 'var(--text-primary)',
                fontWeight: filters.semester ? 600 : 400,
              }}
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label
              htmlFor="filter-rating-select"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              RATING:
            </label>
            <select
              id="filter-rating-select"
              aria-label="Filter by minimum peer rating"
              value={filters.min_rating || ''}
              onChange={(e) =>
                onFilterChange({
                  min_rating: e.target.value ? Number(e.target.value) : undefined,
                  page: 1,
                })
              }
              style={{
                height: '34px',
                fontSize: '12px',
                padding: '2px 8px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: filters.min_rating ? 'var(--status-exam-bg)' : 'var(--bg-surface)',
                borderColor: filters.min_rating ? 'var(--status-exam)' : 'var(--border-subtle)',
                color: filters.min_rating ? 'var(--status-exam)' : 'var(--text-primary)',
                fontWeight: filters.min_rating ? 600 : 400,
              }}
            >
              <option value="">Any Rating</option>
              <option value="4.5">4.5★ & Above (Top Tier)</option>
              <option value="4.0">4.0★ & Above (Peer Verified)</option>
              <option value="3.5">3.5★ & Above</option>
              <option value="3.0">3.0★ & Above</option>
            </select>
          </div>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              aria-label="Reset all search filters"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
              className="touch-target"
              title="Reset all search filters"
            >
              <RotateCcw size={12} strokeWidth={1.75} aria-hidden="true" />
              <span>RESET</span>
            </button>
          )}
        </div>

        {/* Total Ledger Record Count */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
          }}
        >
          RECORD COUNT: <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong>
        </div>
      </div>
    </div>
  );
};
