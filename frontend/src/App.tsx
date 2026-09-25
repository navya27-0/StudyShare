import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Moon,
  Sun,
  Server,
  RefreshCw,
  Bookmark,
  ArrowUpRight,
} from 'lucide-react';

interface HealthData {
  status: string;
  service: string;
  environment: string;
  version: string;
  database: {
    status: string;
    latency_ms: number;
    error: string | null;
  };
  timestamp: string;
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/health`);
      if (!res.ok && res.status !== 503) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data: HealthData = await res.json();
      setHealth(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach API server';
      setError(message);
      setHealth(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Ledger Navigation Bar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'var(--accent-tint)',
              color: 'var(--accent-core)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              letterSpacing: '0.06em',
            }}
          >
            STUDYSHARE
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '17px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Academic Resource Ledger
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: '12px',
            }}
          >
            REGULATION R22
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleTheme}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'var(--font-mono)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 80ms ease',
            }}
          >
            {theme === 'light' ? (
              <>
                <Moon size={14} /> Dark Mode
              </>
            ) : (
              <>
                <Sun size={14} /> Light Mode
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Ledger Content */}
      <main
        style={{
          flex: 1,
          maxWidth: '1040px',
          width: '100%',
          margin: '0 auto',
          padding: '40px 24px',
        }}
      >
        {/* Monorepo Stack Health Bar */}
        <section
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--accent-core)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Fullstack Verification
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                Service Interconnect Status
              </h2>
            </div>

            <button
              onClick={checkHealth}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Pinging...' : 'Ping Stack'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Frontend Service */}
            <div
              style={{
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="var(--accent-core)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Frontend</span>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--status-verified)',
                  }}
                >
                  <CheckCircle2 size={13} /> ACTIVE
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                Vite + React 19 + TypeScript
              </div>
            </div>

            {/* Backend FastAPI Service */}
            <div
              style={{
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={16} color="var(--accent-core)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    FastAPI Backend
                  </span>
                </div>
                {health ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color:
                        health.status === 'healthy'
                          ? 'var(--status-verified)'
                          : 'var(--status-exam)',
                    }}
                  >
                    <CheckCircle2 size={13} /> {health.status.toUpperCase()}
                  </span>
                ) : error ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--status-danger)',
                    }}
                  >
                    <AlertCircle size={13} /> OFFLINE
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    CHECKING...
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                {health ? `${health.service} v${health.version}` : 'Target: ' + apiUrl}
              </div>
            </div>

            {/* Database Service */}
            <div
              style={{
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={16} color="var(--accent-core)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Database</span>
                </div>
                {health?.database ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color:
                        health.database.status === 'connected'
                          ? 'var(--status-verified)'
                          : 'var(--status-danger)',
                    }}
                  >
                    {health.database.status === 'connected' ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <AlertCircle size={13} />
                    )}
                    {health.database.status.toUpperCase()}
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    PENDING PING
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                {health?.database?.latency_ms
                  ? `Latency: ${health.database.latency_ms}ms`
                  : 'SQLAlchemy + Alembic'}
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: '16px',
                padding: '10px 14px',
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid var(--status-danger-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--status-danger)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} />
              <span>
                Backend communication error: {error}. Ensure backend is running at{' '}
                <code>{apiUrl}</code>.
              </span>
            </div>
          )}

          {lastChecked && (
            <div
              style={{
                marginTop: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                textAlign: 'right',
              }}
            >
              Last checked: {lastChecked}
            </div>
          )}
        </section>

        {/* Domain Taxonomy Architecture Preview */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: '24px',
          }}
        >
          {/* Left Taxonomy Tree Rail */}
          <aside
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 16px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '12px',
              }}
            >
              Curriculum Taxonomy
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent-tint)',
                  border: '1px solid var(--accent-border)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--accent-core)',
                  }}
                >
                  SUBJECT: CS301
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  Database Systems
                </div>
              </div>

              <div
                style={{
                  paddingLeft: '16px',
                  borderLeft: '2px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginTop: '4px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subdued)',
                  }}
                >
                  UNIT 01: Relational Model
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-muted)',
                  }}
                >
                  UNIT 02: Normalization & BCNF
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  UNIT 03: Indexing & B+ Trees
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  UNIT 04: Query Optimization
                </div>
              </div>
            </div>
          </aside>

          {/* Right Resource Stream Preview */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--accent-core)',
                    fontWeight: 600,
                  }}
                >
                  SUBJECT → UNIT → TOPIC LEDGER
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    fontWeight: 600,
                    marginTop: '2px',
                  }}
                >
                  Resource Catalog Baseline
                </h3>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                1 RESOURCE STAGED
              </span>
            </div>

            {/* Baseline Resource Card */}
            <div
              style={{
                position: 'relative',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                backgroundColor: 'var(--bg-canvas)',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '16px',
                alignItems: 'flex-start',
              }}
            >
              {/* Upvote Pill */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  minWidth: '44px',
                }}
              >
                <ArrowUpRight size={14} color="var(--accent-core)" />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--accent-core)',
                  }}
                >
                  94
                </span>
              </div>

              {/* Resource Content */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'var(--bg-muted)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    CS301 • UNIT 02
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'var(--status-verified-bg)',
                      color: 'var(--status-verified)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    ✓ 2024 CURRICULUM VERIFIED
                  </span>
                </div>
                <h4
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '16px',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  BCNF & 3NF Functional Dependency Decomposition Problem Set
                </h4>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>By Prof. Sundaram</span>
                  <span>•</span>
                  <span>PDF • 4.2 MB (28 pages)</span>
                  <span>•</span>
                  <span>Question Bank with step-by-step canonical covers</span>
                </div>
              </div>

              {/* Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                  title="Bookmark"
                >
                  <Bookmark size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        <div>StudyShare Monorepo • Scaffold Stage 0</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>/frontend (Vite)</span>
          <span>/backend (FastAPI)</span>
          <span>/infra (Docker)</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
