import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/api';
import type { User } from '../../types';

export function useAdminUsers(onError: (msg: string) => void) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const activeParam =
        activeFilter === 'active' ? true : activeFilter === 'banned' ? false : undefined;
      const res = await adminApi.getUsers({
        q: searchQuery.trim() || undefined,
        role: roleFilter || undefined,
        is_active: activeParam,
        page,
        pageSize: 20,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, activeFilter, page, onError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    total,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    activeFilter,
    setActiveFilter,
    loading,
    page,
    setPage,
    refetch: fetchUsers,
  };
}
