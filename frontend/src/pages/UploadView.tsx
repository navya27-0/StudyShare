import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { taxonomyApi, resourcesApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { SubjectItem, UnitItem, TopicItem, ResourceType } from '../types';

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
    type: 'pdf',
    label: 'Reference PDF',
    desc: 'Textbook chapters, syllabus guides & slide decks',
    icon: <FileCode size={18} />,
  },
  {
    type: 'paper',
    label: 'Past Exam Paper',
    desc: 'Previous year question papers (PYQs) & midterms',
    icon: <FileQuestion size={18} />,
  },
  {
    type: 'question_bank',
    label: 'Question Bank',
    desc: 'Curated practice problem sets with solutions',
    icon: <BookOpen size={18} />,
  },
  {
    type: 'lab_record',
    label: 'Lab Manual / Code',
    desc: 'Experiment write-ups, source code & execution logs',
    icon: <FlaskConical size={18} />,
  },
  {
    type: 'link',
    label: 'External Link',
    desc: 'Google Drive, GitHub repo, Overleaf, or video playlist',
    icon: <LinkIcon size={18} />,
  },
];

export const UploadView: React.FC = () => {
  const navigate = useNavigate();
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

  // Form Fields State
  const [resourceType, setResourceType] = useState<ResourceType>('notes');
  const [semester, setSemester] = useState<number>(3);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | ''>('');
  const [changelog, setChangelog] = useState('Initial upload');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch taxonomy on mount with error feedback
  const loadTaxonomy = useCallback(async () => {
    setLoadingTaxonomy(true);
    setTaxonomyError(null);
    try {
      const data = await taxonomyApi.getSubjectsTree();
      setSubjects(data);
      if (data.length > 0) {
        setSelectedSubjectId(data[0].id);
        setSemester(data[0].semester);
        const firstUnits = data[0].units || [];
        if (firstUnits.length > 0) {
          setSelectedUnitId(firstUnits[0].id);
          const firstTopics = firstUnits[0].topics || [];
          if (firstTopics.length > 0) {
            setSelectedTopicId(firstTopics[0].id);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query curriculum taxonomy';
      setTaxonomyError(msg);
      showToast(`Curriculum loading error: ${msg}`, 'error');
    } finally {
      setLoadingTaxonomy(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadTaxonomy();
  }, [loadTaxonomy]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const availableUnits = activeSubject?.units || [];
  const activeUnit = availableUnits.find((u) => u.id === selectedUnitId);
  const availableTopics = activeUnit?.topics || [];

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
      const created = await resourcesApi.createUnit(Number(selectedSubjectId), newUnitTitle.trim(), unitNum);
      
      const updatedUnit: UnitItem = {
        id: created.id,
        subject_id: created.subject_id,
        unit_number: created.unit_number,
        title: created.title,
        ordering: created.ordering,
        topics: [],
      };

      // Update state
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
      const created = await resourcesApi.createTopic(Number(selectedUnitId), newTopicTitle.trim());

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

  // File dropzone handlers
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!selectedTopicId) {
      setFormError('Please select or create an academic topic before uploading.');
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
        setFormError('Please select or drag-and-drop a document file to upload.');
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
      showToast('Study resource successfully uploaded to academic ledger!', 'success');
      navigate(`/resources/${res.id}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Upload failed due to a network or server error. Please try again.';
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
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-tint)',
              color: 'var(--accent-core)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Academic Contribution
          </div>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.25,
            marginBottom: '6px',
          }}
        >
          Publish Study Resource
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Contribute verified lecture notes, past exam question banks, lab records, or references to the engineering ledger.
        </p>
      </div>

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
            <span>Curriculum network error: {taxonomyError}</span>
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Step 1: Academic Taxonomy Hierarchy */}
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
              STEP 1
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Curriculum Taxonomy Placement
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            {/* Subject Selector */}
            <div>
              <label
                htmlFor="upload-subject-select"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}
              >
                Subject / Course <span style={{ color: 'var(--accent-core)' }}>*</span>
              </label>
              <select
                id="upload-subject-select"
                aria-label="Select Subject / Course"
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  htmlFor="upload-unit-select"
                  style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  Unit / Module <span style={{ color: 'var(--accent-core)' }}>*</span>
                </label>
                {!showNewUnitForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewUnitForm(true)}
                    aria-expanded={showNewUnitForm}
                    aria-label="Add new unit inline"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--accent-core)',
                      padding: '4px',
                    }}
                    className="touch-target"
                  >
                    <Plus size={13} aria-hidden="true" /> Add Unit
                  </button>
                )}
              </div>

              {!showNewUnitForm ? (
                <select
                  id="upload-unit-select"
                  aria-label="Select Unit / Module"
                  value={selectedUnitId}
                  onChange={(e) => handleUnitChange(Number(e.target.value))}
                  disabled={availableUnits.length === 0}
                  style={{ width: '100%', height: '40px' }}
                >
                  {availableUnits.length === 0 && <option value="">No units defined yet</option>}
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
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>New Unit</span>
                    <button
                      type="button"
                      onClick={() => setShowNewUnitForm(false)}
                      aria-label="Cancel new unit"
                      style={{ padding: '4px' }}
                      className="touch-target"
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
                      onChange={(e) => setNewUnitNumber(e.target.value === '' ? '' : Number(e.target.value))}
                      style={{ width: '120px' }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateUnit}
                      disabled={isCreatingUnit || !newUnitTitle.trim()}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--accent-core)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        flex: 1,
                      }}
                      className="touch-target"
                    >
                      {isCreatingUnit ? 'Saving...' : 'Add Unit'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Topic Selector with inline create */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  htmlFor="upload-topic-select"
                  style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  Topic / Subtopic <span style={{ color: 'var(--accent-core)' }}>*</span>
                </label>
                {!showNewTopicForm && selectedUnitId !== '' && (
                  <button
                    type="button"
                    onClick={() => setShowNewTopicForm(true)}
                    aria-expanded={showNewTopicForm}
                    aria-label="Add new topic inline"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--accent-core)',
                      padding: '4px',
                    }}
                    className="touch-target"
                  >
                    <Plus size={13} aria-hidden="true" /> Add Topic
                  </button>
                )}
              </div>

              {!showNewTopicForm ? (
                <select
                  id="upload-topic-select"
                  aria-label="Select Topic / Subtopic"
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(Number(e.target.value))}
                  disabled={availableTopics.length === 0}
                  style={{ width: '100%', height: '40px' }}
                >
                  {availableTopics.length === 0 && <option value="">No topics in this unit yet</option>}
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
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>New Topic</span>
                    <button type="button" onClick={() => setShowNewTopicForm(false)}>
                      <X size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Topic Title (e.g. Dijkstra Shortest Path)"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateTopic}
                    disabled={isCreatingTopic || !newTopicTitle.trim()}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--accent-core)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      width: '100%',
                    }}
                  >
                    {isCreatingTopic ? 'Saving...' : 'Add Topic'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Resource Type & Metadata */}
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
              STEP 2
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Resource Classification & Details
            </h2>
          </div>

          {/* Type Grid */}
          <div style={{ marginBottom: '20px' }}>
            <label
              id="upload-category-label"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}
            >
              Resource Category <span style={{ color: 'var(--accent-core)' }}>*</span>
            </label>
            <div
              role="radiogroup"
              aria-labelledby="upload-category-label"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}
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
                      border: `1.5px solid ${isSelected ? 'var(--accent-core)' : 'var(--border-subtle)'}`,
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
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Title & Semester Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label
                htmlFor="upload-resource-title"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}
              >
                Resource Title <span style={{ color: 'var(--accent-core)' }}>*</span>
              </label>
              <input
                id="upload-resource-title"
                type="text"
                placeholder="e.g. Complete Unit 2 AVL Tree Rotations & Solved PYQs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', height: '40px' }}
              />
            </div>
            <div>
              <label
                htmlFor="upload-resource-semester"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}
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

          {/* Description */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="upload-resource-desc"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}
            >
              Description & Context (Optional)
            </label>
            <textarea
              id="upload-resource-desc"
              placeholder="Outline what topics this document covers, formulas included, professor hints, or specific exam references..."
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
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}
              >
                Estimated Pages
              </label>
              <input
                id="upload-resource-pages"
                type="number"
                min={1}
                max={2000}
                placeholder="e.g. 24"
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ width: '100%', height: '40px' }}
              />
            </div>
          )}
        </div>

        {/* Step 3: Payload (File or External Link) */}
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
              STEP 3
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {resourceType === 'link' ? 'Resource External URL' : 'Document File Upload'}
            </h2>
          </div>

          {resourceType === 'link' ? (
            <div>
              <label
                htmlFor="upload-external-url"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}
              >
                Outbound Link URL <span style={{ color: 'var(--accent-core)' }}>*</span>
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
                Ensure this link is set to publicly viewable by university peers (e.g. "Anyone with the link can view").
              </p>
            </div>
          ) : (
            <div>
              {/* Dropzone */}
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
                  border: `2px dashed ${selectedFile ? 'var(--status-verified)' : 'var(--border-strong)'}`,
                  backgroundColor: selectedFile ? 'var(--status-verified-bg)' : 'var(--bg-subdued)',
                  borderRadius: 'var(--radius-md)',
                  padding: '36px 20px',
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={36} style={{ color: 'var(--status-verified)' }} aria-hidden="true" />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Size: {formatFileSize(selectedFile.size)} • Click or press Enter to replace file
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <UploadCloud size={40} style={{ color: 'var(--accent-core)' }} aria-hidden="true" />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Click or press Enter to browse or drag and drop document
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Supported formats: PDF, DOCX, PPTX, ZIP, Code files (Max 50 MB)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Initial Changelog Note */}
          <div style={{ marginTop: '20px' }}>
            <label
              htmlFor="upload-changelog-input"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}
            >
              Version Changelog Note
            </label>
            <input
              id="upload-changelog-input"
              type="text"
              placeholder="e.g. Initial upload, verified against 2024 syllabus"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              style={{ width: '100%', height: '38px' }}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              backgroundColor: 'var(--accent-core)',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
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
                Uploading to Ledger...
              </>
            ) : (
              <>
                <UploadCloud size={16} /> Publish Resource
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
