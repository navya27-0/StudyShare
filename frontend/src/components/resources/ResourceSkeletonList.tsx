import React from 'react';

interface ResourceSkeletonListProps {
  count?: number;
  viewMode?: 'dense' | 'compact';
}

export const ResourceSkeletonList: React.FC<ResourceSkeletonListProps> = ({
  count = 5,
  viewMode = 'dense',
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: viewMode === 'compact' ? '0' : '10px' }}>
      {/* Monospace Ledger Status */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-core)',
          letterSpacing: '0.06em',
          padding: '4px 2px',
        }}
      >
        // SYNCHRONIZING CURRICULUM LEDGER // RETRIEVING ARCHIVE RECORDS...
      </div>

      {Array.from({ length: count }).map((_, index) => {
        if (viewMode === 'compact') {
          return (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 100px 1fr 140px 90px 100px 80px',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div className="skeleton-bar" style={{ height: '18px', width: '60px' }} />
              <div className="skeleton-bar" style={{ height: '14px', width: '80px' }} />
              <div className="skeleton-bar" style={{ height: '16px', width: '70%' }} />
              <div className="skeleton-bar" style={{ height: '14px', width: '100px' }} />
              <div className="skeleton-bar" style={{ height: '14px', width: '40px' }} />
              <div className="skeleton-bar" style={{ height: '16px', width: '50px' }} />
              <div className="skeleton-bar" style={{ height: '18px', width: '40px', justifySelf: 'end' }} />
            </div>
          );
        }

        return (
          <div
            key={index}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Header row skeleton */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="skeleton-bar" style={{ height: '20px', width: '75px' }} />
                <div className="skeleton-bar" style={{ height: '16px', width: '140px' }} />
              </div>
              <div className="skeleton-bar" style={{ height: '20px', width: '24px' }} />
            </div>

            {/* Title skeleton */}
            <div className="skeleton-bar" style={{ height: '20px', width: index % 2 === 0 ? '75%' : '60%' }} />

            {/* Description skeleton */}
            <div className="skeleton-bar" style={{ height: '14px', width: '90%' }} />

            {/* Metadata row skeleton */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="skeleton-bar" style={{ height: '14px', width: '110px' }} />
              <div className="skeleton-bar" style={{ height: '14px', width: '70px' }} />
              <div className="skeleton-bar" style={{ height: '14px', width: '60px' }} />
            </div>

            {/* Footer row skeleton */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '10px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="skeleton-bar" style={{ height: '26px', width: '68px' }} />
                <div className="skeleton-bar" style={{ height: '26px', width: '60px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="skeleton-bar" style={{ height: '26px', width: '70px' }} />
                <div className="skeleton-bar" style={{ height: '26px', width: '90px' }} />
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        .skeleton-bar {
          background: linear-gradient(
            90deg,
            var(--bg-subdued) 25%,
            var(--bg-muted) 50%,
            var(--bg-subdued) 75%
          );
          background-size: 200% 100%;
          border-radius: var(--radius-sm);
          animation: skeleton-pulse 1.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }

        @keyframes skeleton-pulse {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};
