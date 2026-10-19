import React from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import type { ResourceListItem } from '../../types';

interface DuplicateWarningProps {
  matches: ResourceListItem[];
  onDismiss: () => void;
  onSelectAsVersion?: (resourceId: number) => void;
}

export const DuplicateWarning: React.FC<DuplicateWarningProps> = ({
  matches,
  onDismiss,
  onSelectAsVersion,
}) => {
  if (!matches || matches.length === 0) return null;

  return (
    <div
      className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3"
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-sm text-amber-400">
          <AlertTriangle size={18} className="shrink-0" />
          <span>Similar study material already exists in this course!</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-400/60 hover:text-amber-400 transition-colors p-1"
          aria-label="Dismiss duplicate warning"
        >
          <X size={16} />
        </button>
      </div>

      <p className="text-xs text-amber-200/80 leading-relaxed">
        To prevent cluttering the curriculum, consider reviewing existing uploads or publishing an updated version:
      </p>

      <div className="space-y-2">
        {matches.slice(0, 3).map((match) => (
          <div
            key={match.id}
            className="flex items-center justify-between p-2.5 rounded bg-black/40 border border-amber-500/20 text-xs"
          >
            <div className="min-w-0 pr-3">
              <p className="font-medium text-white truncate">{match.title}</p>
              <p className="text-[11px] text-white/50 mt-0.5">
                Uploaded by {match.uploader.display_name} • {match.upvotes_count} upvotes
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/resources/${match.id}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white flex items-center gap-1"
              >
                <span>View</span>
                <ExternalLink size={12} />
              </a>
              {onSelectAsVersion && (
                <button
                  type="button"
                  onClick={() => onSelectAsVersion(match.id)}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-medium hover:bg-amber-500/30"
                >
                  Update v{match.current_version_id || 1 + 1}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
