import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, History, Star, ThumbsUp } from 'lucide-react';

export const ResourceDetailPlaceholder: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--accent-core)',
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.75} />
        Back to Resource Feed
      </Link>

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '32px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}
        >
          RESOURCE INSPECTION LEDGER // ID: {id}
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Resource Detail Shell
        </h1>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
          This view shell is wired into the client router for <code>/resources/:id</code>. It provides structured slots for
          file preview, version history, Bayesian 1-5 star ratings, and upvote/downvote interactions.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <History size={16} strokeWidth={1.75} />
              <strong style={{ fontSize: '13px' }}>Version History</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Immutable version audits and updates.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Star size={16} strokeWidth={1.75} />
              <strong style={{ fontSize: '13px' }}>Peer Rating (1-5★)</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Calculated via Bayesian average score.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <ThumbsUp size={16} strokeWidth={1.75} />
              <strong style={{ fontSize: '13px' }}>Vote Balance</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Toggle and direction-switch logic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
