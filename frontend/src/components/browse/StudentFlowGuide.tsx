import React from 'react';
import { BookOpen, Search, FileText, Download } from 'lucide-react';

export const StudentFlowGuide: React.FC = () => {
  return (
    <div className="daq-card p-4 sm:p-5 bg-gradient-to-r from-white/[0.04] to-transparent border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-white/90">
          How to Find What You Need in 10 Seconds
        </h2>
        <span className="text-[11px] font-mono text-white/40">Student Workflow</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex items-start gap-2.5 p-2 rounded bg-white/[0.02] border border-white/5">
          <div className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center shrink-0">
            <BookOpen size={12} />
          </div>
          <div>
            <span className="font-semibold text-white block">Choose Course</span>
            <span className="text-white/50 text-[11px]">e.g. CS201 Data Structures</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2 rounded bg-white/[0.02] border border-white/5">
          <div className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center shrink-0">
            <Search size={12} />
          </div>
          <div>
            <span className="font-semibold text-white block">Pick Unit</span>
            <span className="text-white/50 text-[11px]">Filter by syllabus unit</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2 rounded bg-white/[0.02] border border-white/5">
          <div className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center shrink-0">
            <FileText size={12} />
          </div>
          <div>
            <span className="font-semibold text-white block">Find Notes / PYQs</span>
            <span className="text-white/50 text-[11px]">Exam-verified notes</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2 rounded bg-white/[0.02] border border-white/5">
          <div className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center shrink-0">
            <Download size={12} />
          </div>
          <div>
            <span className="font-semibold text-white block">Preview or Save</span>
            <span className="text-white/50 text-[11px]">Instant PDF view & library</span>
          </div>
        </div>
      </div>
    </div>
  );
};
