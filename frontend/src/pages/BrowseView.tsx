import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, RefreshCw, Upload, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import { useBrowseResources } from '../components/browse/useBrowseResources';
import { StudentFlowGuide } from '../components/browse/StudentFlowGuide';
import { YourSemesterStrip } from '../components/browse/YourSemesterStrip';
import { ResourceFilterBar } from '../components/resources/ResourceFilterBar';
import { ResourceCard } from '../components/resources/ResourceCard';
import { ResourceSkeletonList } from '../components/resources/ResourceSkeletonList';
import { ResourceEmptyState } from '../components/resources/ResourceEmptyState';
import { MostUsefulModule } from '../components/resources/MostUsefulModule';

export const BrowseView: React.FC = () => {
  const { preferences, openOnboarding } = useTheme();
  const [viewMode, setViewMode] = useState<'dense' | 'compact'>('dense');

  const {
    resources,
    totalCount,
    totalPages,
    isLoading,
    error,
    subjects,
    activeFilters,
    updateFilters,
    resetFilters,
    fetchResources,
    handleVoteUpdate,
    handleBookmarkToggle,
  } = useBrowseResources();

  const isFiltering = Boolean(
    activeFilters.subject_id ||
      activeFilters.subject_code ||
      activeFilters.unit_id ||
      activeFilters.topic_id ||
      activeFilters.semester ||
      activeFilters.type ||
      activeFilters.min_rating ||
      activeFilters.is_verified ||
      activeFilters.q
  );

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Find Study Materials</h1>
          <p className="text-xs text-white/60 mt-0.5">
            Verified lecture notes, previous year exam papers, and lab manuals organized by course.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link to="/upload" className="daq-btn-primary text-xs flex items-center gap-1.5">
            <Upload size={14} /> Upload Notes
          </Link>
        </div>
      </div>

      {/* 2. 4-Step 5-Second Student Workflow Banner */}
      {!isFiltering && <StudentFlowGuide />}

      {/* 3. Personalized Your Semester Quick Jump Strip */}
      <YourSemesterStrip
        semester={preferences.semester}
        selectedCourseIds={preferences.selectedCourseIds}
        subjects={subjects}
        activeSubjectCode={activeFilters.subject_code}
        onSelectCourse={(code) => updateFilters({ subject_code: code || undefined, unit_id: undefined, topic_id: undefined })}
        onOpenOnboarding={openOnboarding}
      />

      {/* 4. Filter Bar */}
      <ResourceFilterBar
        subjects={subjects}
        filters={activeFilters}
        onFilterChange={updateFilters}
        onResetFilters={resetFilters}
        totalCount={totalCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* 5. Content Area */}
      {error ? (
        <div className="daq-card p-8 text-center space-y-3 border-rose-500/20">
          <AlertTriangle size={24} className="mx-auto text-rose-400" />
          <p className="text-sm text-white font-medium">{error}</p>
          <button
            type="button"
            onClick={fetchResources}
            className="daq-btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw size={12} /> Try Again
          </button>
        </div>
      ) : isLoading ? (
        <ResourceSkeletonList count={viewMode === 'compact' ? 8 : 4} />
      ) : resources.length === 0 ? (
        <ResourceEmptyState
          searchQuery={activeFilters.q}
          subjectCode={activeFilters.subject_code}
          hasFilters={isFiltering}
          onResetFilters={resetFilters}
        />
      ) : (
        <div className="space-y-6">
          {/* Top Recommendation Module if viewing default catalog */}
          {!isFiltering && <MostUsefulModule />}

          {/* Resource Card List */}
          <div
            className={
              viewMode === 'compact'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                : 'space-y-3'
            }
          >
            {resources.map((res) => (
              <ResourceCard
                key={res.id}
                resource={res}
                viewMode={viewMode}
                onVoteChange={(resId, up, down, userVote) =>
                  handleVoteUpdate(resId, up, down, userVote)
                }
                onBookmarkChange={(resId, bookmarked) =>
                  handleBookmarkToggle(resId, bookmarked)
                }
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-xs text-white/50 font-mono">
                Showing {resources.length} of {totalCount} resources
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={(activeFilters.page || 1) <= 1}
                  onClick={() => updateFilters({ page: (activeFilters.page || 1) - 1 })}
                  className="daq-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-xs font-mono text-white/70 px-2">
                  {activeFilters.page || 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={(activeFilters.page || 1) >= totalPages}
                  onClick={() => updateFilters({ page: (activeFilters.page || 1) + 1 })}
                  className="daq-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrowseView;
