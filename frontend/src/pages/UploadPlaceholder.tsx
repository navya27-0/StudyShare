import React from 'react';
import { FileUp } from 'lucide-react';

export const UploadPlaceholder: React.FC = () => {
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
          CURRICULUM INGESTION // DISPATCH PORTAL
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
          Upload Academic Resource
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
          <FileUp size={24} strokeWidth={1.75} />
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
          UPLOAD SHELL READY
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
          Document Dispatch & Ingestion Shell
        </h3>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            lineHeight: 1.6,
            marginBottom: '16px',
          }}
        >
          This authenticated route (<code>/upload</code>) will host the multi-part file uploader, syllabus topic selector,
          and document classification pipeline.
        </p>
      </div>
    </div>
  );
};
