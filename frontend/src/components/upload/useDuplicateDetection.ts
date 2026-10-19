import { useState, useEffect } from 'react';
import { resourcesApi } from '../../services/api';
import type { ResourceListItem } from '../../types';

export function useDuplicateDetection(
  title: string,
  selectedSubjectId: number | '',
  selectedUnitId: number | '',
  selectedTopicId: number | '',
  selectedFile: File | null
) {
  const [duplicateMatches, setDuplicateMatches] = useState<ResourceListItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [dismissedWarning, setDismissedWarning] = useState(false);

  useEffect(() => {
    if (!title.trim() && !selectedFile) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsChecking(true);
        const res = await resourcesApi.checkDuplicate({
          title: title.trim() || undefined,
          filename: selectedFile?.name,
          subject_id: typeof selectedSubjectId === 'number' ? selectedSubjectId : undefined,
          unit_id: typeof selectedUnitId === 'number' ? selectedUnitId : undefined,
          topic_id: typeof selectedTopicId === 'number' ? selectedTopicId : undefined,
          file_size_bytes: selectedFile?.size,
        });

        if (res.has_duplicates && res.matches?.length) {
          setDuplicateMatches(res.matches);
          setDismissedWarning(false);
        } else {
          setDuplicateMatches([]);
        }
      } catch {
        // Non-blocking duplicate check
      } finally {
        setIsChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [title, selectedSubjectId, selectedUnitId, selectedTopicId, selectedFile]);

  return {
    duplicateMatches,
    isChecking,
    dismissedWarning,
    setDismissedWarning,
  };
}
