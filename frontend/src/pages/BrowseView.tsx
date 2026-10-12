import React, { useEffect, useState, useCallback, useTransition } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  X,
  ChevronLeft,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Upload,
  BookOpen,
  Clock,
  Flame,
  Bookmark,
} from 'lucide-react';
import type {
  ResourceFilterParams,
  ResourceListItem,
  SubjectItem,
  ResourceType,
  SortByOption,
} from '../types';
import { resourcesApi, taxonomyApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { ResourceFilterBar } from '../components/resources/ResourceFilterBar';
import { ResourceCard } from '../components/resources/ResourceCard';
import { ResourceSkeletonList } from '../components/resources/ResourceSkeletonList';
import { ResourceEmptyState } from '../components/resources/ResourceEmptyState';
import { MostUsefulModule } from '../components/resources/MostUsefulModule';

export const BrowseView: React.FC = () => {
  const { preferences, openOnboarding } = useTheme();
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
  const currentSubjectId = searchParams.get('subject_id')
    ? Number(searchParams.get('subject_id'))
    : undefined;
  const currentSubjectCode = searchParams.get('subject_code') || undefined;
  const currentUnitId = searchParams.get('unit_id')
    ? Number(searchParams.get('unit_id'))
    : undefined;
  const currentTopicId = searchParams.get('topic_id')
    ? Number(searchParams.get('topic_id'))
    : undefined;
  const currentSemester = searchParams.get('semester')
    ? Number(searchParams.get('semester'))
    : undefined;
  const currentType = (searchParams.get('type') as ResourceType) || undefined;
  const currentMinRating = searchParams.get('min_rating')
    ? Number(searchParams.get('min_rating'))
    : undefined;
  const currentIsVerified =
    searchParams.get('is_verified') === 'true' ? true : undefined;
  const currentQ = searchParams.get('q') || undefined;
  const currentSortBy = (searchParams.get('sort_by') as SortByOption) || 'ranked';
  const currentPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

  // Active filter params object
  const activeFilters: ResourceFilterParams = {
    subject_id: currentSubjectId,
    subject_code: currentSubjectCode,
    unit_id: currentUnitId,
    topic_id: currentTopicId,
    semester: currentSemester,
    type: currentType,
    min_rating: currentMinRating,
    is_verified: currentIsVerified,
    q: currentQ,
    sort_by: currentSortBy,
    page: currentPage,
    page_size: 20,
  };

  // Load subjects hierarchy on mount (uses local cache for fast mobile/weak networks)
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

  // Fetch resources from backend in a single request (includes is_bookmarked and user_vote)
  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resData = await resourcesApi.list(activeFilters);
      const rawItems = resData?.items || [];
      setResources(rawItems);
      setTotalCount(resData?.total ?? rawItems.length);
      setTotalPages(resData?.total_pages ?? 1);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unable to load study materials right now.';
      setError(msg);
      setResources([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentSubjectId,
    currentSubjectCode,
    currentUnitId,
    currentTopicId,
    currentSemester,
    currentType,
    currentMinRating,
    currentIsVerified,
    currentQ,
    currentSortBy,
    currentPage,
  ]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Update URL search parameters
  const updateFilters = useCallback(
    (newFilters: Partial<ResourceFilterParams>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);

        Object.entries(newFilters).forEach(([key, val]) => {
          if (val === undefined || val === null || val === '') {
            params.delete(key);
          } else {
            params.set(key, String(val));
          }
        });

        // If subject_id is set via search suggestion, map to subject_code if possible
        if (newFilters.subject_id) {
          const matchedSubj = subjects.find((s) => s.id === newFilters.subject_id);
          if (matchedSubj) {
            params.set('subject_code', matchedSubj.code);
            params.delete('subject_id');
          }
        }

        if (!('page' in newFilters)) {
          params.set('page', '1');
        }

        setSearchParams(params);
      });
    },
    [searchParams, setSearchParams, subjects]
  );

  // Reset filter criteria while keeping current course if selected
  const handleResetFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (currentSubjectCode) params.set('subject_code', currentSubjectCode);
      if (currentUnitId) params.set('unit_id', String(currentUnitId));
      if (currentTopicId) params.set('topic_id', String(currentTopicId));
      setSearchParams(params);
    });
  };

  // Clear course/unit branch completely to search all courses
  const handleSearchAllCourses = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (currentQ) params.set('q', currentQ);
      setSearchParams(params);
    });
  };

  const handleClearBranch = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete('subject_id');
      params.delete('subject_code');
      params.delete('unit_id');
      params.delete('topic_id');
      params.set('page', '1');
      setSearchParams(params);
    });
  };

  // Find active subject & unit for contextual strip
  const activeSubject = subjects.find(
    (s) =>
      s.code.toUpperCase() === (currentSubjectCode || '').toUpperCase() ||
      (currentSubjectId !== undefined && s.id === currentSubjectId)
  );
  const activeUnit = activeSubject?.units?.find(
    (u) => String(u.id) === String(currentUnitId)
  );
  const activeTopic = activeUnit?.topics?.find(
    (t) => String(t.id) === String(currentTopicId)
  );

  // Compute student's personalized courses (from onboarding or default semester)
  const myCourses =
    preferences.selectedCourseIds.length > 0
      ? subjects.filter((s) => preferences.selectedCourseIds.includes(s.id))
      : preferences.semester
        ? subjects.filter((s) => s.semester === preferences.semester)
        : subjects.slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Course Context Header (Visible when a specific course is selected) */}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
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
                  Semester {activeSubject.semester} · {activeSubject.department || 'Engineering'}
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
                {activeUnit && (
                  <span style={{ fontSize: '18px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {' '}
                    → Unit {activeUnit.unit_number}: {activeUnit.title}
                  </span>
                )}
                {activeTopic && (
                  <span style={{ fontSize: '17px', color: 'var(--accent-core)', fontWeight: 500 }}>
                    {' '}
                    → {activeTopic.title}
                  </span>
                )}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to={`/upload?subject_id=${activeSubject.id}${
                  activeUnit ? `&unit_id=${activeUnit.id}` : ''
                }`}
                className="daq-btn-primary"
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                <Upload size={13} aria-hidden="true" />
                <span>Upload to {activeSubject.code}</span>
              </Link>
              <button
                type="button"
                onClick={handleClearBranch}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subdued)',
                  border: '1px solid var(--border-subtle)',
                }}
                title="View all courses"
              >
                <X size={13} strokeWidth={1.75} aria-hidden="true" />
                <span>All Courses</span>
              </button>
            </div>
          </div>

          {/* Unit Selector Strip */}
          {activeSubject.units && activeSubject.units.length > 0 && (
            <div
              role="group"
              aria-label={`Units in ${activeSubject.code}`}
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
                aria-pressed={!currentUnitId}
                onClick={() => updateFilters({ unit_id: undefined, topic_id: undefined })}
                className="filter-chip-btn"
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: !currentUnitId ? 'var(--accent-core)' : 'var(--bg-subdued)',
                  color: !currentUnitId ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                  border: `1px solid ${!currentUnitId ? 'var(--accent-core)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
              >
                All Units
              </button>

              {activeSubject.units.map((unit) => {
                const isSelected = String(currentUnitId) === String(unit.id);
                return (
                  <button
                    key={unit.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      updateFilters({
                        unit_id: isSelected ? undefined : unit.id,
                        topic_id: undefined,
                      })
                    }
                    className="filter-chip-btn"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: isSelected ? 'var(--accent-core)' : 'var(--bg-subdued)',
                      color: isSelected ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent-core)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                    }}
                    title={`Unit ${unit.unit_number}: ${unit.title}`}
                  >
                    Unit {unit.unit_number}: {unit.title}
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
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ fontWeight: 600 }}>Topics:</span>
              {activeUnit.topics.map((topic) => {
                const isSelected = String(currentTopicId) === String(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      updateFilters({
                        topic_id: isSelected ? undefined : topic.id,
                      })
                    }
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--accent-tint)' : 'transparent',
                      color: isSelected ? 'var(--accent-core)' : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                      fontSize: '12px',
                      fontWeight: isSelected ? 600 : 400,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Priority 1.1: Immediately Understandable Student Landing Hero */}
          <section
            aria-label="StudyShare overview"
            className="daq-card academic-grid-bg"
            style={{
              padding: '32px 32px 26px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="daq-crosshair daq-crosshair-tl" />
            <div className="daq-crosshair daq-crosshair-tr" />
            <div className="daq-crosshair daq-crosshair-bl" />
            <div className="daq-crosshair daq-crosshair-br" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="daq-tag">
                <span className="daq-beacon" aria-hidden="true" />
                STUDY RESOURCES FOR YOUR COURSES
              </span>
              {preferences.university && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {preferences.university} · {preferences.department}
                </span>
              )}
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(24px, 4vw, 38px)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.18,
                color: 'var(--text-primary)',
                marginBottom: '10px',
                maxWidth: '780px',
              }}
            >
              Find lecture notes, past question papers, and lab guides{' '}
              <span className="academic-serif-italic" style={{ fontWeight: 400 }}>
                organized by course and unit.
              </span>
            </h1>

            <p
              style={{
                fontSize: '14.5px',
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                maxWidth: '680px',
                marginBottom: '20px',
              }}
            >
              StudyShare helps students quickly find exam-ready study materials, preview PDFs before downloading, save bookmarks for revision, and share notes with classmates.
            </p>

            {/* Primary 4-Step Student Flow */}
            <div
              aria-label="How StudyShare works"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '22px',
              }}
            >
              {[
                { step: '1', title: 'Choose your course', desc: 'Select your subject code (e.g., CS201)' },
                { step: '2', title: 'Choose a unit', desc: 'Narrow down to Unit 1–5 or a topic' },
                { step: '3', title: 'Find notes or PYQs', desc: 'Filter by lecture notes or past papers' },
                { step: '4', title: 'Preview or download', desc: 'Read inline, download PDF, or bookmark' },
              ].map((item) => (
                <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-core)',
                      color: 'var(--accent-contrast)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {item.step}
                  </span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hero Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="#catalog-grid"
                className="daq-btn-primary"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('global-resource-search')?.focus();
                }}
              >
                <span>Find Resources</span>
                <ChevronRight size={14} strokeWidth={2.5} aria-hidden="true" />
              </a>

              <Link to="/upload" className="daq-btn-secondary">
                <Upload size={14} aria-hidden="true" />
                <span>Upload Notes</span>
              </Link>

              <button
                type="button"
                onClick={openOnboarding}
                className="daq-btn-secondary"
              >
                <Sparkles size={14} style={{ color: 'var(--status-verified)' }} aria-hidden="true" />
                <span>
                  {preferences.completedAt
                    ? 'Edit My Semester & Courses'
                    : 'Personalize My Semester'}
                </span>
              </button>
            </div>
          </section>

          {/* Priority 1.2: Personalized "Your Semester" Course Strip */}
          {subjects.length > 0 && (
            <section
              aria-label="Your semester courses"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={15} color="var(--accent-core)" aria-hidden="true" />
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    {preferences.semester
                      ? `Your Semester (Semester ${preferences.semester})`
                      : 'Browse by Course'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={openOnboarding}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textDecoration: 'underline',
                  }}
                >
                  Customize pinned courses
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: '10px',
                }}
              >
                {(myCourses.length > 0 ? myCourses : subjects).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        subject_code: sub.code,
                        unit_id: undefined,
                        topic_id: undefined,
                      })
                    }
                    className="filter-chip-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subdued)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    title={`Open ${sub.code}: ${sub.name}`}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--accent-core)',
                        }}
                      >
                        {sub.code}{' '}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                          · Sem {sub.semester}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {sub.name}
                      </div>
                    </div>
                    <ChevronRight size={15} color="var(--text-muted)" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Prominent "Most Useful This Week" Module */}
      <MostUsefulModule />

      {/* Priority 1.2: "Recommended for you" Quick Feed Tabs */}
      <div
        id="catalog-grid"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div
          role="tablist"
          aria-label="Recommended resource views"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={currentSortBy === 'ranked' && !currentType}
            onClick={() => updateFilters({ sort_by: 'ranked', type: undefined })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor:
                currentSortBy === 'ranked' && !currentType
                  ? 'var(--accent-core)'
                  : 'var(--bg-surface)',
              color:
                currentSortBy === 'ranked' && !currentType
                  ? 'var(--accent-contrast)'
                  : 'var(--text-secondary)',
              border: `1px solid ${
                currentSortBy === 'ranked' && !currentType
                  ? 'var(--accent-core)'
                  : 'var(--border-subtle)'
              }`,
            }}
          >
            <Flame size={13} aria-hidden="true" />
            <span>Most useful this week</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentSortBy === 'newest' || currentSortBy === 'recent'}
            onClick={() => updateFilters({ sort_by: 'newest' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor:
                currentSortBy === 'newest' || currentSortBy === 'recent'
                  ? 'var(--accent-core)'
                  : 'var(--bg-surface)',
              color:
                currentSortBy === 'newest' || currentSortBy === 'recent'
                  ? 'var(--accent-contrast)'
                  : 'var(--text-secondary)',
              border: `1px solid ${
                currentSortBy === 'newest' || currentSortBy === 'recent'
                  ? 'var(--accent-core)'
                  : 'var(--border-subtle)'
              }`,
            }}
          >
            <Clock size={13} aria-hidden="true" />
            <span>Recently uploaded</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentType === 'question_bank'}
            onClick={() =>
              updateFilters({
                type: currentType === 'question_bank' ? undefined : 'question_bank',
              })
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor:
                currentType === 'question_bank' ? 'var(--accent-core)' : 'var(--bg-surface)',
              color:
                currentType === 'question_bank'
                  ? 'var(--accent-contrast)'
                  : 'var(--text-secondary)',
              border: `1px solid ${
                currentType === 'question_bank'
                  ? 'var(--accent-core)'
                  : 'var(--border-subtle)'
              }`,
            }}
          >
            <span>Past Papers (PYQs)</span>
          </button>

          <Link
            to="/bookmarks"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Bookmark size={13} aria-hidden="true" />
            <span>Saved resources</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <ResourceFilterBar
        filters={activeFilters}
        onFilterChange={updateFilters}
        onResetFilters={handleResetFilters}
        totalCount={totalCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        subjects={subjects}
      />

      {/* Resource Feed Area */}
      {isLoading ? (
        <ResourceSkeletonList count={6} viewMode={viewMode} />
      ) : error ? (
        <div
          role="alert"
          className="daq-card"
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            margin: '12px 0',
          }}
        >
          <AlertTriangle size={36} color="var(--status-danger)" style={{ margin: '0 auto 12px' }} />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 600,
              margin: '0 0 8px',
              color: 'var(--text-primary)',
            }}
          >
            Could Not Load Study Materials
          </h3>
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--text-secondary)',
              maxWidth: '480px',
              margin: '0 auto 20px',
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
          <button
            type="button"
            onClick={fetchResources}
            className="daq-btn-primary"
            style={{ margin: '0 auto' }}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      ) : resources.length === 0 ? (
        <ResourceEmptyState
          searchQuery={currentQ}
          subjectCode={activeSubject?.code || currentSubjectCode}
          unitNumber={activeUnit?.unit_number}
          hasFilters={
            !!(
              currentType ||
              currentSemester ||
              currentMinRating ||
              currentIsVerified ||
              currentQ
            )
          }
          onResetFilters={handleResetFilters}
          onSearchAllCourses={handleSearchAllCourses}
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

          {resources.map((resource, idx) => (
            <div
              key={resource.id}
              className={viewMode === 'compact' ? undefined : 'stagger-item'}
              style={viewMode === 'compact' ? undefined : ({ '--stagger-i': Math.min(idx, 8) } as React.CSSProperties)}
            >
              <ResourceCard
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
            </div>
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
                    color: isCurrent ? 'var(--accent-contrast)' : 'var(--text-primary)',
                    border: `1px solid ${isCurrent ? 'var(--accent-core)' : 'var(--border-subtle)'}`,
                    boxShadow: isCurrent ? '0 0 15px var(--accent-border)' : 'none',
                    transition: 'all 140ms ease',
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
