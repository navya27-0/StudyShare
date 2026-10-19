import React from 'react';
import { ExternalLink, EyeOff } from 'lucide-react';
import type { AdminReport } from '../../types';
import type { ActionModalState } from './ModerationActionModal';

interface AdminReportsPanelProps {
  reports: AdminReport[];
  total: number;
  loading: boolean;
  statusFilter: 'open' | 'reviewed' | 'dismissed' | 'all';
  onStatusFilterChange: (s: 'open' | 'reviewed' | 'dismissed' | 'all') => void;
  page: number;
  onPageChange: (p: number) => void;
  onOpenActionModal: (modal: ActionModalState) => void;
}

export const AdminReportsPanel: React.FC<AdminReportsPanelProps> = ({
  reports,
  total,
  loading,
  statusFilter,
  onStatusFilterChange,
  page,
  onPageChange,
  onOpenActionModal,
}) => {
  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/10">
          {(['open', 'reviewed', 'dismissed', 'all'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onStatusFilterChange(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === st
                  ? 'bg-white text-black shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/50">{total} reports found</span>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Resource</th>
              <th>Reporter</th>
              <th>Flag Reason</th>
              <th>Timestamp</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/40 text-xs">
                  Loading reports queue...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/40 text-xs">
                  No {statusFilter !== 'all' ? statusFilter : ''} reports found.
                </td>
              </tr>
            ) : (
              reports.map((r) => {
                const isOpen = r.status === 'open';
                return (
                  <tr key={r.id}>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold uppercase tracking-wider ${
                          r.status === 'open'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : r.status === 'reviewed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-white/5 text-white/50 border border-white/10'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div className="max-w-[220px]">
                        <a
                          href={`/resources/${r.resource_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-white hover:underline flex items-center gap-1 truncate"
                        >
                          <span>{r.resource?.title || `Resource #${r.resource_id}`}</span>
                          <ExternalLink size={11} className="shrink-0 text-white/40" />
                        </a>
                        <span className="text-[11px] text-white/40 block">
                          Type: {r.resource?.type || 'notes'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-white/80">
                        {r.reporter?.display_name || `User #${r.reporter_id}`}
                      </span>
                    </td>
                    <td>
                      <div className="max-w-[260px] text-xs text-white/70 line-clamp-2">
                        {r.reason}
                      </div>
                    </td>
                    <td className="font-mono text-[11px] text-white/40 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      {isOpen && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenActionModal({
                                isOpen: true,
                                type: 'dismiss_report',
                                title: 'Dismiss Report',
                                description: 'Dismiss this report without altering the resource.',
                                reportId: r.id,
                              })
                            }
                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenActionModal({
                                isOpen: true,
                                type: 'remove_resource',
                                title: 'Remove Resource',
                                description:
                                  'Soft-delete this resource from public search and downloads.',
                                reportId: r.id,
                                resourceId: r.resource_id,
                                resourceTitle: r.resource?.title,
                              })
                            }
                            className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center gap-1"
                          >
                            <EyeOff size={12} /> Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
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
            disabled={page * 20 >= total}
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
