import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  GraduationCap,
  Sparkles,
  Sun,
  Moon,
  Eye,
  Wifi,
  X,
  Upload,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { SubjectWithHierarchy } from '../../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectWithHierarchy[];
  onApplyCourseFilter?: (subjectId: number | undefined, semester: number | null) => void;
}

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Mathematics & Computing',
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onApplyCourseFilter,
}) => {
  const {
    theme,
    setTheme,
    readingMode,
    setReadingMode,
    lowBandwidthMode,
    setLowBandwidthMode,
    preferences,
    updatePreferences,
  } = useTheme();

  const [university, setUniversity] = useState(preferences.university || '');
  const [department, setDepartment] = useState(
    preferences.department || 'Computer Science & Engineering'
  );
  const [semester, setSemester] = useState<number | null>(preferences.semester ?? 3);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>(
    preferences.selectedCourseIds || []
  );
  const [wantsToContribute, setWantsToContribute] = useState<boolean>(
    preferences.wantsToContribute ?? true
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUniversity(preferences.university || '');
      setDepartment(preferences.department || 'Computer Science & Engineering');
      setSemester(preferences.semester ?? 3);
      setSelectedCourseIds(preferences.selectedCourseIds || []);
      setWantsToContribute(preferences.wantsToContribute ?? true);
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, preferences]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleCourse = (id: number) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSemesterSelect = (sem: number | null) => {
    setSemester(sem);
    if (sem !== null && selectedCourseIds.length === 0) {
      const matching = subjects.filter((s) => s.semester === sem).map((s) => s.id);
      if (matching.length > 0) {
        setSelectedCourseIds(matching);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences({
      university: university.trim(),
      department: department.trim(),
      semester,
      selectedCourseIds,
      wantsToContribute,
      readingMode,
      lowBandwidthMode,
      completedAt: new Date().toISOString(),
    });
    if (onApplyCourseFilter) {
      onApplyCourseFilter(undefined, semester);
    }
    onClose();
  };

  const sortedSubjects = [...subjects].sort((a, b) => {
    if (semester !== null) {
      const aMatch = a.semester === semester ? 0 : 1;
      const bMatch = b.semester === semester ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return a.semester - b.semester || a.code.localeCompare(b.code);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      aria-describedby="onboarding-modal-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        ref={dialogRef}
        className="daq-card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="daq-tag" style={{ color: 'var(--status-verified)', borderColor: 'var(--status-verified-border)' }}>
                <Sparkles size={11} /> Personalize StudyShare
              </span>
            </div>
            <h2
              id="onboarding-modal-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Set up your semester & study preferences
            </h2>
            <p
              id="onboarding-modal-desc"
              style={{
                fontSize: '13.5px',
                color: 'var(--text-muted)',
                marginTop: '4px',
              }}
            >
              Tell us what courses you are taking so we can pin your subjects, highlight relevant notes and past papers, and adjust reading comfort.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close personalization dialog"
            className="touch-target"
            style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              minHeight: '36px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. University & Department */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
            }}
          >
            <div>
              <label
                htmlFor="onboarding-university"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                University or Institution
              </label>
              <input
                ref={firstInputRef}
                id="onboarding-university"
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g., NIT Trichy, IIT Delhi, Anna University"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label
                htmlFor="onboarding-department"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Department / Major
              </label>
              <select
                id="onboarding-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: '100%' }}
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Semester Selection */}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Your Current Semester
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                const isSelected = semester === sem;
                return (
                  <button
                    key={sem}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSemesterSelect(isSelected ? null : sem)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 700 : 500,
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: isSelected ? 'var(--accent-core)' : 'var(--bg-subdued)',
                      color: isSelected ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                      border: isSelected
                        ? '1px solid var(--accent-core)'
                        : '1px solid var(--border-subtle)',
                    }}
                  >
                    Sem {sem}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Courses Selection */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                Select Your Courses ({selectedCourseIds.length} pinned)
              </span>
              {selectedCourseIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCourseIds([])}
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    textDecoration: 'underline',
                  }}
                >
                  Clear selection
                </button>
              )}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '8px',
                maxHeight: '175px',
                overflowY: 'auto',
                padding: '10px',
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {sortedSubjects.map((subj) => {
                const checked = selectedCourseIds.includes(subj.id);
                return (
                  <button
                    key={subj.id}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleCourse(subj.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'left',
                      backgroundColor: checked ? 'var(--accent-tint)' : 'var(--bg-surface)',
                      border: checked
                        ? '1px solid var(--accent-core)'
                        : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {subj.code}{' '}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                          · Sem {subj.semester}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {subj.name}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '3px',
                        border: checked
                          ? '1px solid var(--accent-core)'
                          : '1px solid var(--border-strong)',
                        backgroundColor: checked ? 'var(--accent-core)' : 'transparent',
                        color: checked ? 'var(--accent-contrast)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={12} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Display, Reading Comfort & Bandwidth */}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Theme, Reading Comfort & Connection
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
                gap: '10px',
              }}
            >
              {/* Theme toggle */}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subdued)',
                  border: '1px solid var(--border-strong)',
                  textAlign: 'left',
                }}
              >
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Click to switch theme
                  </div>
                </div>
              </button>

              {/* Reading Mode toggle */}
              <button
                type="button"
                aria-pressed={readingMode === 'comfortable'}
                onClick={() =>
                  setReadingMode(readingMode === 'comfortable' ? 'standard' : 'comfortable')
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor:
                    readingMode === 'comfortable' ? 'var(--accent-tint)' : 'var(--bg-subdued)',
                  border:
                    readingMode === 'comfortable'
                      ? '1px solid var(--accent-core)'
                      : '1px solid var(--border-subtle)',
                  textAlign: 'left',
                }}
              >
                <Eye size={16} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {readingMode === 'comfortable' ? 'Comfortable Reading' : 'Standard Density'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Larger text & relaxed spacing
                  </div>
                </div>
              </button>

              {/* Low-bandwidth mode */}
              <button
                type="button"
                aria-pressed={lowBandwidthMode}
                onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: lowBandwidthMode ? 'var(--accent-tint)' : 'var(--bg-subdued)',
                  border: lowBandwidthMode
                    ? '1px solid var(--accent-core)'
                    : '1px solid var(--border-subtle)',
                  textAlign: 'left',
                }}
              >
                <Wifi size={16} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lowBandwidthMode ? 'Lite Mode: ON' : 'Lite Mode: OFF'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Faster on slow campus Wi-Fi
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 5. Contribution Preference */}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              How do you plan to use StudyShare?
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                aria-pressed={wantsToContribute}
                onClick={() => setWantsToContribute(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: wantsToContribute ? 'var(--accent-tint)' : 'var(--bg-subdued)',
                  border: wantsToContribute
                    ? '1px solid var(--accent-core)'
                    : '1px solid var(--border-subtle)',
                  textAlign: 'left',
                }}
              >
                <Upload size={16} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Find & Share Notes
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    I want to upload notes or PYQs too
                  </div>
                </div>
              </button>

              <button
                type="button"
                aria-pressed={!wantsToContribute}
                onClick={() => setWantsToContribute(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: !wantsToContribute ? 'var(--accent-tint)' : 'var(--bg-subdued)',
                  border: !wantsToContribute
                    ? '1px solid var(--accent-core)'
                    : '1px solid var(--border-subtle)',
                  textAlign: 'left',
                }}
              >
                <BookOpen size={16} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Study & Exam Prep
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Mostly finding & downloading notes
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <GraduationCap size={15} />
              <span>You can update your courses anytime from the home page.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button" onClick={onClose} className="daq-btn-secondary">
                Skip for now
              </button>
              <button type="submit" className="daq-btn-primary">
                <Check size={14} /> Save My Setup
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
