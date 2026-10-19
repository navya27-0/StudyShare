import React from 'react';
import { AlertTriangle, Users, ScrollText, ShieldAlert } from 'lucide-react';

interface AdminMetricsOverviewProps {
  openReportsCount: number;
  totalReportsCount: number;
  totalUsersCount: number;
  totalAuditActionsCount: number;
}

export const AdminMetricsOverview: React.FC<AdminMetricsOverviewProps> = ({
  openReportsCount,
  totalReportsCount,
  totalUsersCount,
  totalAuditActionsCount,
}) => {
  return (
    <div className="admin-metrics-grid">
      <div className="admin-metric-card border-amber-500/20">
        <div className="admin-metric-label text-amber-400">
          <AlertTriangle size={14} /> Open Triage Queue
        </div>
        <div className="admin-metric-value text-amber-400">{openReportsCount}</div>
        <span className="text-[11px] text-white/50">Unresolved student reports</span>
      </div>

      <div className="admin-metric-card">
        <div className="admin-metric-label">
          <ShieldAlert size={14} /> Total Reports
        </div>
        <div className="admin-metric-value">{totalReportsCount}</div>
        <span className="text-[11px] text-white/50">All-time flagged resources</span>
      </div>

      <div className="admin-metric-card">
        <div className="admin-metric-label">
          <Users size={14} /> Community Accounts
        </div>
        <div className="admin-metric-value">{totalUsersCount}</div>
        <span className="text-[11px] text-white/50">Enrolled students & faculty</span>
      </div>

      <div className="admin-metric-card">
        <div className="admin-metric-label">
          <ScrollText size={14} /> Moderation Events
        </div>
        <div className="admin-metric-value">{totalAuditActionsCount}</div>
        <span className="text-[11px] text-white/50">Immutable audit actions</span>
      </div>
    </div>
  );
};
