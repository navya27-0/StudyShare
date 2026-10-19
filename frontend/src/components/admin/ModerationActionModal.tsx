import React, { useState } from 'react';
import { X, AlertOctagon } from 'lucide-react';

export interface ActionModalState {
  isOpen: boolean;
  type:
    | 'dismiss_report'
    | 'remove_resource'
    | 'restore_resource'
    | 'warn_user'
    | 'ban_user'
    | 'unban_user';
  title: string;
  description: string;
  reportId?: number;
  resourceId?: number;
  userId?: number;
  userName?: string;
  resourceTitle?: string;
}

interface ModerationActionModalProps {
  modal: ActionModalState;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}

export const ModerationActionModal: React.FC<ModerationActionModalProps> = ({
  modal,
  onClose,
  onSubmit,
}) => {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!modal.isOpen) return null;

  const isDestructive =
    modal.type === 'remove_resource' || modal.type === 'ban_user' || modal.type === 'warn_user';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(note.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="daq-modal-backdrop">
      <div className="daq-modal-dialog p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isDestructive
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              <AlertOctagon size={16} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white text-base">{modal.title}</h3>
              <p className="text-xs text-white/50">{modal.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white p-1"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label htmlFor="moderation-reason-note" className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
              Moderation Reason / Audit Note <span className="text-white/40">(Optional)</span>
            </label>
            <textarea
              id="moderation-reason-note"
              rows={3}
              placeholder="Provide context or syllabus rationale for this moderation action..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          {error && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="daq-btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`daq-btn-primary ${
                isDestructive ? 'bg-rose-600 hover:bg-rose-500 border-rose-600' : ''
              }`}
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
