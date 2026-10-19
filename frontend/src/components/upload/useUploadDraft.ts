import { useState, useEffect } from 'react';
import type { ResourceType } from '../../types';

export const UPLOAD_DRAFT_KEY = 'studyshare_upload_draft_v1';

export interface UploadDraftState {
  selectedSubjectId: number | '';
  selectedUnitId: number | '';
  selectedTopicId: number | '';
  resourceType: ResourceType;
  semester: number;
  title: string;
  description: string;
  externalUrl: string;
  pageCount: number | '';
  changelog: string;
}

export function cleanFilenameToTitle(
  filename: string,
  subjectCode?: string,
  unitNumber?: number
): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanedTokens = withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\b(final|latest|new|v\d+|copy|draft|scan|scanned|doc|pdf)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanedTokens) return '';

  const titleCased = cleanedTokens
    .split(' ')
    .map((word) => {
      if (word.length <= 4 && /^[A-Z0-9]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  const prefix =
    subjectCode && !titleCased.toUpperCase().includes(subjectCode.toUpperCase())
      ? `${subjectCode}${unitNumber ? ` Unit ${unitNumber}` : ''} — `
      : '';

  return `${prefix}${titleCased}`.slice(0, 120);
}

export function useUploadDraft(initialSubjectId?: number | '', initialUnitId?: number | '') {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>(initialSubjectId || '');
  const [selectedUnitId, setSelectedUnitId] = useState<number | ''>(initialUnitId || '');
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>('');
  const [resourceType, setResourceType] = useState<ResourceType>('notes');
  const [semester, setSemester] = useState<number>(3);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | ''>('');
  const [changelog, setChangelog] = useState('Initial upload');
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(UPLOAD_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UploadDraftState>;
        if (parsed.selectedSubjectId !== undefined) setSelectedSubjectId(parsed.selectedSubjectId);
        if (parsed.selectedUnitId !== undefined) setSelectedUnitId(parsed.selectedUnitId);
        if (parsed.selectedTopicId !== undefined) setSelectedTopicId(parsed.selectedTopicId);
        if (parsed.resourceType) setResourceType(parsed.resourceType);
        if (parsed.semester) setSemester(parsed.semester);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.externalUrl) setExternalUrl(parsed.externalUrl);
        if (parsed.pageCount !== undefined) setPageCount(parsed.pageCount);
        if (parsed.changelog) setChangelog(parsed.changelog);
        setHasRestoredDraft(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      const draft: UploadDraftState = {
        selectedSubjectId,
        selectedUnitId,
        selectedTopicId,
        resourceType,
        semester,
        title,
        description,
        externalUrl,
        pageCount,
        changelog,
      };
      localStorage.setItem(UPLOAD_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Ignore quota errors
    }
  }, [
    selectedSubjectId,
    selectedUnitId,
    selectedTopicId,
    resourceType,
    semester,
    title,
    description,
    externalUrl,
    pageCount,
    changelog,
  ]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(UPLOAD_DRAFT_KEY);
    } catch {
      // Ignore
    }
    setTitle('');
    setDescription('');
    setExternalUrl('');
    setSelectedFile(null);
    setPageCount('');
    setChangelog('Initial upload');
    setHasRestoredDraft(false);
  };

  return {
    selectedSubjectId,
    setSelectedSubjectId,
    selectedUnitId,
    setSelectedUnitId,
    selectedTopicId,
    setSelectedTopicId,
    resourceType,
    setResourceType,
    semester,
    setSemester,
    title,
    setTitle,
    description,
    setDescription,
    externalUrl,
    setExternalUrl,
    selectedFile,
    setSelectedFile,
    pageCount,
    setPageCount,
    changelog,
    setChangelog,
    hasRestoredDraft,
    clearDraft,
  };
}
