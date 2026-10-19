import React from 'react';
import { FileText, Link as LinkIcon, Sparkles } from 'lucide-react';
import type { ResourceType, SubjectItem } from '../../types';

interface UploadReviewSummaryProps {
  title: string;
  resourceType: ResourceType;
  semester: number;
  subject?: SubjectItem;
  unitTitle?: string;
  topicTitle?: string;
  selectedFile: File | null;
  externalUrl: string;
  pageCount: number | '';
  changelog: string;
}

export const UploadReviewSummary: React.FC<UploadReviewSummaryProps> = ({
  title,
  resourceType,
  semester,
  subject,
  unitTitle,
  topicTitle,
  selectedFile,
  externalUrl,
  pageCount,
  changelog,
}) => {
  return (
    <div className="daq-card p-5 space-y-3 bg-white/[0.02]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
        <Sparkles size={14} className="text-amber-400" />
        <span>Resource Summary & Governance Preview</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-white/40 block">Resource Title:</span>
          <span className="font-medium text-white truncate block">{title || '(Untitled resource)'}</span>
        </div>
        <div>
          <span className="text-white/40 block">Course & Curriculum:</span>
          <span className="font-medium text-white block">
            {subject?.code || 'Course'} • Sem {semester}
            {unitTitle ? ` • ${unitTitle}` : ''}
            {topicTitle ? ` • ${topicTitle}` : ''}
          </span>
        </div>
        <div>
          <span className="text-white/40 block">File / Payload:</span>
          <span className="font-medium text-white flex items-center gap-1.5 mt-0.5">
            {resourceType === 'link' ? (
              <>
                <LinkIcon size={12} className="text-cyan-400" />
                <span className="truncate">{externalUrl || 'External Link'}</span>
              </>
            ) : (
              <>
                <FileText size={12} className="text-emerald-400" />
                <span className="truncate">{selectedFile?.name || 'No file selected'}</span>
              </>
            )}
          </span>
        </div>
        <div>
          <span className="text-white/40 block">Initial Version Note:</span>
          <span className="font-medium text-white block">{changelog || 'Initial upload'}</span>
        </div>
      </div>

      {pageCount && (
        <div className="text-[11.5px] text-white/60 pt-1 border-t border-white/5">
          <span>Estimated document size: {pageCount} pages</span>
        </div>
      )}
    </div>
  );
};
