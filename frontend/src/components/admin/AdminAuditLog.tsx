import React from 'react';
import { ScrollText } from 'lucide-react';
import type { ModerationActionItem } from '../../types';

interface AdminAuditLogProps {
  actions: ModerationActionItem[];
  total: number;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
}

export const AdminAuditLog: React.FC<AdminAuditLogProps> = ({
  actions,
  total,
  loading,
  page,
  onPageChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
          <ScrollText size={16} /> Immutable Moderation Event Trail
        </h3>
        <span className="text-xs text-white/50">{total} audit log records</span>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Action Type</th>
              <th>Target ID</th>
              <th>Moderator</th>
              <th>Audit Justification</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-white/40 text-xs">
                  Loading audit log...
                </td>
              </tr>
            ) : actions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-white/40 text-xs">
                  No moderation actions recorded yet.
                </td>
              </tr>
            ) : (
              actions.map((act) => (
                <tr key={act.id}>
                  <td>
                    <span className="font-mono text-xs font-semibold text-white uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {act.action}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-white/70">
                      {act.resource_id
                        ? `Resource #${act.resource_id}`
                        : act.target_user_id
                          ? `User #${act.target_user_id}`
                          : '—'}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-white/80">
                      {act.admin_name || (act.admin_id ? `Admin #${act.admin_id}` : 'System')}
                    </span>
                  </td>
                  <td>
                    <div className="max-w-[320px] text-xs text-white/70 italic">
                      "{act.note || 'No note provided'}"
                    </div>
                  </td>
                  <td className="font-mono text-[11px] text-white/40 whitespace-nowrap">
                    {new Date(act.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="daq-btn-secondary px-3 py-1 text-xs"
          >
            Previous
          </button>
          <span className="text-xs text-white/60 self-center font-mono">Page {page}</span>
          <button
            type="button"
            disabled={page * 25 >= total}
            onClick={() => onPageChange(page + 1)}
            className="daq-btn-secondary px-3 py-1 text-xs"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
