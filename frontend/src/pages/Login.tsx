import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Sparkles, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both student email and account password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid authentication credentials.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-canvas)',
      }}
    >
      {/* Top Ledger Ribbon */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'var(--accent-tint)',
              color: 'var(--accent-core)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              letterSpacing: '0.06em',
            }}
          >
            STUDYSHARE
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            ACADEMIC RESOURCE LEDGER // AUTHENTICATION
          </span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--bg-subdued)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
          }}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
        >
          {theme === 'light' ? (
            <>
              <Moon size={14} strokeWidth={1.75} />
              <span>NIGHT</span>
            </>
          ) : (
            <>
              <Sun size={14} strokeWidth={1.75} />
              <span>PAPER</span>
            </>
          )}
        </button>
      </header>

      {/* Main Ledger Split Workspace */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '920px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          }}
        >
          {/* Left Archival Context Panel */}
          <div
            style={{
              backgroundColor: 'var(--bg-subdued)',
              borderRight: '1px solid var(--border-subtle)',
              padding: '36px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--accent-core)',
                  backgroundColor: 'var(--accent-tint)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '20px',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}
              >
                <BookOpen size={14} strokeWidth={1.75} />
                <span>CURRICULUM ARCHIVE</span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '24px',
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  letterSpacing: '-0.02em',
                }}
              >
                High-Density Peer Resource Index
              </h1>

              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '28px',
                }}
              >
                Direct access to university courseware, verified syllabus breakdowns, past midterm problem sets,
                and peer notes catalogued by semester, subject, and unit.
              </p>

              {/* Ledger Principles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      minWidth: '22px',
                    }}
                  >
                    01
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    <strong>Subject Tree Indexing:</strong> Course syllabi broken down systematically from unit fundamentals to topic solutions.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      minWidth: '22px',
                    }}
                  >
                    02
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    <strong>Peer Consensus:</strong> Community voting, Bayesian rating curves, and verified faculty stamps.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      minWidth: '22px',
                    }}
                  >
                    03
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    <strong>Archival Integrity:</strong> Version-controlled updates and anti-rot moderation logs.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick-fill Seed Credentials */}
            <div
              style={{
                marginTop: '32px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                }}
              >
                <Sparkles size={13} strokeWidth={1.75} />
                <span>QUICK TEST CREDENTIALS</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('arvind.raman@student.univ.edu', 'StudyShare2024!')}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    padding: '5px 10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Fill Arvind (Student)
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('prof.sharma@university.edu', 'StudyShare2024!')}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    padding: '5px 10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-core)',
                  }}
                >
                  Fill Prof. Sharma (Admin)
                </button>
              </div>
            </div>
          </div>

          {/* Right Authentication Form Panel */}
          <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                ACCESS VERIFICATION
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                Sign In to StudyShare
              </h2>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: 'var(--status-danger-bg)',
                  border: '1px solid var(--status-danger-border)',
                  color: 'var(--status-danger)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                <AlertCircle size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="login-email"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                    letterSpacing: '0.02em',
                  }}
                >
                  INSTITUTIONAL EMAIL
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    htmlFor="login-password"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    PASSWORD
                  </label>
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--accent-core)',
                  color: '#FFFFFF',
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '14px',
                  letterSpacing: '0.02em',
                  opacity: isSubmitting ? 0.75 : 1,
                }}
              >
                {isSubmitting ? (
                  <span>AUTHENTICATING...</span>
                ) : (
                  <>
                    <KeyRound size={16} strokeWidth={1.75} />
                    <span>AUTHORIZE ACCESS</span>
                    <ArrowRight size={16} strokeWidth={1.75} />
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>New student or contributor?</span>
              <Link
                to="/signup"
                style={{
                  color: 'var(--accent-core)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Register profile
                <ArrowRight size={13} strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer System Status Bar */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '10px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={14} color="var(--status-verified)" strokeWidth={1.75} />
          <span>SHA-256 JWT ENCRYPTION // ARGON2/BCRYPT CREDENTIALS</span>
        </div>
        <div>STANDARDS COMPLIANT LEDGER</div>
      </footer>
    </div>
  );
};
