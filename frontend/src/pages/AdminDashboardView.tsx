import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Users,
  ScrollText,
  Search,
  CheckCircle2,
  AlertOctagon,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Shield,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import type {
  AdminReport,
  User,
  ModerationActionItem,
} from '../types';

type AdminTab = 'reports' | 'users' | 'audit';

export const AdminDashboardView: React.FC = () => {
  const { user: currentAdmin } = useAuth();

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');

  // ============================================================================
  // 1. REPORTS QUEUE STATE
  // ============================================================================
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportStatusFilter, setReportStatusFilter] = useState<'open' | 'reviewed' | 'dismissed' | 'all'>('open');
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsPage, setReportsPage] = useState(1);
  const [previewingReportId, setPreviewingReportId] = useState<number | null>(null);

  // ============================================================================
  // 2. USER MANAGEMENT STATE
  // ============================================================================
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userActiveFilter, setUserActiveFilter] = useState<string>('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);

  // ============================================================================
  // 3. AUDIT LOG STATE
  // ============================================================================
  const [auditActions, setAuditActions] = useState<ModerationActionItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);

  // ============================================================================
  // ACTION MODAL STATE
  // ============================================================================
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'dismiss_report' | 'remove_resource' | 'restore_resource' | 'warn_user' | 'ban_user' | 'unban_user';
    title: string;
    description: string;
    reportId?: number;
    resourceId?: number;
    userId?: number;
    userName?: string;
    resourceTitle?: string;
    isSubmitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    type: 'dismiss_report',
    title: '',
    description: '',
    isSubmitting: false,
    error: null,
  });

  const [actionNote, setActionNote] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // ============================================================================
  // LOADERS
  // ============================================================================
  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await adminApi.getReports(reportStatusFilter, reportsPage, 20);
      setReports(res.items);
      setReportsTotal(res.total);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load moderation reports', 'error');
    } finally {
      setReportsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const activeParam = userActiveFilter === 'active' ? true : userActiveFilter === 'banned' ? false : undefined;
      const res = await adminApi.getUsers({
        q: userSearchQuery.trim() || undefined,
        role: userRoleFilter || undefined,
        is_active: activeParam,
        page: usersPage,
        pageSize: 20,
      });
      setUsers(res.items);
      setUsersTotal(res.total);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load user directory', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAuditLog = async () => {
    setAuditLoading(true);
    try {
      const res = await adminApi.getModerationActions({
        page: auditPage,
        pageSize: 25,
      });
      setAuditActions(res.items);
      setAuditTotal(res.total);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load moderation audit log', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'audit') {
      loadAuditLog();
    }
  }, [activeTab, reportStatusFilter, reportsPage, userRoleFilter, userActiveFilter, usersPage, auditPage]);

  // Debounced search for users
  useEffect(() => {
    if (activeTab !== 'users') return;
    const timer = setTimeout(() => {
      setUsersPage(1);
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  // ============================================================================
  // ACTION MODAL HANDLERS
  // ============================================================================
  const openActionModal = (
    type: typeof actionModal.type,
    options: {
      reportId?: number;
      resourceId?: number;
      userId?: number;
      userName?: string;
      resourceTitle?: string;
      defaultNote?: string;
    }
  ) => {
    let title = '';
    let description = '';

    switch (type) {
      case 'dismiss_report':
        title = `Dismiss Report #${options.reportId}`;
        description = 'Mark this student report as dismissed. The reported resource will remain visible.';
        break;
      case 'remove_resource':
        title = `Remove Resource: "${options.resourceTitle || 'Document'}"`;
        description = 'Soft-delete this resource from public catalog. It will no longer be visible or downloadable by students.';
        break;
      case 'restore_resource':
        title = `Restore Resource: "${options.resourceTitle || 'Document'}"`;
        description = 'Restore this previously removed resource back to public catalog and search listings.';
        break;
      case 'warn_user':
        title = `Issue Official Warning to ${options.userName || 'User'}`;
        description = 'Record a formal administrative warning against this contributor for policy or quality violations.';
        break;
      case 'ban_user':
        title = `Deactivate / Ban Account: ${options.userName || 'User'}`;
        description = 'Deactivate this account immediately. The user will be barred from signing in and interacting with StudyShare.';
        break;
      case 'unban_user':
        title = `Reactivate Account: ${options.userName || 'User'}`;
        description = 'Restore account access and privileges for this student contributor.';
        break;
    }

    setActionNote(options.defaultNote || '');
    setActionModal({
      isOpen: true,
      type,
      title,
      description,
      reportId: options.reportId,
      resourceId: options.resourceId,
      userId: options.userId,
      userName: options.userName,
      resourceTitle: options.resourceTitle,
      isSubmitting: false,
      error: null,
    });
  };

  const executeActionModal = async () => {
    setActionModal((prev) => ({ ...prev, isSubmitting: true, error: null }));
    try {
      const note = actionNote.trim() || undefined;

      switch (actionModal.type) {
        case 'dismiss_report':
          if (actionModal.reportId) {
            await adminApi.actionReport(actionModal.reportId, 'dismiss', note);
            showToast(`Report #${actionModal.reportId} successfully dismissed.`);
          }
          break;

        case 'remove_resource':
          if (actionModal.resourceId) {
            await adminApi.removeResource(actionModal.resourceId, note);
            if (actionModal.reportId) {
              await adminApi.actionReport(actionModal.reportId, 'action', note || 'Resource removed by administrator');
            }
            showToast(`Resource #${actionModal.resourceId} removed from catalog.`);
          }
          break;

        case 'restore_resource':
          if (actionModal.resourceId) {
            await adminApi.restoreResource(actionModal.resourceId, note);
            showToast(`Resource #${actionModal.resourceId} restored to public view.`);
          }
          break;

        case 'warn_user':
          if (actionModal.userId) {
            await adminApi.warnUser(actionModal.userId, note);
            if (actionModal.reportId) {
              await adminApi.actionReport(actionModal.reportId, 'action', note || 'Official warning issued to contributor');
            }
            showToast(`Official warning recorded for ${actionModal.userName || 'user'}.`);
          }
          break;

        case 'ban_user':
          if (actionModal.userId) {
            await adminApi.banUser(actionModal.userId, note);
            if (actionModal.reportId) {
              await adminApi.actionReport(actionModal.reportId, 'action', note || 'Account banned by administrator');
            }
            showToast(`Account ${actionModal.userName || 'user'} deactivated.`);
          }
          break;

        case 'unban_user':
          if (actionModal.userId) {
            await adminApi.unbanUser(actionModal.userId, note);
            showToast(`Account ${actionModal.userName || 'user'} reactivated.`);
          }
          break;
      }

      setActionModal((prev) => ({ ...prev, isOpen: false }));
      // Refresh current tab data
      if (activeTab === 'reports') loadReports();
      else if (activeTab === 'users') loadUsers();
      else if (activeTab === 'audit') loadAuditLog();
    } catch (err: unknown) {
      setActionModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Action failed to execute',
      }));
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins}m ago`;
      }
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filteredAuditActions = useMemo(() => {
    if (!auditActionFilter) return auditActions;
    return auditActions.filter((a) => a.action === auditActionFilter);
  }, [auditActions, auditActionFilter]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: toastMessage.type === 'success' ? 'var(--status-verified)' : 'var(--status-danger)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 120ms ease',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertOctagon size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* DISTINCT FACULTY CONTROL HEADER (Slate/Navy theme treatment) */}
      <div
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          marginBottom: '24px',
          borderLeft: '4px solid #2563EB',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563EB',
                  padding: '2px 8px',
                  borderRadius: '2px',
                  letterSpacing: '0.06em',
                }}
              >
                MODERATION CONTROL TERMINAL
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                // ACADEMIC INTEGRITY DESK
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Faculty & Moderation Terminal
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
              Review student flags, enforce academic syllabus integrity, manage contributor accounts, and inspect the accountability audit log.
            </p>
          </div>

          {/* Active Admin Session Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 14px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-verified)',
              }}
            />
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Logged as Faculty: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{currentAdmin?.display_name}</strong>
              <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({currentAdmin?.email})</span>
            </div>
          </div>
        </div>

        {/* HIGH-DENSITY NAVIGATION TABS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '16px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: activeTab === 'reports' ? '#2563EB' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'reports' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
              border: activeTab === 'reports' ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid transparent',
              transition: 'all 100ms ease',
            }}
          >
            <AlertTriangle size={15} />
            <span>Open Reports Queue</span>
            {reportsTotal > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 700,
                }}
              >
                {reportsTotal}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: activeTab === 'users' ? '#2563EB' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'users' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
              border: activeTab === 'users' ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid transparent',
              transition: 'all 100ms ease',
            }}
          >
            <Users size={15} />
            <span>User Governance</span>
            {usersTotal > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-subdued)',
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                }}
              >
                {usersTotal}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: activeTab === 'audit' ? '#2563EB' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'audit' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
              border: activeTab === 'audit' ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid transparent',
              transition: 'all 100ms ease',
            }}
          >
            <ScrollText size={15} />
            <span>Moderation Audit Trail</span>
            {auditTotal > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-subdued)',
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                }}
              >
                {auditTotal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: OPEN REPORTS QUEUE                                            */}
      {/* ==================================================================== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                QUEUE FILTER:
              </span>
              {(['open', 'reviewed', 'dismissed', 'all'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setReportStatusFilter(st);
                    setReportsPage(1);
                  }}
                  style={{
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    textTransform: 'uppercase',
                    fontWeight: reportStatusFilter === st ? 700 : 500,
                    backgroundColor: reportStatusFilter === st ? '#2563EB' : 'var(--bg-subdued)',
                    color: reportStatusFilter === st ? '#FFFFFF' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadReports}
              disabled={reportsLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                padding: '4px 10px',
              }}
            >
              <RefreshCw size={13} style={{ animation: reportsLoading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Reports List */}
          {reportsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  style={{
                    height: '140px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <CheckCircle2 size={36} color="var(--status-verified)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, margin: '0 0 6px' }}>
                Queue is Clear
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                No {reportStatusFilter !== 'all' ? reportStatusFilter : ''} student reports awaiting administrative review.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reports.map((report) => {
                const resource = report.resource;
                const isPreviewOpen = previewingReportId === report.id;
                const isResourceDeleted = resource?.is_deleted;

                return (
                  <div
                    key={report.id}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: `4px solid ${
                        report.status === 'open'
                          ? '#EAB308'
                          : report.status === 'reviewed'
                          ? 'var(--status-verified)'
                          : 'var(--border-strong)'
                      }`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '20px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {/* Report Header Line */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '12px',
                        borderBottom: '1px solid var(--border-subtle)',
                        paddingBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#2563EB',
                          }}
                        >
                          #REP-{report.id}
                        </span>

                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '2px',
                            textTransform: 'uppercase',
                            backgroundColor:
                              report.status === 'open'
                                ? 'rgba(234, 179, 8, 0.12)'
                                : report.status === 'reviewed'
                                ? 'var(--status-verified-bg)'
                                : 'var(--bg-subdued)',
                            color:
                              report.status === 'open'
                                ? '#B45309'
                                : report.status === 'reviewed'
                                ? 'var(--status-verified)'
                                : 'var(--text-muted)',
                            border: `1px solid ${
                              report.status === 'open'
                                ? 'rgba(234, 179, 8, 0.3)'
                                : report.status === 'reviewed'
                                ? 'var(--status-verified)'
                                : 'var(--border-subtle)'
                            }`,
                          }}
                        >
                          STATUS: {report.status}
                        </span>

                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {formatRelativeTime(report.created_at)}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Reporter:{' '}
                        <strong>{report.reporter?.display_name || `User #${report.reporter_id}`}</strong>
                      </div>
                    </div>

                    {/* Report Reason Box */}
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: 'rgba(220, 38, 38, 0.05)',
                        border: '1px solid rgba(220, 38, 38, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--status-danger)',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertTriangle size={13} /> STATED REASON FOR REPORT:
                      </div>
                      <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        "{report.reason}"
                      </div>
                    </div>

                    {/* Reported Resource Summary */}
                    {resource ? (
                      <div
                        style={{
                          padding: '14px 16px',
                          backgroundColor: 'var(--bg-subdued)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '2px',
                                  backgroundColor: 'var(--bg-surface)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {resource.breadcrumbs?.subject?.code || `SEM ${resource.semester}`}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {resource.type.replace('_', ' ')}
                              </span>
                              {isResourceDeleted && (
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    backgroundColor: 'var(--status-danger-bg)',
                                    color: 'var(--status-danger)',
                                    padding: '1px 6px',
                                    borderRadius: '2px',
                                  }}
                                >
                                  REMOVED
                                </span>
                              )}
                            </div>

                            <h4
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '15px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                margin: '0 0 6px',
                              }}
                            >
                              <Link
                                to={`/resources/${resource.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <span>{resource.title}</span>
                                <ExternalLink size={13} color="#2563EB" />
                              </Link>
                            </h4>

                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <span>
                                Uploader:{' '}
                                <Link
                                  to={`/profile/${resource.uploader.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#2563EB', fontWeight: 600 }}
                                >
                                  {resource.uploader.display_name}
                                </Link>
                              </span>
                              <span>•</span>
                              <span>Uploaded on: {formatDate(resource.created_at)}</span>
                              <span>•</span>
                              <span>Rating: {resource.rating_avg.toFixed(1)} ★</span>
                            </div>
                          </div>

                          {/* Quick Document Preview Toggle */}
                          <button
                            type="button"
                            onClick={() => setPreviewingReportId(isPreviewOpen ? null : report.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              color: '#2563EB',
                              padding: '6px 12px',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {isPreviewOpen ? <EyeOff size={14} /> : <Eye size={14} />}
                            <span>{isPreviewOpen ? 'Hide Document Preview' : 'Preview Document'}</span>
                          </button>
                        </div>

                        {/* Inline Document Preview Box */}
                        {isPreviewOpen && (
                          <div
                            style={{
                              marginTop: '14px',
                              borderTop: '1px solid var(--border-subtle)',
                              paddingTop: '14px',
                            }}
                          >
                            <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              File Source: <code style={{ fontFamily: 'var(--font-mono)' }}>{resource.file_url}</code>
                            </div>

                            {resource.file_url.toLowerCase().endsWith('.pdf') ? (
                              <div style={{ width: '100%', height: '420px', backgroundColor: '#525659', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                <iframe
                                  src={`${resource.file_url}#toolbar=1&navpanes=0`}
                                  title={resource.title}
                                  style={{ width: '100%', height: '100%', border: 'none' }}
                                />
                              </div>
                            ) : (
                              <div style={{ padding: '20px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                  External or non-PDF resource preview link:
                                </p>
                                <a
                                  href={resource.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#2563EB',
                                    padding: '6px 14px',
                                    backgroundColor: 'var(--bg-subdued)',
                                    borderRadius: 'var(--radius-sm)',
                                  }}
                                >
                                  Open Resource File Directly <ExternalLink size={14} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Target resource was completely deleted or is unavailable.
                      </div>
                    )}

                    {/* Moderation Action Buttons Bar */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        paddingTop: '6px',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        ACTION AUDIT LOGGED UPON SUBMISSION
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* 1. Dismiss Report */}
                        <button
                          type="button"
                          onClick={() =>
                            openActionModal('dismiss_report', {
                              reportId: report.id,
                              defaultNote: 'Report dismissed after faculty review; material meets quality standard.',
                            })
                          }
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--bg-subdued)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          Dismiss Report
                        </button>

                        {/* 2. Warn Uploader */}
                        {resource && (
                          <button
                            type="button"
                            onClick={() =>
                              openActionModal('warn_user', {
                                reportId: report.id,
                                userId: resource.uploader.id,
                                userName: resource.uploader.display_name,
                                defaultNote: `Official faculty warning: Uploaded resource "${resource.title}" contains syllabus inaccuracies.`,
                              })
                            }
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              fontFamily: 'var(--font-mono)',
                              color: '#B45309',
                              backgroundColor: 'rgba(234, 179, 8, 0.08)',
                              border: '1px solid rgba(234, 179, 8, 0.3)',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            Warn Uploader
                          </button>
                        )}

                        {/* 3. Remove Resource / Restore Resource */}
                        {resource && (
                          isResourceDeleted ? (
                            <button
                              type="button"
                              onClick={() =>
                                openActionModal('restore_resource', {
                                  resourceId: resource.id,
                                  resourceTitle: resource.title,
                                  defaultNote: 'Resource restored after verification of syllabus validity.',
                                })
                              }
                              style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--status-verified)',
                                backgroundColor: 'var(--status-verified-bg)',
                                border: '1px solid var(--status-verified)',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              Restore Resource
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openActionModal('remove_resource', {
                                  reportId: report.id,
                                  resourceId: resource.id,
                                  resourceTitle: resource.title,
                                  defaultNote: `Resource removed per student report #${report.id}: ${report.reason}`,
                                })
                              }
                              style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                                color: '#FFFFFF',
                                backgroundColor: 'var(--status-danger)',
                                border: '1px solid var(--status-danger)',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              Remove Resource
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: USER DIRECTORY & GOVERNANCE                                   */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '14px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '400px' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  height: '36px',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Role Filter */}
              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUsersPage(1);
                }}
                style={{ height: '36px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="admin">Faculty Admin</option>
              </select>

              {/* Status Filter */}
              <select
                value={userActiveFilter}
                onChange={(e) => {
                  setUserActiveFilter(e.target.value);
                  setUsersPage(1);
                }}
                style={{ height: '36px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="banned">Banned / Deactivated</option>
              </select>

              <button
                type="button"
                onClick={loadUsers}
                disabled={usersLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg-subdued)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <RefreshCw size={13} style={{ animation: usersLoading ? 'spin 1s linear infinite' : 'none' }} />
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-subdued)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>User</th>
                  <th style={{ padding: '10px 16px' }}>Email</th>
                  <th style={{ padding: '10px 16px' }}>Role</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Reputation</th>
                  <th style={{ padding: '10px 16px' }}>Uploads</th>
                  <th style={{ padding: '10px 16px' }}>Joined</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading accounts directory...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === currentAdmin?.id;
                    const isBanned = !u.is_active;

                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background-color 80ms ease',
                          opacity: isBanned ? 0.65 : 1,
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            to={`/profile/${u.id}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                          >
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: isBanned ? 'var(--status-danger-bg)' : 'rgba(37, 99, 235, 0.1)',
                                color: isBanned ? 'var(--status-danger)' : '#2563EB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '11px',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {u.display_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.display_name}</div>
                              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                #USR-{u.id}
                              </div>
                            </div>
                          </Link>
                        </td>

                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {u.email}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '2px',
                              textTransform: 'uppercase',
                              backgroundColor: u.role === 'admin' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-subdued)',
                              color: u.role === 'admin' ? '#2563EB' : 'var(--text-secondary)',
                              border: `1px solid ${u.role === 'admin' ? 'rgba(37, 99, 235, 0.3)' : 'var(--border-subtle)'}`,
                            }}
                          >
                            {u.role === 'admin' ? 'FACULTY' : 'STUDENT'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '2px',
                              textTransform: 'uppercase',
                              backgroundColor: isBanned ? 'var(--status-danger-bg)' : 'var(--status-verified-bg)',
                              color: isBanned ? 'var(--status-danger)' : 'var(--status-verified)',
                              border: `1px solid ${isBanned ? 'var(--status-danger)' : 'var(--status-verified)'}`,
                            }}
                          >
                            {isBanned ? 'BANNED' : 'ACTIVE'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                          ★ {u.contributor_profile?.reputation_points ?? 10}
                        </td>

                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                          {u.contributor_profile?.total_uploads ?? 0}
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatDate(u.created_at)}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {!isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openActionModal('warn_user', {
                                      userId: u.id,
                                      userName: u.display_name,
                                      defaultNote: 'Formal faculty reminder regarding repository policy compliance.',
                                    })
                                  }
                                  title="Issue official warning"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 600,
                                    color: '#B45309',
                                    border: '1px solid rgba(234, 179, 8, 0.4)',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'rgba(234, 179, 8, 0.08)',
                                  }}
                                >
                                  Warn
                                </button>

                                {isBanned ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openActionModal('unban_user', {
                                        userId: u.id,
                                        userName: u.display_name,
                                        defaultNote: 'Account reactivated after academic identity verification.',
                                      })
                                    }
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      fontFamily: 'var(--font-mono)',
                                      fontWeight: 600,
                                      color: 'var(--status-verified)',
                                      border: '1px solid var(--status-verified)',
                                      borderRadius: 'var(--radius-sm)',
                                      backgroundColor: 'var(--status-verified-bg)',
                                    }}
                                  >
                                    Unban
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openActionModal('ban_user', {
                                        userId: u.id,
                                        userName: u.display_name,
                                        defaultNote: 'Account deactivated due to repeated policy violations.',
                                      })
                                    }
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      fontFamily: 'var(--font-mono)',
                                      fontWeight: 600,
                                      color: 'var(--status-danger)',
                                      border: '1px solid var(--status-danger)',
                                      borderRadius: 'var(--radius-sm)',
                                      backgroundColor: 'var(--status-danger-bg)',
                                    }}
                                  >
                                    Ban
                                  </button>
                                )}
                              </>
                            )}

                            {isSelf && (
                              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                (You)
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: MODERATION AUDIT TRAIL LOG                                    */}
      {/* ==================================================================== */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Audit Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                ACTION TYPE:
              </span>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                style={{ height: '34px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
              >
                <option value="">All Moderation Actions</option>
                <option value="report_dismissed">report_dismissed</option>
                <option value="report_actioned">report_actioned</option>
                <option value="resource_removed">resource_removed</option>
                <option value="resource_restored">resource_restored</option>
                <option value="user_warned">user_warned</option>
                <option value="user_banned">user_banned</option>
                <option value="user_unbanned">user_unbanned</option>
              </select>
            </div>

            <button
              type="button"
              onClick={loadAuditLog}
              disabled={auditLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                padding: '4px 10px',
              }}
            >
              <RefreshCw size={13} style={{ animation: auditLoading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Audit Ledger Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-subdued)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>Timestamp</th>
                  <th style={{ padding: '10px 16px' }}>Admin</th>
                  <th style={{ padding: '10px 16px' }}>Action</th>
                  <th style={{ padding: '10px 16px' }}>Target Resource</th>
                  <th style={{ padding: '10px 16px' }}>Target User</th>
                  <th style={{ padding: '10px 16px' }}>Audit Reason / Note</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading audit log records...
                    </td>
                  </tr>
                ) : filteredAuditActions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No moderation actions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredAuditActions.map((action) => {
                    const isDanger = action.action.includes('removed') || action.action.includes('banned');
                    const isWarning = action.action.includes('warned') || action.action.includes('dismissed');
                    const isVerified = action.action.includes('restored') || action.action.includes('unbanned') || action.action.includes('actioned');

                    return (
                      <tr key={action.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(action.created_at)}
                        </td>

                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {action.admin_name || `Admin #${action.admin_id}`}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '2px',
                              backgroundColor: isDanger
                                ? 'var(--status-danger-bg)'
                                : isWarning
                                ? 'rgba(234, 179, 8, 0.12)'
                                : isVerified
                                ? 'var(--status-verified-bg)'
                                : 'var(--bg-subdued)',
                              color: isDanger
                                ? 'var(--status-danger)'
                                : isWarning
                                ? '#B45309'
                                : isVerified
                                ? 'var(--status-verified)'
                                : 'var(--text-secondary)',
                              border: `1px solid ${
                                isDanger
                                  ? 'var(--status-danger)'
                                  : isWarning
                                  ? 'rgba(234, 179, 8, 0.4)'
                                  : isVerified
                                  ? 'var(--status-verified)'
                                  : 'var(--border-subtle)'
                              }`,
                            }}
                          >
                            {action.action}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          {action.resource_id ? (
                            <Link
                              to={`/resources/${action.resource_id}`}
                              style={{ color: '#2563EB', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>{action.resource_title || `#RES-${action.resource_id}`}</span>
                              <ExternalLink size={12} />
                            </Link>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          {action.target_user_id ? (
                            <Link
                              to={`/profile/${action.target_user_id}`}
                              style={{ color: '#2563EB', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>{action.target_user_name || `#USR-${action.target_user_id}`}</span>
                              <ExternalLink size={12} />
                            </Link>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {action.note || <span style={{ color: 'var(--text-muted)' }}>No audit note specified</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {auditTotal > 25 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  padding: '12px 18px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                }}
              >
                <button
                  type="button"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subdued)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Previous
                </button>
                <span style={{ color: 'var(--text-muted)' }}>
                  Page {auditPage} of {Math.ceil(auditTotal / 25)}
                </span>
                <button
                  type="button"
                  disabled={auditPage * 25 >= auditTotal}
                  onClick={() => setAuditPage((p) => p + 1)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subdued)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ACTION CONFIRMATION MODAL                                            */}
      {/* ==================================================================== */}
      {actionModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderLeft: '4px solid #2563EB',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={18} color="#2563EB" />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#2563EB',
                  textTransform: 'uppercase',
                }}
              >
                FACULTY ACTION VERIFICATION
              </span>
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>
              {actionModal.title}
            </h3>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px' }}>
              {actionModal.description}
            </p>

            {actionModal.error && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--status-danger-bg)',
                  border: '1px solid var(--status-danger)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--status-danger)',
                  marginBottom: '16px',
                }}
              >
                {actionModal.error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Accountability Audit Note <span style={{ color: 'var(--text-muted)' }}>(Recorded in immutable log)</span>
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Reason or justification for this moderation decision..."
                rows={3}
                style={{
                  width: '100%',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={actionModal.isSubmitting}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subdued)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeActionModal}
                disabled={actionModal.isSubmitting}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  color: '#FFFFFF',
                  backgroundColor:
                    actionModal.type === 'remove_resource' || actionModal.type === 'ban_user'
                      ? 'var(--status-danger)'
                      : '#2563EB',
                }}
              >
                {actionModal.isSubmitting ? 'Confirming...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboardView;
