import React from 'react';
import { Bookmark } from 'lucide-react';

export const BookmarksPlaceholder: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            marginBottom: '2px',
          }}
        >
          REVISION DESK // PERSONAL REPOSITORY
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
          Saved Revision Resources
        </h1>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--radius-sm)',
          padding: '60px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
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
          <Bookmark size={24} strokeWidth={1.75} />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            color: 'var(--accent-core)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}
        >
          BOOKMARKS ROUTE ACTIVE
        </div>

        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Personal Study Vault
        </h3>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            lineHeight: 1.6,
          }}
        >
          This authenticated route (<code>/bookmarks</code>) interfaces with <code>GET /users/:id/bookmarks</code> to display
          resources saved for upcoming exams and lab preparation.
        </p>
      </div>
    </div>
  );
};
