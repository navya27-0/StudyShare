import React from 'react';
import { Search, AlertTriangle, UserCheck, UserX } from 'lucide-react';
import type { User } from '../../types';
import type { ActionModalState } from './ModerationActionModal';

interface AdminUsersPanelProps {
  users: User[];
  total: number;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  roleFilter: string;
  onRoleFilterChange: (r: string) => void;
  activeFilter: string;
  onActiveFilterChange: (a: string) => void;
  page: number;
  onPageChange: (p: number) => void;
  onOpenActionModal: (modal: ActionModalState) => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({
  users,
  total,
  loading,
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  activeFilter,
  onActiveFilterChange,
  page,
  onPageChange,
  onOpenActionModal,
}) => {
  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="text-xs"
          >
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => onActiveFilterChange(e.target.value)}
            className="text-xs"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="banned">Banned Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Reputation</th>
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/40 text-xs">
                  Loading user directory...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/40 text-xs">
                  No users found matching search criteria.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const initials = (u.display_name || u.email)
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="daq-avatar">{initials}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-white text-xs truncate">
                            {u.display_name}
                          </p>
                          <p className="text-[11px] text-white/40 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs uppercase tracking-wider text-white/70">
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold uppercase ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-white/80">
                        {u.contributor_profile?.reputation_points ?? 0} pts
                      </span>
                    </td>
                    <td className="font-mono text-[11px] text-white/40 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenActionModal({
                              isOpen: true,
                              type: 'warn_user',
                              title: `Issue Warning to ${u.display_name}`,
                              description: 'Record an academic conduct warning in the audit log.',
                              userId: u.id,
                              userName: u.display_name,
                            })
                          }
                          className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30 flex items-center gap-1"
                        >
                          <AlertTriangle size={12} /> Warn
                        </button>
                        {u.is_active ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenActionModal({
                                isOpen: true,
                                type: 'ban_user',
                                title: `Ban User ${u.display_name}`,
                                description:
                                  'Deactivate this user account and block further logins.',
                                userId: u.id,
                                userName: u.display_name,
                              })
                            }
                            className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center gap-1"
                          >
                            <UserX size={12} /> Ban
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenActionModal({
                                isOpen: true,
                                type: 'unban_user',
                                title: `Unban User ${u.display_name}`,
                                description:
                                  'Re-enable this student account to restore portal access.',
                                userId: u.id,
                                userName: u.display_name,
                              })
                            }
                            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 flex items-center gap-1"
                          >
                            <UserCheck size={12} /> Unban
                          </button>
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
