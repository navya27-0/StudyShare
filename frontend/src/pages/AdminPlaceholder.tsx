import React from 'react';
import { ShieldCheck, AlertTriangle, UserX, ScrollText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminPlaceholder: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--status-danger)',
            letterSpacing: '0.06em',
            marginBottom: '2px',
          }}
        >
          RESTRICTED LEDGER // FACULTY MODERATION PORTAL
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
          Moderation & Accountability Desk
        </h1>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '28px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <ShieldCheck size={22} color="var(--status-verified)" strokeWidth={1.75} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--status-verified)',
              letterSpacing: '0.04em',
            }}
          >
            ACTIVE FACULTY SESSION: {user?.display_name} ({user?.email})
          </span>
        </div>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          Welcome to the administrative console. This portal connects to the backend moderation endpoints:
          resolving open reports, soft-deleting/restoring problematic resources, banning malicious accounts, and reviewing
          the immutable <code>moderation_actions</code> audit log.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-exam)' }}>
              <AlertTriangle size={16} strokeWidth={1.75} />
              <strong style={{ fontSize: '13px' }}>Open Reports Queue</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Review student flags regarding outdated syllabi or broken files.
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-danger)' }}>
              <UserX size={16} strokeWidth={1.75} />
              <strong style={{ fontSize: '13px' }}>Account Governance</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Ban bad actors and suspend compromised student accounts.
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
              <ScrollText size={16} strokeWidth={1.75} />
              <strong style={{ fontSize: '13px' }}>Moderation Log</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Inspect immutable audit trail of past administrative actions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
