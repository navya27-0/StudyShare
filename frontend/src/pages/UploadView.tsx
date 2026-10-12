import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  FileQuestion,
  FlaskConical,
  BookOpen,
  Link as LinkIcon,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileCode,
  RotateCcw,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { taxonomyApi, resourcesApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type {
  SubjectItem,
  UnitItem,
  TopicItem,
  ResourceType,
  ResourceListItem,
} from '../types';

interface TypeOption {
  type: ResourceType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

const RESOURCE_TYPES: TypeOption[] = [
  {
    type: 'notes',
    label: 'Lecture Notes',
    desc: 'Handwritten or typed classroom notes & summaries',
    icon: <FileText size={18} />,
  },
  {
    type: 'question_bank',
    label: 'Past Papers / PYQs',
    desc: 'Previous year question papers, midterms & solutions',
    icon: <FileQuestion size={18} />,
  },
  {
    type: 'pdf',
    label: 'Study Guide (PDF)',
    desc: 'Complete unit guides, formula sheets & slide decks',
    icon: <FileCode size={18} />,
  },
  {
    type: 'lab_record',
    label: 'Lab Manual / Code',
    desc: 'Experiment write-ups, source code & lab solutions',
    icon: <FlaskConical size={18} />,
  },
  {
    type: 'paper',
    label: 'Reference Paper',
    desc: 'Academic papers, monographs & supplementary reading',
    icon: <BookOpen size={18} />,
  },
  {
    type: 'link',
    label: 'External Link',
    desc: 'Google Drive folder, GitHub repo, Overleaf, or video playlist',
    icon: <LinkIcon size={18} />,
  },
];

const UPLOAD_DRAFT_KEY = 'studyshare_upload_draft_v1';

/**
 * Clean up messy student filenames like "notes_final_latest_new_dijkstra_algorithm.pdf"
 * into a clean, readable title like "CS201 Unit 3 — Dijkstra Algorithm".
 */
function cleanFilenameToTitle(
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

export const UploadView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Taxonomy State
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedUnitId, setSelectedUnitId] = useState<number | ''>('');
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>('');

  // Inline Creation State
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState<number | ''>('');
  const [isCreatingUnit, setIsCreatingUnit] = useState(false);

  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  // Form Fields State (hydrated from local draft if present)
  const [resourceType, setResourceType] = useState<ResourceType>('notes');
  const [semester, setSemester] = useState<number>(3);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | ''>('');
  const [changelog, setChangelog] = useState('Initial upload');

  // Duplicate Detection State (Priority 5.14)
  const [duplicateMatches, setDuplicateMatches] = useState<ResourceListItem[]>([]);
  const [dismissedDuplicateWarning, setDismissedDuplicateWarning] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Hydrate saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(UPLOAD_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.title) setTitle(draft.title);
        if (draft.description) setDescription(draft.description);
        if (draft.resourceType) setResourceType(draft.resourceType);
        if (draft.pageCount) setPageCount(draft.pageCount);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save draft to localStorage when fields change
  useEffect(() => {
    try {
      localStorage.setItem(
        UPLOAD_DRAFT_KEY,
        JSON.stringify({ title, description, resourceType, pageCount })
      );
    } catch {
      // ignore
    }
  }, [title, description, resourceType, pageCount]);

  // Fetch taxonomy on mount with support for pre-selected URL params
  const loadTaxonomy = useCallback(async () => {
    setLoadingTaxonomy(true);
    setTaxonomyError(null);
    try {
      const data = await taxonomyApi.getSubjectsTree();
      setSubjects(data);
      if (data.length > 0) {
        const paramSubjId = Number(searchParams.get('subject_id'));
        const initialSubj = data.find((s) => s.id === paramSubjId) || data[0];
        setSelectedSubjectId(initialSubj.id);
        setSemester(initialSubj.semester);
        const firstUnits = initialSubj.units || [];
        if (firstUnits.length > 0) {
          const paramUnitId = Number(searchParams.get('unit_id'));
          const initialUnit =
            firstUnits.find((u) => u.id === paramUnitId) || firstUnits[0];
          setSelectedUnitId(initialUnit.id);
          const firstTopics = initialUnit.topics || [];
          if (firstTopics.length > 0) {
            setSelectedTopicId(firstTopics[0].id);
          }
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load course list';
      setTaxonomyError(msg);
      showToast(`Course list loading error: ${msg}`, 'error');
    } finally {
      setLoadingTaxonomy(false);
    }
  }, [searchParams, showToast]);

  useEffect(() => {
    loadTaxonomy();
  }, [loadTaxonomy]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const availableUnits = activeSubject?.units || [];
  const activeUnit = availableUnits.find((u) => u.id === selectedUnitId);
  const availableTopics = activeUnit?.topics || [];
  const activeTopic = availableTopics.find((t) => t.id === selectedTopicId);

  // Live Duplicate Detection (Priority 5.14)
  useEffect(() => {
    if (!selectedTopicId || title.trim().length < 4) {
      setDuplicateMatches([]);
      return;
    }
    setDismissedDuplicateWarning(false);
    const timer = setTimeout(() => {
      resourcesApi
        .checkDuplicate({
          topic_id: Number(selectedTopicId),
          title: title.trim(),
          filename: selectedFile?.name,
        })
        .then((res) => {
          if (res.has_duplicates) {
            setDuplicateMatches(res.matches);
          } else {
            setDuplicateMatches([]);
          }
        })
        .catch(() => {
          // non-blocking
        });
    }, 380);

    return () => clearTimeout(timer);
  }, [selectedTopicId, title, selectedFile?.name]);

  // When subject changes, reset unit and topic
  const handleSubjectChange = (newSubId: number) => {
    setSelectedSubjectId(newSubId);
    const sub = subjects.find((s) => s.id === newSubId);
    if (sub) {
      setSemester(sub.semester);
      const units = sub.units || [];
      if (units.length > 0) {
        setSelectedUnitId(units[0].id);
        const topics = units[0].topics || [];
        setSelectedTopicId(topics.length > 0 ? topics[0].id : '');
      } else {
        setSelectedUnitId('');
        setSelectedTopicId('');
      }
    }
  };

  // When unit changes, reset topic
  const handleUnitChange = (newUnitId: number) => {
    setSelectedUnitId(newUnitId);
    const unit = availableUnits.find((u) => u.id === newUnitId);
    if (unit) {
      const topics = unit.topics || [];
      setSelectedTopicId(topics.length > 0 ? topics[0].id : '');
    } else {
      setSelectedTopicId('');
    }
  };

  // Inline Unit Creation Handler
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !newUnitTitle.trim()) return;
    setIsCreatingUnit(true);
    setFormError(null);
    try {
      const unitNum = newUnitNumber === '' ? undefined : Number(newUnitNumber);
      const created = await resourcesApi.createUnit(
        Number(selectedSubjectId),
        newUnitTitle.trim(),
        unitNum
      );
      taxonomyApi.invalidateCache();

      const updatedUnit: UnitItem = {
        id: created.id,
        subject_id: created.subject_id,
        unit_number: created.unit_number,
        title: created.title,
        ordering: created.ordering,
        topics: [],
      };

      setSubjects((prev) =>
        prev.map((s) => {
          if (s.id === selectedSubjectId) {
            const currentUnits = s.units || [];
            return { ...s, units: [...currentUnits, updatedUnit] };
          }
          return s;
        })
      );

      setSelectedUnitId(created.id);
      setSelectedTopicId('');
      setNewUnitTitle('');
      setNewUnitNumber('');
      setShowNewUnitForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create unit');
    } finally {
      setIsCreatingUnit(false);
    }
  };

  // Inline Topic Creation Handler
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId || !newTopicTitle.trim()) return;
    setIsCreatingTopic(true);
    setFormError(null);
    try {
      const created = await resourcesApi.createTopic(
        Number(selectedUnitId),
        newTopicTitle.trim()
      );
      taxonomyApi.invalidateCache();

      const updatedTopic: TopicItem = {
        id: created.id,
        unit_id: created.unit_id,
        title: created.title,
        ordering: created.ordering,
      };

      setSubjects((prev) =>
        prev.map((s) => {
          if (s.id === selectedSubjectId) {
            const currentUnits = (s.units || []).map((u) => {
              if (u.id === selectedUnitId) {
                return { ...u, topics: [...(u.topics || []), updatedTopic] };
              }
              return u;
            });
            return { ...s, units: currentUnits };
          }
          return s;
        })
      );

      setSelectedTopicId(created.id);
      setNewTopicTitle('');
      setShowNewTopicForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create topic');
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const applyFileWithSuggestedTitle = (file: File) => {
    setSelectedFile(file);
    if (!title.trim()) {
      const suggested = cleanFilenameToTitle(
        file.name,
        activeSubject?.code,
        activeUnit?.unit_number
      );
      if (suggested) {
        setTitle(suggested);
      }
    }
  };

  // File dropzone handlers
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      applyFileWithSuggestedTitle(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      applyFileWithSuggestedTitle(e.target.files[0]);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedTopicId) {
      setFormError('Please select or create a topic before uploading.');
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      setFormError('Resource title must be at least 3 characters long.');
      return;
    }
    if (resourceType === 'link') {
      if (!externalUrl.trim() || !externalUrl.startsWith('http')) {
        setFormError('Please provide a valid URL starting with http:// or https://');
        return;
      }
    } else {
      if (!selectedFile) {
        setFormError('Please select or drag-and-drop a file to upload.');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setFormError(
          `File exceeds the 50 MB upload limit (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB). Please compress or select a smaller document.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('topic_id', String(selectedTopicId));
      formData.append('type', resourceType);
      formData.append('title', title.trim());
      formData.append('semester', String(semester));
      formData.append('changelog', changelog.trim() || 'Initial upload');

      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (pageCount !== '') {
        formData.append('page_count', String(pageCount));
      }

      if (resourceType === 'link') {
        formData.append('external_url', externalUrl.trim());
      } else if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await resourcesApi.create(formData);
      try {
        localStorage.removeItem(UPLOAD_DRAFT_KEY);
      } catch {
        // ignore
      }
      showToast('Your notes have been uploaded and shared with your course!', 'success');
      navigate(`/resources/${res.id}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Upload failed due to a network or server error. Your draft is saved — please try again.';
      setFormError(errorMsg);
      showToast(`Upload failed: ${errorMsg}`, 'error');
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Compute 7-step completion status (Priority 6.16)
  const steps = [
    { num: 1, label: 'Choose course', done: Boolean(selectedSubjectId) },
    { num: 2, label: 'Choose unit/topic', done: Boolean(selectedUnitId && selectedTopicId) },
    { num: 3, label: 'Resource type', done: Boolean(resourceType) },
    { num: 4, label: 'Title & details', done: title.trim().length >= 3 },
    {
      num: 5,
      label: resourceType === 'link' ? 'Add link' : 'Select file',
      done: resourceType === 'link' ? externalUrl.startsWith('http') : Boolean(selectedFile),
    },
    {
      num: 6,
      label: 'Review details',
      done:
        Boolean(selectedSubjectId && selectedTopicId) &&
        title.trim().length >= 3 &&
        (resourceType === 'link' ? externalUrl.startsWith('http') : Boolean(selectedFile)),
    },
    { num: 7, label: 'Upload', done: false },
  ];

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Top Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to Find Resources
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span className="daq-tag">
            <span className="daq-beacon" aria-hidden="true" />
            SHARE STUDY MATERIALS
          </span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(24px, 3.5vw, 32px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            marginBottom: '8px',
          }}
        >
          Upload Notes &amp; Study Material
        </h1>
        <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', maxWidth: '660px' }}>
          Share lecture notes, past question papers (PYQs), lab manuals, or study guides with classmates in your course.
        </p>
      </div>

      {/* Priority 6.16: 7-Step Guided Upload Progress Bar */}
      <nav
        aria-label="Upload steps"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
          gap: '8px',
          padding: '12px 14px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
        }}
      >
        {steps.map((step) => (
          <div
            key={step.num}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '12px',
              color: step.done ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: step.done ? 600 : 500,
            }}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: step.done ? 'var(--status-verified)' : 'var(--bg-subdued)',
                color: step.done ? '#000' : 'var(--text-muted)',
                border: `1px solid ${step.done ? 'var(--status-verified)' : 'var(--border-strong)'}`,
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {step.done ? <Check size={11} strokeWidth={2.6} /> : step.num}
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {step.label}
            </span>
          </div>
        ))}
      </nav>

      {/* Curriculum Taxonomy Loading Error Banner */}
      {taxonomyError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--status-danger)',
            fontSize: '13.5px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>Could not load courses: {taxonomyError}</span>
          </div>
          <button
            type="button"
            onClick={loadTaxonomy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--status-danger)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-danger)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Retry Loading</span>
          </button>
        </div>
      )}

      {/* Form Submission Error Banner */}
      {formError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--status-danger)',
            fontSize: '13.5px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            aria-label="Dismiss error"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--status-danger)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Steps 1 & 2: Choose Course & Unit/Topic */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-core)',
                padding: '2px 8px',
                backgroundColor: 'var(--accent-tint)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              STEPS 1 &amp; 2
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Choose Course, Unit &amp; Topic
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '18px',
            }}
          >
            {/* Subject Selector */}
            <div>
              <label
                htmlFor="upload-subject-select"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                1. Course <span style={{ color: 'var(--accent-core)' }}>*</span>
              </label>
              <select
                id="upload-subject-select"
                aria-label="Select Course"
                value={selectedSubjectId}
                onChange={(e) => handleSubjectChange(Number(e.target.value))}
                disabled={loadingTaxonomy || subjects.length === 0}
                style={{ width: '100%', height: '40px' }}
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} — {sub.name} (Sem {sub.semester})
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Selector with inline create */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <label
                  htmlFor="upload-unit-select"
                  style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  2a. Unit / Module <span style={{ color: 'var(--accent-core)' }}>*</span>
                </label>
                {!showNewUnitForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewUnitForm(true)}
                    aria-expanded={showNewUnitForm}
                    aria-label="Add new unit"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--accent-core)',
                      padding: '2px 4px',
                    }}
                  >
                    <Plus size={13} aria-hidden="true" /> New Unit
                  </button>
                )}
              </div>

              {!showNewUnitForm ? (
                <select
                  id="upload-unit-select"
                  aria-label="Select Unit"
                  value={selectedUnitId}
                  onChange={(e) => handleUnitChange(Number(e.target.value))}
                  disabled={availableUnits.length === 0}
                  style={{ width: '100%', height: '40px' }}
                >
                  {availableUnits.length === 0 && <option value="">No units yet — click New Unit</option>}
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number}: {u.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-subdued)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Add New Unit
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewUnitForm(false)}
                      aria-label="Cancel new unit"
                      style={{ padding: '4px' }}
                    >
                      <X size={14} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Unit Title (e.g. Graph Algorithms)"
                    aria-label="New Unit Title"
                    value={newUnitTitle}
                    onChange={(e) => setNewUnitTitle(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Unit # (optional)"
                      aria-label="Unit number"
                      value={newUnitNumber}
                      onChange={(e) =>
                        setNewUnitNumber(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      style={{ width: '120px' }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateUnit}
                      disabled={isCreatingUnit || !newUnitTitle.trim()}
                      className="daq-btn-primary"
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        flex: 1,
                      }}
                    >
                      {isCreatingUnit ? 'Saving...' : 'Save Unit'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Topic Selector with inline create */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <label
                  htmlFor="upload-topic-select"
                  style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  2b. Topic <span style={{ color: 'var(--accent-core)' }}>*</span>
                </label>
                {!showNewTopicForm && selectedUnitId !== '' && (
                  <button
                    type="button"
                    onClick={() => setShowNewTopicForm(true)}
                    aria-expanded={showNewTopicForm}
                    aria-label="Add new topic"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--accent-core)',
                      padding: '2px 4px',
                    }}
                  >
                    <Plus size={13} aria-hidden="true" /> New Topic
                  </button>
                )}
              </div>

              {!showNewTopicForm ? (
                <select
                  id="upload-topic-select"
                  aria-label="Select Topic"
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(Number(e.target.value))}
                  disabled={availableTopics.length === 0}
                  style={{ width: '100%', height: '40px' }}
                >
                  {availableTopics.length === 0 && (
                    <option value="">No topics yet — click New Topic</option>
                  )}
                  {availableTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-subdued)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Add New Topic
                    </span>
                    <button
                      type="button"
                      aria-label="Cancel new topic"
                      onClick={() => setShowNewTopicForm(false)}
                    >
                      <X size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                  <input
                    type="text"
                    aria-label="New Topic Title"
                    placeholder="Topic Title (e.g. Dijkstra Shortest Path)"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateTopic}
                    disabled={isCreatingTopic || !newTopicTitle.trim()}
                    className="daq-btn-primary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      width: '100%',
                    }}
                  >
                    {isCreatingTopic ? 'Saving...' : 'Save Topic'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Steps 3 & 4: Select Resource Type + Add Title & Description */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-core)',
                padding: '2px 8px',
                backgroundColor: 'var(--accent-tint)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              STEPS 3 &amp; 4
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Resource Type, Title &amp; Description
            </h2>
          </div>

          {/* Type Grid */}
          <div style={{ marginBottom: '20px' }}>
            <label
              id="upload-category-label"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            >
              3. Select Resource Type <span style={{ color: 'var(--accent-core)' }}>*</span>
            </label>
            <div
              role="radiogroup"
              aria-labelledby="upload-category-label"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '10px',
              }}
            >
              {RESOURCE_TYPES.map((opt) => {
                const isSelected = resourceType === opt.type;
                return (
                  <div
                    key={opt.type}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => setResourceType(opt.type)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setResourceType(opt.type);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${
                        isSelected ? 'var(--accent-core)' : 'var(--border-subtle)'
                      }`,
                      backgroundColor: isSelected ? 'var(--accent-tint)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    <div
                      style={{
                        color: isSelected ? 'var(--accent-core)' : 'var(--text-secondary)',
                        marginTop: '2px',
                      }}
                      aria-hidden="true"
                    >
                      {opt.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isSelected ? 'var(--accent-core)' : 'var(--text-primary)',
                          marginBottom: '2px',
                        }}
                      >
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority 6.17: Upload Title Guidance Box */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '12.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="var(--status-verified)" aria-hidden="true" />
              <span>Tip: Clear titles help classmates find your notes during exams</span>
            </div>
            <div style={{ color: 'var(--status-verified)', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
              ✓ Good title: {activeSubject?.code || 'CS201'}{' '}
              {activeUnit ? `Unit ${activeUnit.unit_number}` : 'Unit 3'} —{' '}
              {activeTopic?.title || 'Dijkstra Algorithm'} Lecture Notes
            </div>
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
              ✗ Avoid: notes_final_latest_new.pdf
            </div>
          </div>

          {/* Title & Semester Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div>
              <label
                htmlFor="upload-resource-title"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                4. Resource Title <span style={{ color: 'var(--accent-core)' }}>*</span>
              </label>
              <input
                id="upload-resource-title"
                type="text"
                placeholder={`e.g. ${activeSubject?.code || 'CS201'} Unit ${
                  activeUnit?.unit_number || 3
                } — ${activeTopic?.title || 'Dijkstra Algorithm'} Lecture Notes`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', height: '40px' }}
              />
            </div>
            <div>
              <label
                htmlFor="upload-resource-semester"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                Semester <span style={{ color: 'var(--accent-core)' }}>*</span>
              </label>
              <select
                id="upload-resource-semester"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                style={{ width: '100%', height: '40px' }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority 5.14: Duplicate Resource Warning Banner */}
          {duplicateMatches.length > 0 && !dismissedDuplicateWarning && (
            <div
              role="alert"
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--status-exam-bg)',
                border: '1px solid var(--status-exam-border)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AlertTriangle
                  size={18}
                  color="var(--status-exam)"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                  aria-hidden="true"
                />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    A similar resource already exists: &ldquo;{duplicateMatches[0].title}&rdquo;
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Uploaded by {duplicateMatches[0].uploader.display_name} ·{' '}
                    {duplicateMatches[0].downloads_count} downloads. Check if your file adds new content before uploading.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  to={`/resources/${duplicateMatches[0].id}`}
                  className="daq-btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  <span>View existing resource</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setDismissedDuplicateWarning(true)}
                  className="daq-btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  <span>Upload anyway</span>
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="upload-resource-desc"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '6px',
              }}
            >
              Description &amp; Topics Covered (Optional)
            </label>
            <textarea
              id="upload-resource-desc"
              placeholder="Briefly mention what topics, theorems, or exam years this file covers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Optional Page Count */}
          {resourceType !== 'link' && (
            <div style={{ maxWidth: '200px' }}>
              <label
                htmlFor="upload-resource-pages"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                Number of Pages (Optional)
              </label>
              <input
                id="upload-resource-pages"
                type="number"
                min={1}
                max={2000}
                placeholder="e.g. 24"
                value={pageCount}
                onChange={(e) =>
                  setPageCount(e.target.value === '' ? '' : Number(e.target.value))
                }
                style={{ width: '100%', height: '40px' }}
              />
            </div>
          )}
        </div>

        {/* Step 5: Select File or External Link */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-core)',
                padding: '2px 8px',
                backgroundColor: 'var(--accent-tint)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              STEP 5
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {resourceType === 'link' ? 'Add Resource Link' : 'Select Document File'}
            </h2>
          </div>

          {resourceType === 'link' ? (
            <div>
              <label
                htmlFor="upload-external-url"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                Resource Link URL <span style={{ color: 'var(--accent-core)' }}>*</span>
              </label>
              <input
                id="upload-external-url"
                type="url"
                placeholder="https://drive.google.com/... or https://github.com/..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                required
                style={{ width: '100%', height: '40px' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Make sure sharing permissions are set to &ldquo;Anyone with the link can view&rdquo;.
              </p>
            </div>
          ) : (
            <div>
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload document file. Click or drag and drop document"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                style={{
                  border: `2px dashed ${
                    selectedFile ? 'var(--status-verified)' : 'var(--border-strong)'
                  }`,
                  backgroundColor: selectedFile
                    ? 'var(--status-verified-bg)'
                    : 'var(--bg-subdued)',
                  borderRadius: 'var(--radius-md)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label="Select file to upload"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.py,.c,.cpp,.java"
                  style={{ display: 'none' }}
                />

                {selectedFile ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2
                      size={36}
                      style={{ color: 'var(--status-verified)' }}
                      aria-hidden="true"
                    />
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Size: {formatFileSize(selectedFile.size)} · Click or press Enter to replace file
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <UploadCloud
                      size={40}
                      style={{ color: 'var(--accent-core)' }}
                      aria-hidden="true"
                    />
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      Click to choose a file or drag and drop it here
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Supported formats: PDF, DOCX, PPTX, ZIP, Code files (Max 50 MB). Messy filenames are automatically cleaned up into a readable title!
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Version Note */}
          <div style={{ marginTop: '18px' }}>
            <label
              htmlFor="upload-changelog-input"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '6px',
              }}
            >
              Edition / Version Note (Optional)
            </label>
            <input
              id="upload-changelog-input"
              type="text"
              placeholder="e.g. Initial upload, updated for current semester syllabus"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              style={{ width: '100%', height: '38px' }}
            />
          </div>
        </div>

        {/* Step 6: Review Details Summary Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              STEP 6 · REVIEW SUMMARY BEFORE UPLOAD
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeSubject ? `${activeSubject.code} (${activeSubject.name})` : 'No course selected'}
              {activeUnit ? ` → Unit ${activeUnit.unit_number}` : ''}
              {activeTopic ? ` → ${activeTopic.title}` : ''}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Title: <strong>{title.trim() || 'Not entered yet'}</strong> · Type:{' '}
              <strong>
                {RESOURCE_TYPES.find((r) => r.type === resourceType)?.label || resourceType}
              </strong>
              {selectedFile ? ` · File: ${selectedFile.name} (${formatFileSize(selectedFile.size)})` : ''}
            </div>
          </div>
        </div>

        {/* Upload Progress Indicator */}
        {isSubmitting && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              <span>UPLOADING YOUR RESOURCE...</span>
              <span>PLEASE KEEP THIS TAB OPEN</span>
            </div>
            <div className="upload-hairline-progress">
              <div className="upload-hairline-progress-bar" />
            </div>
          </div>
        )}

        {/* Step 7: Submit Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '14px',
            marginTop: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            className="daq-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="daq-btn-primary touch-target"
            style={{
              padding: '10px 26px',
              fontSize: '14px',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud size={16} aria-hidden="true" />
                <span>7. Upload Notes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
