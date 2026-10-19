import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/api';
import type { ModerationActionItem } from '../../types';

export function useModerationActions(onError: (msg: string) => void) {
  const [actions, setActions] = useState<ModerationActionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getModerationActions({
        page,
        pageSize: 25,
      });
      setActions(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, onError]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return {
    actions,
    total,
    loading,
    page,
    setPage,
    refetch: fetchActions,
  };
}
