import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Moon,
  Sun,
  GraduationCap,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type ViewPhase = 'title' | 'fading_to_login' | 'login';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDoorClosing, setIsDoorClosing] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const [viewPhase, setViewPhase] = useState<ViewPhase>(() => {
    if ((location.state as { skipTitle?: boolean })?.skipTitle) return 'login';
    try {
      if (sessionStorage.getItem('studyshare_title_seen') === 'true') {
        return 'login';
      }
    } catch {
      // ignore
    }
    return 'title';
  });

  const advanceToLogin = useCallback(() => {
    try {
      sessionStorage.setItem('studyshare_title_seen', 'true');
    } catch {
      // ignore
    }
    setViewPhase((prev) => {
      if (prev === 'title') {
        setTimeout(() => {
          setViewPhase('login');
        }, 200);
        return 'fading_to_login';
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (viewPhase !== 'title') return;

    // Auto-advance after 2.4s
    const timer = setTimeout(() => {
      advanceToLogin();
    }, 2400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      advanceToLogin();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewPhase, advanceToLogin]);

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
      setIsDoorClosing(true);
      setTimeout(() => {
        navigate(from, { replace: true, state: { fromDoor: true } });
      }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid authentication credentials.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const fillQuickCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  // 1. Initial Application Title Screen with Architectural DAQ Styling
  if (viewPhase === 'title' || viewPhase === 'fading_to_login') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={advanceToLogin}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') advanceToLogin();
        }}
        className={viewPhase === 'fading_to_login' ? 'cinematic-fade-exit' : ''}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-canvas)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          userSelect: 'none',
          outline: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Header Ribbon */}
        <header
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            padding: '12px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
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
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>STUDYSHARE</span>
              <span className="daq-beacon" title="Network Active" />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
              }}
            >
              ACADEMIC INTELLIGENCE PLATFORM // v1.0.0
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                cursor: 'pointer',
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

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                advanceToLogin();
              }}
              className="daq-btn-secondary"
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em',
              }}
            >
              <span>ENTER NOW</span>
              <ArrowRight size={12} strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Center Presentation Viewport */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            position: 'relative',
          }}
        >
          <div
            style={{
              maxWidth: '840px',
              width: '100%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '52px 36px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 20px 48px -12px var(--shadow-sm)',
            }}
            className="daq-card"
          >
            {/* Corner Crosshairs */}
            <div className="daq-crosshair daq-crosshair-tl" />
            <div className="daq-crosshair daq-crosshair-tr" />
            <div className="daq-crosshair daq-crosshair-bl" />
            <div className="daq-crosshair daq-crosshair-br" />

            {/* Glowing StudyShare Emblem */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--accent-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-core)',
                marginBottom: '24px',
                boxShadow: '0 0 30px var(--accent-tint)',
              }}
            >
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>

            {/* Micro Telemetry Tag */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.18em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>// CENTRALIZED ACADEMIC REPOSITORY //</span>
            </div>

            {/* Display Title & Academic Motto */}
            <div style={{ marginBottom: '8px' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(38px, 6vw, 58px)',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  lineHeight: 1.05,
                  color: 'var(--text-primary)',
                  margin: '0 0 6px 0',
                }}
              >
                STUDYSHARE
              </h1>
              <div
                className="academic-serif-italic"
                style={{
                  fontSize: 'clamp(18px, 2.5vw, 24px)',
                  color: 'var(--text-secondary)',
                  letterSpacing: '-0.01em',
                  marginTop: '6px',
                }}
              >
                Curating Academic Intelligence &amp; Verified Curricula
              </div>
            </div>

            {/* Description */}
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14.5px',
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
                margin: '12px 0 30px 0',
                maxWidth: '620px',
              }}
            >
              Engineered exclusively for university scholars. Structured across Semesters 1 through 8
              with verifiable cryptographic hashes, faculty audit logs, and merit-backed peer review.
            </p>

            {/* Feature Pills */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '36px',
              }}
            >
              <span className="daq-tag">
                <GraduationCap size={11} strokeWidth={2} />
                SEM 1-8 TAXONOMY
              </span>
              <span className="daq-tag">
                <ShieldCheck size={11} strokeWidth={2} />
                FACULTY VERIFIED
              </span>
              <span className="daq-tag">
                <Sparkles size={11} strokeWidth={2} />
                REPUTATION PROTOCOL
              </span>
              <span className="daq-tag">
                <Compass size={11} strokeWidth={2} />
                ZERO GATEKEEPING
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                advanceToLogin();
              }}
              className="daq-btn-primary"
              style={{
                padding: '12px 36px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
                marginBottom: '20px',
              }}
            >
              <span>ENTER PLATFORM</span>
              <ArrowRight size={15} strokeWidth={2.2} />
            </button>

            {/* Hairline Auto-advance Progress Bar */}
            <div className="title-progress-track" title="Auto-advancing to sign in">
              <div className="title-progress-fill" />
            </div>

            {/* Micro Prompt */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                marginTop: '12px',
              }}
            >
              PRESS ANY KEY OR CLICK ANYWHERE TO CONTINUE
            </span>
          </div>
        </main>

        {/* Footer Ribbon */}
        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '12px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="daq-beacon" />
            <span>SESSION: ENCRYPTED // TLS 1.3 // ZERO-TRACKING ARCHIVE</span>
          </div>
          <div>REPUTATION LEDGER ACTIVE // 10 PTS BASELINE</div>
          <div>© 2026 STUDYSHARE ACADEMIC INFRASTRUCTURE</div>
        </footer>
      </div>
    );
  }

  return (
    <div
      className={isDoorClosing ? 'cinematic-fade-exit' : 'cinematic-fade-enter'}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setViewPhase('title')}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
            title="Replay Title Screen"
          >
            // TITLE SCREEN
          </button>

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
        </div>
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
            backgroundColor: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="daq-card"
        >
          <div className="daq-crosshair daq-crosshair-tl" />
          <div className="daq-crosshair daq-crosshair-tr" />
          <div className="daq-crosshair daq-crosshair-bl" />
          <div className="daq-crosshair daq-crosshair-br" />
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
                className="daq-btn-primary touch-target"
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: '13.5px',
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
