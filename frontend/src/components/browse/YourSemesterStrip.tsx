import React from 'react';
import { Sparkles } from 'lucide-react';
import type { SubjectItem } from '../../types';

interface YourSemesterStripProps {
  semester?: number | null;
  selectedCourseIds?: number[];
  enrolledCourses?: string[];
  subjects: SubjectItem[];
  activeSubjectCode?: string;
  onSelectCourse: (subjectCode: string) => void;
  onOpenOnboarding: () => void;
}

export const YourSemesterStrip: React.FC<YourSemesterStripProps> = ({
  semester,
  selectedCourseIds,
  enrolledCourses,
  subjects,
  activeSubjectCode,
  onSelectCourse,
  onOpenOnboarding,
}) => {
  // If student configured onboarding courses or semester
  const relevantSubjects = subjects.filter((s) => {
    if (selectedCourseIds && selectedCourseIds.length > 0) {
      return selectedCourseIds.includes(s.id);
    }
    if (enrolledCourses && enrolledCourses.length > 0) {
      return (
        enrolledCourses.includes(s.code.toUpperCase()) ||
        enrolledCourses.some((c) => s.name.toLowerCase().includes(c.toLowerCase()))
      );
    }
    if (semester) {
      return s.semester === semester;
    }
    return s.semester === 3;
  });

  if (relevantSubjects.length === 0) return null;

  return (
    <div className="daq-card p-3.5 bg-white/[0.02] flex items-center justify-between flex-wrap gap-2.5">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-amber-400 shrink-0" />
        <span className="font-semibold text-xs text-white">Your Courses</span>
        <span className="text-[11px] text-white/50">
          {semester ? `Semester ${semester}` : 'Quick Jump'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {relevantSubjects.map((sub) => {
          const isSelected = activeSubjectCode?.toUpperCase() === sub.code.toUpperCase();
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelectCourse(isSelected ? '' : sub.code)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                isSelected
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {sub.code}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenOnboarding}
          className="text-[11px] text-white/40 hover:text-white/80 underline ml-1"
        >
          Edit preferences
        </button>
      </div>
    </div>
  );
};
