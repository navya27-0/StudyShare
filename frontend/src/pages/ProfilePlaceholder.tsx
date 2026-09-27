import React from 'react';
import { useAuth } from '../context/AuthContext';

export const ProfilePlaceholder: React.FC = () => {
  const { user } = useAuth();
  const profile = user?.contributor_profile;

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
          ACADEMIC IDENTITY // CONTRIBUTOR PROFILE
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
          {user?.display_name || 'Student Profile'}
        </h1>
      </div>

      {/* Profile Overview Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '28px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-tint)',
              border: '2px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-core)',
              fontFamily: 'var(--font-mono)',
              fontSize: '22px',
              fontWeight: 700,
            }}
          >
            {user?.display_name?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '19px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {user?.display_name}
              </h2>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor:
                    user?.role === 'admin'
                      ? 'var(--status-danger-bg)'
                      : 'var(--status-verified-bg)',
                  color:
                    user?.role === 'admin'
                      ? 'var(--status-danger)'
                      : 'var(--status-verified)',
                  textTransform: 'uppercase',
                }}
              >
                {user?.role === 'admin' ? 'FACULTY ADMIN' : 'STUDENT'}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {user?.email} • {profile?.department || 'Computer Science & Engineering'}
            </div>
          </div>
        </div>

        {profile?.bio && (
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '24px',
              fontStyle: 'italic',
            }}
          >
            &ldquo;{profile.bio}&rdquo;
          </p>
        )}

        {/* Reputation and Contributor Stat Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '20px',
          }}
        >
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              REPUTATION SCORE
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--accent-core)',
                marginTop: '4px',
              }}
            >
              ★ {profile?.reputation_points ?? 10}
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              RESOURCES UPLOADED
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: '4px',
              }}
            >
              {profile?.total_uploads ?? 0}
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              UPVOTES EARNED
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: '4px',
              }}
            >
              {profile?.total_upvotes_received ?? 0}
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              SEMESTER
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: '4px',
              }}
            >
              Sem {profile?.semester ?? 3}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
