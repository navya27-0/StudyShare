import React, { useState } from 'react';
import { AlertTriangle, Users, ScrollText, RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../services/api';

import { useAdminReports } from '../components/admin/useAdminReports';
import { useAdminUsers } from '../components/admin/useAdminUsers';
import { useModerationActions } from '../components/admin/useModerationActions';
import { AdminMetricsOverview } from '../components/admin/AdminMetricsOverview';
import { AdminReportsPanel } from '../components/admin/AdminReportsPanel';
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel';
import { AdminAuditLog } from '../components/admin/AdminAuditLog';
import {
  ModerationActionModal,
  type ActionModalState,
} from '../components/admin/ModerationActionModal';

type AdminTab = 'reports' | 'users' | 'audit';

export const AdminDashboardView: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');

  // Modular data hooks
  const reportsHook = useAdminReports((msg) => showToast(msg, 'error'));
  const usersHook = useAdminUsers((msg) => showToast(msg, 'error'));
  const auditHook = useModerationActions((msg) => showToast(msg, 'error'));

  // Action Confirmation Modal
  const [modalState, setModalState] = useState<ActionModalState>({
    isOpen: false,
    type: 'dismiss_report',
    title: '',
    description: '',
  });

  const handleModalSubmit = async (note: string) => {
    switch (modalState.type) {
      case 'dismiss_report':
        if (modalState.reportId) {
          await adminApi.actionReport(modalState.reportId, 'dismiss', note || undefined);
          showToast('Report dismissed successfully.', 'success');
          reportsHook.refetch();
          auditHook.refetch();
        }
        break;

      case 'remove_resource':
        if (modalState.resourceId) {
          await adminApi.removeResource(modalState.resourceId, note || undefined);
          if (modalState.reportId) {
            await adminApi.actionReport(modalState.reportId, 'reviewed', note || undefined);
          }
          showToast('Resource removed and hidden from public catalog.', 'success');
          reportsHook.refetch();
          auditHook.refetch();
        }
        break;

      case 'restore_resource':
        if (modalState.resourceId) {
          await adminApi.restoreResource(modalState.resourceId, note || undefined);
          showToast('Resource restored to public catalog.', 'success');
          auditHook.refetch();
        }
        break;

      case 'warn_user':
        if (modalState.userId) {
          await adminApi.warnUser(modalState.userId, note || undefined);
          showToast(`Conduct warning recorded for ${modalState.userName}.`, 'success');
          auditHook.refetch();
        }
        break;

      case 'ban_user':
        if (modalState.userId) {
          await adminApi.banUser(modalState.userId, note || undefined);
          showToast(`Account ${modalState.userName} banned and access revoked.`, 'success');
          usersHook.refetch();
          auditHook.refetch();
        }
        break;

      case 'unban_user':
        if (modalState.userId) {
          await adminApi.unbanUser(modalState.userId, note || undefined);
          showToast(`Account ${modalState.userName} restored.`, 'success');
          usersHook.refetch();
          auditHook.refetch();
        }
        break;
    }
  };

  const openReportsCount = reportsHook.reports.filter((r) => r.status === 'open').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <Shield size={14} />
            <span>Faculty & Administrator Oversight Portal</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Curriculum Governance</h1>
          <p className="text-xs text-white/60 mt-0.5">
            Signed in as {currentAdmin?.display_name} ({currentAdmin?.email})
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            reportsHook.refetch();
            usersHook.refetch();
            auditHook.refetch();
            showToast('Governance data refreshed', 'success');
          }}
          className="daq-btn-secondary text-xs self-start sm:self-auto flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refresh Telemetry
        </button>
      </div>

      {/* Summary Metrics Cards */}
      <AdminMetricsOverview
        openReportsCount={openReportsCount}
        totalReportsCount={reportsHook.total}
        totalUsersCount={usersHook.total}
        totalAuditActionsCount={auditHook.total}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'reports'
              ? 'border-white text-white'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Report Queue</span>
          {openReportsCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] flex items-center justify-center font-bold">
              {openReportsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-white text-white'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <Users size={14} />
          <span>User Directory</span>
          <span className="text-[11px] text-white/40 font-mono">({usersHook.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-white text-white'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <ScrollText size={14} />
          <span>Moderation Audit Trail</span>
        </button>
      </div>

      {/* Active Tab Panel */}
      {activeTab === 'reports' && (
        <AdminReportsPanel
          reports={reportsHook.reports}
          total={reportsHook.total}
          loading={reportsHook.loading}
          statusFilter={reportsHook.statusFilter}
          onStatusFilterChange={reportsHook.setStatusFilter}
          page={reportsHook.page}
          onPageChange={reportsHook.setPage}
          onOpenActionModal={setModalState}
        />
      )}

      {activeTab === 'users' && (
        <AdminUsersPanel
          users={usersHook.users}
          total={usersHook.total}
          loading={usersHook.loading}
          searchQuery={usersHook.searchQuery}
          onSearchChange={usersHook.setSearchQuery}
          roleFilter={usersHook.roleFilter}
          onRoleFilterChange={usersHook.setRoleFilter}
          activeFilter={usersHook.activeFilter}
          onActiveFilterChange={usersHook.setActiveFilter}
          page={usersHook.page}
          onPageChange={usersHook.setPage}
          onOpenActionModal={setModalState}
        />
      )}

      {activeTab === 'audit' && (
        <AdminAuditLog
          actions={auditHook.actions}
          total={auditHook.total}
          loading={auditHook.loading}
          page={auditHook.page}
          onPageChange={auditHook.setPage}
        />
      )}

      {/* Confirmation Modal */}
      <ModerationActionModal
        modal={modalState}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default AdminDashboardView;
