import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowRight, AlertCircle, Award, CheckCircle2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [semester, setSemester] = useState<number>(3);
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDoorClosing, setIsDoorClosing] = useState(false);

  const { signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setError('Please provide email, password, and your full display name.');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signup({
        email,
        password,
        display_name: displayName,
        semester,
        department,
        bio: bio.trim() || undefined,
      });
      setIsDoorClosing(true);
      setTimeout(() => {
        navigate('/', { replace: true, state: { fromDoor: true } });
      }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please review your details.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={isDoorClosing ? 'door-exit-anim' : ''}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-canvas)',
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
            NEW CONTRIBUTOR REGISTRATION
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

      {/* Main Register Form Layout */}
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
            maxWidth: '960px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
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
          {/* Left Context Information */}
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
                  color: 'var(--status-verified)',
                  backgroundColor: 'var(--status-verified-bg)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '20px',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}
              >
                <Award size={14} strokeWidth={1.75} />
                <span>COMMUNITY REPUTATION</span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '24px',
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: 'var(--text-primary)',
                  marginBottom: '14px',
                  letterSpacing: '-0.02em',
                }}
              >
                Join the Campus Study Ledger
              </h1>

              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '24px',
                }}
              >
                Every student receives an automatic Contributor Profile linked to their university enrollment.
                Share verified notes, upvote exam questions, and build academic standing.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <CheckCircle2 size={16} color="var(--status-verified)" strokeWidth={1.75} style={{ marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      +10 Welcome Reputation Points
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                      Awarded immediately upon account registration.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <CheckCircle2 size={16} color="var(--status-verified)" strokeWidth={1.75} style={{ marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      Automatic Semester Personalization
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                      Quick-filter to relevant syllabus branches based on your current semester.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <CheckCircle2 size={16} color="var(--status-verified)" strokeWidth={1.75} style={{ marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      Versioned Resource Uploads
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                      Publish PDFs, question banks, and lab manuals with automated audit trails.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '32px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              DATA INTEGRITY POLICY // ZERO SPAM TOLERANCE
            </div>
          </div>

          {/* Right Form Container */}
          <div style={{ padding: '36px 32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                }}
              >
                ENROLLMENT FORM
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
                Create Student Account
              </h2>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: 'var(--status-danger-bg)',
                  border: '1px solid var(--status-danger-border)',
                  color: 'var(--status-danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  htmlFor="signup-display-name"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  FULL NAME / DISPLAY IDENTITY
                </label>
                <input
                  id="signup-display-name"
                  type="text"
                  required
                  placeholder="e.g. Arvind Raman"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  INSTITUTIONAL EMAIL
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="student@univ.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  PASSWORD (MIN 8 CHARACTERS)
                </label>
                <input
                  id="signup-password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label
                    htmlFor="signup-semester"
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: '4px',
                    }}
                  >
                    SEMESTER
                  </label>
                  <select
                    id="signup-semester"
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    style={{ width: '100%' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="signup-department"
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: '4px',
                    }}
                  >
                    DEPARTMENT
                  </label>
                  <input
                    id="signup-department"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-bio"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  CONTRIBUTOR BIO (OPTIONAL)
                </label>
                <input
                  id="signup-bio"
                  type="text"
                  placeholder="e.g. 3rd-year CS student focusing on Algorithms & Systems"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={{ width: '100%' }}
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
                  <span>REGISTERING...</span>
                ) : (
                  <>
                    <UserPlus size={16} strokeWidth={1.75} />
                    <span>ENROLL & PROVISION PROFILE</span>
                    <ArrowRight size={16} strokeWidth={1.75} />
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Already hold a student ledger identity?</span>
              <Link
                to="/login"
                style={{
                  color: 'var(--accent-core)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Sign in
                <ArrowRight size={13} strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
