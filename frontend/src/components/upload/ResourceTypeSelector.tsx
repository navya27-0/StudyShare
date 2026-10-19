import React from 'react';
import {
  FileText,
  FileQuestion,
  FileCode,
  FlaskConical,
  BookOpen,
  Link as LinkIcon,
} from 'lucide-react';
import type { ResourceType } from '../../types';

export interface TypeOption {
  type: ResourceType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

export const RESOURCE_TYPES: TypeOption[] = [
  {
    type: 'notes',
    label: 'Lecture Notes',
    desc: 'Handwritten or typed classroom notes & summaries',
    icon: <FileText size={18} />,
  },
  {
    type: 'question_bank',
    label: 'Past Papers / PYQs',
    desc: 'Previous year question papers, midterms & solutions',
    icon: <FileQuestion size={18} />,
  },
  {
    type: 'pdf',
    label: 'Study Guide (PDF)',
    desc: 'Complete unit guides, formula sheets & slide decks',
    icon: <FileCode size={18} />,
  },
  {
    type: 'lab_record',
    label: 'Lab Manual / Code',
    desc: 'Experiment write-ups, source code & lab solutions',
    icon: <FlaskConical size={18} />,
  },
  {
    type: 'paper',
    label: 'Reference Paper',
    desc: 'Academic papers, monographs & supplementary reading',
    icon: <BookOpen size={18} />,
  },
  {
    type: 'link',
    label: 'External Link',
    desc: 'Google Drive folder, GitHub repo, Overleaf, or video playlist',
    icon: <LinkIcon size={18} />,
  },
];

interface ResourceTypeSelectorProps {
  value: ResourceType;
  onChange: (type: ResourceType) => void;
}

export const ResourceTypeSelector: React.FC<ResourceTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
      {RESOURCE_TYPES.map((opt) => {
        const isSelected = value === opt.type;
        return (
          <button
            key={opt.type}
            type="button"
            onClick={() => onChange(opt.type)}
            className={`p-3 text-left rounded-lg border transition-all flex flex-col gap-1.5 ${
              isSelected
                ? 'bg-white/10 border-white text-white shadow-sm'
                : 'bg-white/[0.02] border-white/10 text-white/70 hover:border-white/20 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={isSelected ? 'text-white' : 'text-white/60'}>{opt.icon}</span>
              <span className="font-semibold text-xs uppercase tracking-wider">{opt.label}</span>
            </div>
            <p className="text-[11.5px] text-white/50 leading-relaxed">{opt.desc}</p>
          </button>
        );
      })}
    </div>
  );
};
