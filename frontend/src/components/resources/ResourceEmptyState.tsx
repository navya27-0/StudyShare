import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Upload, RotateCcw, SearchX, Compass } from 'lucide-react';

interface ResourceEmptyStateProps {
  searchQuery?: string;
  subjectCode?: string;
  unitNumber?: number;
  hasFilters: boolean;
  onResetFilters: () => void;
  onSearchAllCourses?: () => void;
}

export const ResourceEmptyState: React.FC<ResourceEmptyStateProps> = ({
  searchQuery,
  subjectCode,
  unitNumber,
  hasFilters,
  onResetFilters,
  onSearchAllCourses,
}) => {
  const titleText = searchQuery
    ? `No resources found for "${searchQuery}"`
    : subjectCode
      ? `No resources found for ${subjectCode}${unitNumber ? ` → Unit ${unitNumber}` : ''}`
      : 'No study materials found';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px dashed var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        margin: '8px 0',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--accent-tint)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-core)',
          marginBottom: '16px',
        }}
      >
        {searchQuery ? (
          <SearchX size={26} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <FileQuestion size={26} strokeWidth={1.75} aria-hidden="true" />
        )}
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}
      >
        {titleText}
      </h3>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          maxWidth: '500px',
          lineHeight: 1.6,
          marginBottom: '22px',
        }}
      >
        {searchQuery
          ? 'Try checking for typos, using a broader keyword (like "graph" or "pyq"), or searching across all courses.'
          : 'No one has uploaded notes or past papers for this section yet. You can clear your filters or be the first student to share material here.'}
      </p>

      {/* Action Triggers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {hasFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="daq-btn-secondary"
          >
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Clear filters</span>
          </button>
        )}

        {(subjectCode || unitNumber || searchQuery) && onSearchAllCourses && (
          <button
            type="button"
            onClick={onSearchAllCourses}
            className="daq-btn-secondary"
          >
            <Compass size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Search all courses</span>
          </button>
        )}

        <Link
          to="/upload"
          className="daq-btn-primary"
        >
          <Upload size={14} strokeWidth={2.2} aria-hidden="true" />
          <span>Upload the first resource</span>
        </Link>
      </div>
    </div>
  );
};
