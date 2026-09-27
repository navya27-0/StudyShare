import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-canvas)',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
        }}
      >
        // CHECKING FACULTY AUTHORIZATION //
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid var(--status-danger)',
            padding: '28px',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <ShieldAlert size={22} color="var(--status-danger)" strokeWidth={1.75} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--status-danger)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              403 FORBIDDEN // ACCESS RESTRICTED
            </span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '10px',
            }}
          >
            Faculty & Moderation Authorization Required
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '20px',
            }}
          >
            The Moderation Ledger and Academic Administration portal is restricted to university faculty
            and appointed campus curators. Your account (<strong>{user?.email}</strong>) has standard student privileges.
          </p>

          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--accent-core)',
              padding: '8px 14px',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subdued)',
            }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            Return to Academic Catalog
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
