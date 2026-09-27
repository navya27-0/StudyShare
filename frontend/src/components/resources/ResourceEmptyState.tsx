import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Upload, RotateCcw, SearchX } from 'lucide-react';

interface ResourceEmptyStateProps {
  searchQuery?: string;
  subjectCode?: string;
  unitNumber?: number;
  hasFilters: boolean;
  onResetFilters: () => void;
}

export const ResourceEmptyState: React.FC<ResourceEmptyStateProps> = ({
  searchQuery,
  subjectCode,
  unitNumber,
  hasFilters,
  onResetFilters,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px dashed var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        padding: '56px 24px',
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
          <SearchX size={26} strokeWidth={1.75} />
        ) : (
          <FileQuestion size={26} strokeWidth={1.75} />
        )}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--accent-core)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}
      >
        // ARCHIVAL RECORD NOTICE //
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '10px',
        }}
      >
        {searchQuery
          ? `No Records Matching "${searchQuery}"`
          : subjectCode
            ? `No Resources Logged for ${subjectCode}${unitNumber ? ` (Unit 0${unitNumber})` : ''}`
            : 'No Academic Resources Located'}
      </h3>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          maxWidth: '520px',
          lineHeight: 1.6,
          marginBottom: '24px',
        }}
      >
        {searchQuery
          ? 'Check your search terms for spelling typos or broaden your filter criteria to scan across adjacent course branches.'
          : 'Be the first student or faculty member to contribute lecture notes, past exam problem sets, or verified lab records for this curriculum node.'}
      </p>

      {/* Action Triggers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {hasFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <RotateCcw size={14} strokeWidth={1.75} />
            <span>RESET ALL FILTERS</span>
          </button>
        )}

        <Link
          to="/upload"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12.5px',
            fontWeight: 600,
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-core)',
            color: '#FFFFFF',
          }}
        >
          <Upload size={14} strokeWidth={1.75} />
          <span>UPLOAD FIRST RESOURCE</span>
        </Link>
      </div>
    </div>
  );
};
