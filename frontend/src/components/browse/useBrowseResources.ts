import { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resourcesApi, taxonomyApi } from '../../services/api';
import type {
  ResourceFilterParams,
  ResourceListItem,
  SubjectItem,
  ResourceType,
  SortByOption,
} from '../../types';

export function useBrowseResources() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [, startTransition] = useTransition();

  const [resources, setResources] = useState<ResourceListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // Query parameter extraction
  const currentSubjectId = searchParams.get('subject_id')
    ? Number(searchParams.get('subject_id'))
    : undefined;
  const currentSubjectCode = searchParams.get('subject_code') || undefined;
  const currentUnitId = searchParams.get('unit_id')
    ? Number(searchParams.get('unit_id'))
    : undefined;
  const currentTopicId = searchParams.get('topic_id')
    ? Number(searchParams.get('topic_id'))
    : undefined;
  const currentSemester = searchParams.get('semester')
    ? Number(searchParams.get('semester'))
    : undefined;
  const currentType = (searchParams.get('type') as ResourceType) || undefined;
  const currentMinRating = searchParams.get('min_rating')
    ? Number(searchParams.get('min_rating'))
    : undefined;
  const currentIsVerified = searchParams.get('is_verified') === 'true' ? true : undefined;
  const currentQ = searchParams.get('q') || undefined;
  const currentSortBy = (searchParams.get('sort_by') as SortByOption) || 'ranked';
  const currentPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

  const activeFilters: ResourceFilterParams = {
    subject_id: currentSubjectId,
    subject_code: currentSubjectCode,
    unit_id: currentUnitId,
    topic_id: currentTopicId,
    semester: currentSemester,
    type: currentType,
    min_rating: currentMinRating,
    is_verified: currentIsVerified,
    q: currentQ,
    sort_by: currentSortBy,
    page: currentPage,
    page_size: 20,
  };

  useEffect(() => {
    let mounted = true;
    taxonomyApi.getSubjectsTree().then((data) => {
      if (mounted) setSubjects(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resData = await resourcesApi.list(activeFilters);
      const items = resData?.items || [];
      setResources(items);
      setTotalCount(resData?.total ?? items.length);
      setTotalPages(resData?.total_pages ?? 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load study materials.');
      setResources([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentSubjectId,
    currentSubjectCode,
    currentUnitId,
    currentTopicId,
    currentSemester,
    currentType,
    currentMinRating,
    currentIsVerified,
    currentQ,
    currentSortBy,
    currentPage,
  ]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const updateFilters = useCallback(
    (newFilters: Partial<ResourceFilterParams>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        Object.entries(newFilters).forEach(([key, val]) => {
          if (val === undefined || val === null || val === '') {
            params.delete(key);
          } else {
            params.set(key, String(val));
          }
        });
        if (!('page' in newFilters)) {
          params.delete('page');
        }
        setSearchParams(params, { replace: true });
      });
    },
    [searchParams, setSearchParams]
  );

  const resetFilters = useCallback(() => {
    startTransition(() => {
      setSearchParams(new URLSearchParams(), { replace: true });
    });
  }, [setSearchParams]);

  const handleVoteUpdate = (
    resourceId: number,
    upvotes: number,
    downvotes: number,
    userVote: 'up' | 'down' | null
  ) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? { ...r, user_vote: userVote, upvotes_count: upvotes, downvotes_count: downvotes }
          : r
      )
    );
  };

  const handleBookmarkToggle = (resourceId: number, isBookmarked: boolean) => {
    setResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, is_bookmarked: isBookmarked } : r))
    );
  };

  return {
    resources,
    totalCount,
    totalPages,
    isLoading,
    error,
    subjects,
    activeFilters,
    updateFilters,
    resetFilters,
    fetchResources,
    handleVoteUpdate,
    handleBookmarkToggle,
  };
}
