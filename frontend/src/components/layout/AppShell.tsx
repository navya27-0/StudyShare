import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  Upload,
  Bookmark,
  ShieldAlert,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { SubjectItem } from '../../types';
import { taxonomyApi } from '../../services/api';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<number, boolean>>({ 1: true });
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch academic taxonomy tree on mount
  useEffect(() => {
    let mounted = true;
    taxonomyApi.getSubjectsTree().then((data) => {
      if (mounted) {
        setSubjects(data);
        if (data.length > 0) {
          setExpandedSubjects((prev) => ({ ...prev, [data[0].id]: true }));
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-close mobile drawer when location key changes
  const [prevLocationKey, setPrevLocationKey] = useState(location.key);
  if (prevLocationKey !== location.key) {
    setPrevLocationKey(location.key);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }

  // Handle escape key and lock body scroll when mobile menu is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const toggleSubject = (subjectId: number) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const toggleUnit = (unitId: number) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const searchParams = new URLSearchParams(location.search);
  const activeSubjectCode = searchParams.get('subject_code');
  const activeUnitId = searchParams.get('unit_id');
  const activeTopicId = searchParams.get('topic_id');

  // Find active subject for breadcrumbs
  const currentSubject = subjects.find(
    (s) => s.code.toUpperCase() === (activeSubjectCode || '').toUpperCase()
  );
  const currentUnit = currentSubject?.units?.find(
    (u) => String(u.id) === String(activeUnitId)
  );
  const currentTopic = currentUnit?.topics?.find(
    (t) => String(t.id) === String(activeTopicId)
  );

  const filteredSubjects = subjects.filter((s) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase();
    return (
      s.code.toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query) ||
      s.units?.some(
        (u) =>
          u.title.toLowerCase().includes(query) ||
          u.topics?.some((t) => t.title.toLowerCase().includes(query))
      )
    );
  });

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            zIndex: 40,
          }}
        />
      )}

      {/* 260px Left Sidebar Rail */}
      <aside
        style={{
          width: '270px',
          flexShrink: 0,
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subdued)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`sidebar-rail ${mobileMenuOpen ? 'mobile-open' : ''}`}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              Academic Ledger
            </span>
          </Link>

          {mobileMenuOpen && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              style={{ padding: '4px', color: 'var(--text-muted)' }}
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Primary Navigation Links */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13.5px',
                fontWeight: 500,
                color:
                  location.pathname === '/' && !location.search
                    ? 'var(--accent-core)'
                    : 'var(--text-primary)',
                backgroundColor:
                  location.pathname === '/' && !location.search
                    ? 'var(--accent-tint)'
                    : 'transparent',
              }}
            >
              <Layers size={16} strokeWidth={1.75} />
              <span>Browse Catalog</span>
            </Link>

            <Link
              to="/upload"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13.5px',
                fontWeight: 500,
                color:
                  location.pathname === '/upload' ? 'var(--accent-core)' : 'var(--text-primary)',
                backgroundColor:
                  location.pathname === '/upload' ? 'var(--accent-tint)' : 'transparent',
              }}
            >
              <Upload size={16} strokeWidth={1.75} />
              <span>Upload Resource</span>
            </Link>

            <Link
              to="/bookmarks"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13.5px',
                fontWeight: 500,
                color:
                  location.pathname === '/bookmarks'
                    ? 'var(--accent-core)'
                    : 'var(--text-primary)',
                backgroundColor:
                  location.pathname === '/bookmarks' ? 'var(--accent-tint)' : 'transparent',
              }}
            >
              <Bookmark size={16} strokeWidth={1.75} />
              <span>Saved Resources</span>
            </Link>

            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13.5px',
                fontWeight: 500,
                color:
                  location.pathname === '/profile'
                    ? 'var(--accent-core)'
                    : 'var(--text-primary)',
                backgroundColor:
                  location.pathname === '/profile' ? 'var(--accent-tint)' : 'transparent',
              }}
            >
              <UserIcon size={16} strokeWidth={1.75} />
              <span>Contributor Profile</span>
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--status-danger)',
                  backgroundColor:
                    location.pathname === '/admin'
                      ? 'var(--status-danger-bg)'
                      : 'transparent',
                }}
              >
                <ShieldAlert size={16} strokeWidth={1.75} />
                <span>Moderation Portal</span>
              </Link>
            )}
          </div>
        </div>

        {/* Academic Hierarchy Tree Section */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              padding: '0 4px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              CURRICULUM TREE
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}
            >
              SEM 1-8
            </span>
          </div>

          {/* Quick Filter */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Search size={13} strokeWidth={1.75} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Jump to course code..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  border: 'none',
                  padding: 0,
                  fontSize: '12px',
                  width: '100%',
                  background: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Subject -> Unit -> Topic Tree Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredSubjects.map((subject) => {
              const isExpanded = !!expandedSubjects[subject.id];
              const isSelectedSubject =
                activeSubjectCode?.toUpperCase() === subject.code.toUpperCase();

              return (
                <div key={subject.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Subject Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelectedSubject
                        ? 'var(--accent-tint)'
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSubject(subject.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubject(subject.id);
                        }}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${subject.code} ${subject.name}`}
                        style={{ padding: '4px', color: 'var(--text-muted)' }}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                        )}
                      </button>

                      <Link
                        to={`/?subject_code=${subject.code}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isSelectedSubject
                              ? 'var(--accent-core)'
                              : 'var(--text-primary)',
                          }}
                        >
                          {subject.code}
                        </span>
                        <span
                          title={subject.name}
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {subject.name}
                        </span>
                      </Link>
                    </div>

                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9.5px',
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-muted)',
                        padding: '1px 5px',
                        borderRadius: '2px',
                        flexShrink: 0,
                      }}
                    >
                      S{subject.semester}
                    </span>
                  </div>

                  {/* Units Tree */}
                  {isExpanded && subject.units && (
                    <div
                      style={{
                        paddingLeft: '18px',
                        marginLeft: '8px',
                        borderLeft: '1px dashed var(--border-strong)',
                        marginTop: '2px',
                        marginBottom: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      {subject.units.map((unit) => {
                        const unitExpanded = !!expandedUnits[unit.id];
                        const isSelectedUnit =
                          isSelectedSubject && String(activeUnitId) === String(unit.id);

                        return (
                          <div key={unit.id}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 6px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: isSelectedUnit
                                  ? 'var(--accent-tint)'
                                  : 'transparent',
                                cursor: 'pointer',
                              }}
                              onClick={() => toggleUnit(unit.id)}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleUnit(unit.id);
                                }}
                                aria-expanded={unitExpanded}
                                aria-label={`${unitExpanded ? 'Collapse' : 'Expand'} Unit ${unit.unit_number}: ${unit.title}`}
                                style={{ padding: '4px', color: 'var(--text-muted)' }}
                              >
                                {unitExpanded ? (
                                  <ChevronDown size={12} strokeWidth={1.75} aria-hidden="true" />
                                ) : (
                                  <ChevronRight size={12} strokeWidth={1.75} aria-hidden="true" />
                                )}
                              </button>

                              <Link
                                to={`/?subject_code=${subject.code}&unit_id=${unit.id}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: '12px',
                                  color: isSelectedUnit
                                    ? 'var(--accent-core)'
                                    : 'var(--text-secondary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={`Unit ${unit.unit_number}: ${unit.title}`}
                              >
                                <strong style={{ fontFamily: 'var(--font-mono)' }}>
                                  U{unit.unit_number}:
                                </strong>{' '}
                                {unit.title}
                              </Link>
                            </div>

                            {/* Topics Tree */}
                            {unitExpanded && unit.topics && (
                              <div
                                style={{
                                  paddingLeft: '16px',
                                  marginLeft: '6px',
                                  borderLeft: '1px dotted var(--border-subtle)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  marginTop: '2px',
                                }}
                              >
                                {unit.topics.map((topic) => {
                                  const isSelectedTopic =
                                    isSelectedUnit && String(activeTopicId) === String(topic.id);
                                  return (
                                    <Link
                                      key={topic.id}
                                      to={`/?subject_code=${subject.code}&unit_id=${unit.id}&topic_id=${topic.id}`}
                                      style={{
                                        fontSize: '11.5px',
                                        padding: '3px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        color: isSelectedTopic
                                          ? 'var(--accent-core)'
                                          : 'var(--text-muted)',
                                        backgroundColor: isSelectedTopic
                                          ? 'var(--accent-tint)'
                                          : 'transparent',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                      title={topic.title}
                                    >
                                      • {topic.title}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-tint)',
                  border: '1px solid var(--accent-border)',
                  color: 'var(--accent-core)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0,
                }}
              >
                {user?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.display_name || 'Student'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 700,
                      color:
                        user?.role === 'admin'
                          ? 'var(--status-danger)'
                          : 'var(--status-verified)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {user?.role === 'admin' ? 'FACULTY ADMIN' : 'STUDENT'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--accent-core)',
                    }}
                  >
                    ★ {user?.contributor_profile?.reputation_points ?? 10} pts
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Quick Actions (Dark Mode + Logout) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-subdued)',
              }}
              title="Toggle theme palette"
            >
              {theme === 'light' ? (
                <>
                  <Moon size={13} strokeWidth={1.75} />
                  <span>DARK MODE</span>
                </>
              ) : (
                <>
                  <Sun size={13} strokeWidth={1.75} />
                  <span>LIGHT MODE</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                color: 'var(--text-muted)',
                padding: '4px 8px',
              }}
              title="Sign out"
            >
              <LogOut size={13} strokeWidth={1.75} />
              <span>EXIT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Breadcrumb & Quick Action Bar */}
        <header
          className="app-header"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Breadcrumb Trail */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open syllabus tree"
              aria-expanded={mobileMenuOpen}
              aria-controls="curriculum-sidebar"
              style={{
                display: 'none',
                padding: '8px',
                marginRight: '2px',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
              }}
              className="mobile-menu-btn touch-target"
            >
              <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>

            {/* Breadcrumb Links */}
            <nav
              aria-label="Breadcrumb"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              <Link
                to="/"
                style={{
                  color: !currentSubject ? 'var(--accent-core)' : 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                CURRICULUM
              </Link>

              {currentSubject && (
                <>
                  <span style={{ color: 'var(--text-muted)' }} aria-hidden="true">/</span>
                  <Link
                    to={`/?subject_code=${currentSubject.code}`}
                    style={{
                      color: !currentUnit ? 'var(--accent-core)' : 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {currentSubject.code}
                  </Link>
                </>
              )}

              {currentUnit && (
                <>
                  <span style={{ color: 'var(--text-muted)' }} aria-hidden="true">/</span>
                  <Link
                    to={`/?subject_code=${currentSubject?.code}&unit_id=${currentUnit.id}`}
                    style={{
                      color: !currentTopic ? 'var(--accent-core)' : 'var(--text-secondary)',
                      fontWeight: 500,
                    }}
                  >
                    U{currentUnit.unit_number}
                  </Link>
                </>
              )}

              {currentTopic && (
                <>
                  <span style={{ color: 'var(--text-muted)' }} aria-hidden="true">/</span>
                  <span style={{ color: 'var(--accent-core)', fontWeight: 600 }}>
                    {currentTopic.title}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              to="/upload"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--accent-core)',
                color: '#FFFFFF',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
              }}
              title="Upload academic resource"
              className="touch-target"
            >
              <Upload size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="upload-text-full">UPLOAD NOTE / PYQ</span>
              <span className="upload-text-compact" style={{ display: 'none' }}>UPLOAD</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Routed Content Container */}
        <main
          className="app-main-content mobile-nav-pad"
          style={{ flex: 1, padding: '24px 28px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Dock (Active on screen width < 768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="mobile-bottom-nav"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          zIndex: 45,
          padding: '0 6px',
          alignItems: 'center',
          justifyContent: 'space-around',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* 1. Catalog */}
        <Link
          to="/"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            padding: '6px 10px',
            color: location.pathname === '/' && !location.search ? 'var(--accent-core)' : 'var(--text-secondary)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
          className="touch-target"
        >
          <Layers size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>CATALOG</span>
        </Link>

        {/* 2. Syllabus Tree Drawer trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open Curriculum Syllabus Drawer"
          aria-expanded={mobileMenuOpen}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            padding: '6px 10px',
            color: activeSubjectCode ? 'var(--accent-core)' : 'var(--text-secondary)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            position: 'relative',
          }}
          className="touch-target"
        >
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>SYLLABUS</span>
          {activeSubjectCode && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '12px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-core)',
              }}
              aria-hidden="true"
            />
          )}
        </button>

        {/* 3. Upload (Quick Contribution) */}
        <Link
          to="/upload"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            padding: '6px 10px',
            color: location.pathname === '/upload' ? 'var(--accent-core)' : 'var(--text-secondary)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
          className="touch-target"
        >
          <Upload size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>UPLOAD</span>
        </Link>

        {/* 4. Bookmarks */}
        <Link
          to="/bookmarks"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            padding: '6px 10px',
            color: location.pathname === '/bookmarks' ? 'var(--accent-core)' : 'var(--text-secondary)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
          className="touch-target"
        >
          <Bookmark size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>SAVED</span>
        </Link>

        {/* 5. Profile or Admin Portal */}
        {user?.role === 'admin' ? (
          <Link
            to="/admin"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '6px 10px',
              color: location.pathname === '/admin' ? 'var(--status-danger)' : 'var(--text-secondary)',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
            className="touch-target"
          >
            <ShieldAlert size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>ADMIN</span>
          </Link>
        ) : (
          <Link
            to="/profile"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '6px 10px',
              color: location.pathname === '/profile' ? 'var(--accent-core)' : 'var(--text-secondary)',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
            className="touch-target"
          >
            <UserIcon size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>PROFILE</span>
          </Link>
        )}
      </nav>

      <style>{`
        @media (max-width: 1023px) {
          .sidebar-rail {
            position: fixed !important;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            box-shadow: var(--shadow-md);
          }
          .sidebar-rail.mobile-open {
            transform: translateX(0);
          }
          .mobile-menu-btn {
            display: inline-flex !important;
          }
          .app-main-content {
            padding: 20px 20px !important;
          }
        }

        @media (max-width: 767px) {
          .mobile-bottom-nav {
            display: flex !important;
          }
          .app-header {
            padding: 10px 14px !important;
          }
          .app-main-content {
            padding: 14px 12px 82px !important;
          }
          .upload-text-full {
            display: none !important;
          }
          .upload-text-compact {
            display: inline !important;
          }
        }
      `}</style>
    </div>
  );
};
