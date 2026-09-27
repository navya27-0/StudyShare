import React from 'react';
import { useLocation } from 'react-router-dom';
import { Layers, Filter, Sparkles } from 'lucide-react';

export const BrowsePlaceholder: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const subjectCode = searchParams.get('subject_code');
  const unitId = searchParams.get('unit_id');
  const topicId = searchParams.get('topic_id');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Feed Ledger Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
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
            CATALOG REPOSITORY // LIVE INDEX
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
            {subjectCode ? `Curriculum: ${subjectCode}` : 'All Academic Resources'}
          </h1>
        </div>

        {/* Filter State Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Filter size={13} strokeWidth={1.75} />
            <span>
              {subjectCode
                ? `Subject: ${subjectCode}${unitId ? ` > Unit ${unitId}` : ''}${topicId ? ` > Topic ${topicId}` : ''}`
                : 'Showing All Branches'}
            </span>
          </div>
        </div>
      </div>

      {/* Empty Authenticated Shell Frame */}
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
          <Layers size={24} strokeWidth={1.75} />
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
          AUTHENTICATED APP SHELL ACTIVE
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
          Academic Resource Feed Shell
        </h3>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          You are successfully authenticated. The navigation rail on the left reflects the real academic
          taxonomy tree (Subject &rarr; Unit &rarr; Topic). Ready for the resource cards, filters, and full-text search integration.
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-subdued)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Sparkles size={14} strokeWidth={1.75} />
          <span>PROMPT 3 APP SHELL COMPLETED // READY FOR PROMPT 4 RESOURCE IMPLEMENTATION</span>
        </div>
      </div>
    </div>
  );
};
