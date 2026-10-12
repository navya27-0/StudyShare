import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  LayoutList,
  Rows3,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import type {
  ResourceFilterParams,
  ResourceType,
  SortByOption,
  SubjectWithHierarchy,
} from '../../types';

interface ResourceFilterBarProps {
  filters: ResourceFilterParams;
  onFilterChange: (filters: Partial<ResourceFilterParams>) => void;
  onResetFilters: () => void;
  totalCount: number;
  viewMode: 'dense' | 'compact';
  onViewModeChange: (mode: 'dense' | 'compact') => void;
  subjects?: SubjectWithHierarchy[];
}

interface SearchSuggestion {
  label: string;
  sublabel: string;
  subjectId?: number;
  unitId?: number;
  topicId?: number;
  type?: ResourceType;
  query?: string;
}

export const ResourceFilterBar: React.FC<ResourceFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  viewMode,
  onViewModeChange,
  subjects = [],
}) => {
  const [searchInput, setSearchInput] = useState(filters.q || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Synchronize controlled search input
  useEffect(() => {
    setSearchInput(filters.q || '');
  }, [filters.q]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if ((filters.q || '') !== searchInput.trim()) {
        onFilterChange({ q: searchInput.trim() || undefined, page: 1 });
      }
    }, 280);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, filters.q, onFilterChange]);

  // Close suggestions dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build live student-oriented search suggestions (courses, units, topics, synonyms)
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const matches: SearchSuggestion[] = [];

    for (const subj of subjects) {
      if (
        subj.code.toLowerCase().includes(q) ||
        subj.name.toLowerCase().includes(q)
      ) {
        matches.push({
          label: `${subj.code} — ${subj.name}`,
          sublabel: `Semester ${subj.semester} Course`,
          subjectId: subj.id,
        });
      }
      for (const unit of subj.units || []) {
        if (
          unit.title.toLowerCase().includes(q) ||
          `unit ${unit.unit_number}`.includes(q)
        ) {
          matches.push({
            label: `${subj.code} → Unit ${unit.unit_number} → ${unit.title}`,
            sublabel: `${subj.name} (Unit ${unit.unit_number})`,
            subjectId: subj.id,
            unitId: unit.id,
          });
        }
        for (const topic of unit.topics || []) {
          if (topic.title.toLowerCase().includes(q)) {
            matches.push({
              label: `${subj.code} → Unit ${unit.unit_number} → ${topic.title}`,
              sublabel: `Topic in ${unit.title}`,
              subjectId: subj.id,
              unitId: unit.id,
              topicId: topic.id,
            });
          }
        }
      }
    }

    if ('pyq'.includes(q) || 'past paper'.includes(q) || 'question'.includes(q) || 'exam'.includes(q)) {
      matches.unshift({
        label: 'Filter by Past Question Papers (PYQs)',
        sublabel: 'Question banks & exam solutions',
        type: 'question_bank',
      });
    } else if ('notes'.includes(q) || 'lecture'.includes(q)) {
      matches.unshift({
        label: 'Filter by Lecture Notes & Summaries',
        sublabel: 'Handwritten & typed study notes',
        type: 'notes',
      });
    } else if ('lab'.includes(q) || 'manual'.includes(q)) {
      matches.unshift({
        label: 'Filter by Lab Records & Code',
        sublabel: 'Practical manuals & lab solutions',
        type: 'lab_record',
      });
    }

    return matches.slice(0, 6);
  }, [searchInput, subjects]);

  const hasActiveFilters = !!(
    filters.type ||
    filters.semester ||
    filters.min_rating ||
    filters.is_verified ||
    filters.q ||
    (filters.sort_by && filters.sort_by !== 'ranked')
  );

  const activeFilterCount = [
    filters.type,
    filters.semester,
    filters.min_rating,
    filters.is_verified,
  ].filter(Boolean).length;

  return (
    <div
      className="daq-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        padding: '18px 20px',
        position: 'relative',
      }}
    >
      <div className="daq-crosshair daq-crosshair-tl" />
      <div className="daq-crosshair daq-crosshair-tr" />
      <div className="daq-crosshair daq-crosshair-bl" />
      <div className="daq-crosshair daq-crosshair-br" />

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
        {/* Debounced Search Field with Suggestions */}
        <div
          ref={searchWrapperRef}
          style={{
            flex: 1,
            minWidth: '250px',
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
            id="global-resource-search"
            type="search"
            placeholder="Search course code (CS201), topic (graph), PYQ, notes, or contributor..."
            value={searchInput}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            aria-label="Search by course code, unit, topic, resource type, or contributor"
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: searchInput ? '36px' : '64px',
              height: '40px',
              fontSize: '13.5px',
            }}
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setShowSuggestions(false);
                onFilterChange({ q: undefined, page: 1 });
              }}
              aria-label="Clear search query"
              style={{
                position: 'absolute',
                right: '8px',
                padding: '6px',
                color: 'var(--text-muted)',
              }}
              className="touch-target"
            >
              <X size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : (
            <span
              className="kbd-shortcut"
              style={{
                position: 'absolute',
                right: '10px',
              }}
              title="Press / or Ctrl+K to search"
            >
              / or ⌘K
            </span>
          )}

          {/* Interactive Search Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              role="listbox"
              aria-label="Search suggestions"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 80,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div
                style={{
                  fontSize: '10.5px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  padding: '4px 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Suggested courses, units & filters for &ldquo;{searchInput.trim()}&rdquo;
              </div>
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="option"
                  onClick={() => {
                    if (item.type) {
                      onFilterChange({ type: item.type, q: undefined, page: 1 });
                      setSearchInput('');
                    } else if (item.subjectId) {
                      onFilterChange({
                        subject_id: item.subjectId,
                        unit_id: item.unitId,
                        topic_id: item.topicId,
                        q: undefined,
                        page: 1,
                      });
                      setSearchInput('');
                    }
                    setShowSuggestions(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-tint)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.label}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {item.sublabel}
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort & Mobile Filter Sheet Trigger & View Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileFiltersExpanded((prev) => !prev)}
            aria-expanded={mobileFiltersExpanded}
            className="mobile-filter-toggle-btn"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeFilterCount > 0 ? 'var(--accent-tint)' : 'var(--bg-subdued)',
              border: `1px solid ${activeFilterCount > 0 ? 'var(--accent-core)' : 'var(--border-subtle)'}`,
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>

          {/* Sort Select */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0 10px',
              height: '40px',
            }}
          >
            <ArrowUpDown size={14} color="var(--text-muted)" strokeWidth={1.75} aria-hidden="true" />
            <label
              htmlFor="catalog-sort-select"
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sort:
            </label>
            <select
              id="catalog-sort-select"
              aria-label="Sort study resources"
              value={filters.sort_by || 'ranked'}
              onChange={(e) => onFilterChange({ sort_by: e.target.value as SortByOption, page: 1 })}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0 4px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--accent-core)',
                cursor: 'pointer',
              }}
            >
              <option value="ranked">Most relevant</option>
              <option value="newest">Newest</option>
              <option value="most_downloaded">Most downloaded</option>
              <option value="highest_rated">Highest rated</option>
              <option value="recently_updated">Recently updated</option>
              <option value="most_upvoted">Most upvoted</option>
            </select>
          </div>

          {/* View Density Mode Toggle (Cards vs Table Rows) */}
          <div
            role="group"
            aria-label="Display layout"
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              height: '40px',
            }}
          >
            <button
              type="button"
              onClick={() => onViewModeChange('dense')}
              aria-pressed={viewMode === 'dense'}
              aria-label="Card list view"
              style={{
                padding: '6px 11px',
                borderRadius: 'var(--radius-sm)',
                color: viewMode === 'dense' ? 'var(--accent-contrast)' : 'var(--text-muted)',
                backgroundColor: viewMode === 'dense' ? 'var(--accent-core)' : 'transparent',
                border: viewMode === 'dense' ? '1px solid var(--accent-core)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
              title="Detailed resource cards"
            >
              <LayoutList size={13} strokeWidth={2} aria-hidden="true" />
              <span>Cards</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('compact')}
              aria-pressed={viewMode === 'compact'}
              aria-label="Compact table rows view"
              style={{
                padding: '6px 11px',
                borderRadius: 'var(--radius-sm)',
                color: viewMode === 'compact' ? 'var(--accent-contrast)' : 'var(--text-muted)',
                backgroundColor: viewMode === 'compact' ? 'var(--accent-core)' : 'transparent',
                border: viewMode === 'compact' ? '1px solid var(--accent-core)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
              title="Compact table rows"
            >
              <Rows3 size={13} strokeWidth={2} aria-hidden="true" />
              <span>Rows</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Filter Controls Row */}
      <div
        className={`filter-controls-row ${mobileFiltersExpanded ? 'mobile-expanded' : ''}`}
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
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Type:
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
                fontSize: '12.5px',
                padding: '2px 8px',
                backgroundColor: filters.type ? 'var(--accent-tint)' : 'var(--bg-surface)',
                borderColor: filters.type ? 'var(--accent-border)' : 'var(--border-subtle)',
                color: filters.type ? 'var(--accent-core)' : 'var(--text-primary)',
                fontWeight: filters.type ? 600 : 400,
              }}
            >
              <option value="">All Resource Types</option>
              <option value="notes">Notes & Summaries</option>
              <option value="question_bank">Past Papers (PYQs)</option>
              <option value="pdf">Complete Study Guides (PDF)</option>
              <option value="lab_record">Lab Manuals & Code</option>
              <option value="paper">Reference Papers</option>
              <option value="link">External Links</option>
            </select>
          </div>

          {/* Semester Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label
              htmlFor="filter-semester-select"
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Semester:
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
                fontSize: '12.5px',
                padding: '2px 8px',
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
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Rating:
            </label>
            <select
              id="filter-rating-select"
              aria-label="Filter by minimum student rating"
              value={filters.min_rating || ''}
              onChange={(e) =>
                onFilterChange({
                  min_rating: e.target.value ? Number(e.target.value) : undefined,
                  page: 1,
                })
              }
              style={{
                height: '34px',
                fontSize: '12.5px',
                padding: '2px 8px',
                backgroundColor: filters.min_rating ? 'var(--status-exam-bg)' : 'var(--bg-surface)',
                borderColor: filters.min_rating ? 'var(--status-exam)' : 'var(--border-subtle)',
                color: filters.min_rating ? 'var(--status-exam)' : 'var(--text-primary)',
                fontWeight: filters.min_rating ? 600 : 400,
              }}
            >
              <option value="">Any Rating</option>
              <option value="4.5">4.5★ & Above</option>
              <option value="4.0">4.0★ & Above</option>
              <option value="3.5">3.5★ & Above</option>
              <option value="3.0">3.0★ & Above</option>
            </select>
          </div>

          {/* Faculty Verified Filter Button */}
          <button
            type="button"
            aria-pressed={!!filters.is_verified}
            onClick={() =>
              onFilterChange({
                is_verified: filters.is_verified ? undefined : true,
                page: 1,
              })
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              height: '34px',
              padding: '0 11px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: filters.is_verified ? 'var(--status-verified-bg)' : 'var(--bg-surface)',
              border: `1px solid ${filters.is_verified ? 'var(--status-verified-border)' : 'var(--border-subtle)'}`,
              color: filters.is_verified ? 'var(--status-verified)' : 'var(--text-secondary)',
            }}
            title="Show only resources verified by faculty or course administrators"
          >
            <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
            <span>Faculty Verified</span>
          </button>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              aria-label="Clear all search filters"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
              }}
              title="Clear all active filters"
            >
              <RotateCcw size={12} strokeWidth={1.75} aria-hidden="true" />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        {/* Live Result Count */}
        <div
          aria-live="polite"
          style={{
            fontSize: '12.5px',
            color: 'var(--text-muted)',
          }}
        >
          Showing <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong>{' '}
          {totalCount === 1 ? 'resource' : 'resources'}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .mobile-filter-toggle-btn {
            display: inline-flex !important;
          }
          .filter-controls-row {
            display: none !important;
          }
          .filter-controls-row.mobile-expanded {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};
