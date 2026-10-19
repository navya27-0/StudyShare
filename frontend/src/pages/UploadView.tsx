import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { taxonomyApi, resourcesApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { SubjectItem } from '../types';

import { useUploadDraft, cleanFilenameToTitle } from '../components/upload/useUploadDraft';
import { useDuplicateDetection } from '../components/upload/useDuplicateDetection';
import { FileDropzone } from '../components/upload/FileDropzone';
import { ResourceTypeSelector } from '../components/upload/ResourceTypeSelector';
import { DuplicateWarning } from '../components/upload/DuplicateWarning';
import { UploadTaxonomySelector } from '../components/upload/UploadTaxonomySelector';
import { UploadReviewSummary } from '../components/upload/UploadReviewSummary';

export const UploadView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialSubjectParam = searchParams.get('subject_id')
    ? Number(searchParams.get('subject_id'))
    : '';
  const initialUnitParam = searchParams.get('unit_id')
    ? Number(searchParams.get('unit_id'))
    : '';

  const draft = useUploadDraft(initialSubjectParam, initialUnitParam);

  // Load Taxonomy tree
  const loadTaxonomy = async () => {
    setLoadingTaxonomy(true);
    try {
      const data = await taxonomyApi.getSubjectsTree();
      setSubjects(data);
    } catch {
      showToast('Could not load course curriculum. Using offline fallback.', 'error');
    } finally {
      setLoadingTaxonomy(false);
    }
  };

  useEffect(() => {
    loadTaxonomy();
  }, []);

  // Sync semester when subject changes
  const activeSubject = subjects.find((s) => s.id === draft.selectedSubjectId);
  useEffect(() => {
    if (activeSubject && activeSubject.semester) {
      draft.setSemester(activeSubject.semester);
    }
  }, [draft.selectedSubjectId, activeSubject]);

  // Duplicate detection hook
  const { duplicateMatches, dismissedWarning, setDismissedWarning } = useDuplicateDetection(
    draft.title,
    draft.selectedSubjectId,
    draft.selectedUnitId,
    draft.selectedTopicId,
    draft.selectedFile
  );

  // Auto-fill title from file name if title is empty
  const handleFileSelect = (file: File | null) => {
    draft.setSelectedFile(file);
    if (file && !draft.title.trim()) {
      const activeUnit = activeSubject?.units?.find((u) => u.id === draft.selectedUnitId);
      const generated = cleanFilenameToTitle(
        file.name,
        activeSubject?.code,
        activeUnit?.unit_number
      );
      if (generated) draft.setTitle(generated);
    }
  };

  const handleCreateUnit = async (title: string, unitNumber?: number) => {
    if (typeof draft.selectedSubjectId !== 'number') return;
    try {
      const newUnit = await resourcesApi.createUnit(draft.selectedSubjectId, title, unitNumber);
      showToast(`Unit "${newUnit.title}" created successfully!`, 'success');
      await loadTaxonomy();
      draft.setSelectedUnitId(newUnit.id);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to create unit', 'error');
      throw err;
    }
  };

  const handleCreateTopic = async (title: string) => {
    if (typeof draft.selectedUnitId !== 'number') return;
    try {
      const newTopic = await resourcesApi.createTopic(draft.selectedUnitId, title);
      showToast(`Topic "${newTopic.title}" created successfully!`, 'success');
      await loadTaxonomy();
      draft.setSelectedTopicId(newTopic.id);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to create topic', 'error');
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (typeof draft.selectedTopicId !== 'number') {
      setErrorMsg('Please select a course topic for this resource.');
      return;
    }

    if (!draft.title.trim()) {
      setErrorMsg('Please provide a title for the resource.');
      return;
    }

    if (draft.resourceType === 'link' && !draft.externalUrl.trim()) {
      setErrorMsg('Please enter a valid external link URL.');
      return;
    }

    if (draft.resourceType !== 'link' && !draft.selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('topic_id', String(draft.selectedTopicId));
      formData.append('type', draft.resourceType);
      formData.append('title', draft.title.trim());
      formData.append('semester', String(draft.semester));
      if (draft.description.trim()) formData.append('description', draft.description.trim());
      if (draft.changelog.trim()) formData.append('changelog', draft.changelog.trim());
      if (typeof draft.pageCount === 'number') formData.append('page_count', String(draft.pageCount));

      if (draft.resourceType === 'link') {
        formData.append('external_url', draft.externalUrl.trim());
      } else if (draft.selectedFile) {
        formData.append('file', draft.selectedFile);
      }

      const created = await resourcesApi.create(formData);
      draft.clearDraft();
      showToast('Study resource published successfully! (+15 Reputation)', 'success');
      navigate(`/resources/${created.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to upload resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeUnit = activeSubject?.units?.find((u) => u.id === draft.selectedUnitId);
  const activeTopic = activeUnit?.topics?.find((t) => t.id === draft.selectedTopicId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs text-white/60 hover:text-white flex items-center gap-1.5 mb-2 font-medium"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="font-display font-bold text-2xl text-white">Upload Study Material</h1>
          <p className="text-xs text-white/60 mt-1">
            Contribute verified notes, PYQs, and lab manuals organized by curriculum.
          </p>
        </div>
        {draft.hasRestoredDraft && (
          <button
            type="button"
            onClick={draft.clearDraft}
            className="text-xs text-white/50 hover:text-white/90 flex items-center gap-1.5 p-2 rounded bg-white/5"
            title="Reset restored draft"
          >
            <RotateCcw size={12} /> Clear Draft
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Taxonomy Selectors */}
        <div className="daq-card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
            1. Curriculum Placement
          </h2>
          {loadingTaxonomy ? (
            <p className="text-xs text-white/40">Loading course curriculum...</p>
          ) : (
            <UploadTaxonomySelector
              subjects={subjects}
              selectedSubjectId={draft.selectedSubjectId}
              selectedUnitId={draft.selectedUnitId}
              selectedTopicId={draft.selectedTopicId}
              onSubjectChange={draft.setSelectedSubjectId}
              onUnitChange={draft.setSelectedUnitId}
              onTopicChange={draft.setSelectedTopicId}
              onCreateUnit={handleCreateUnit}
              onCreateTopic={handleCreateTopic}
            />
          )}
        </div>

        {/* 2. Resource Type */}
        <div className="daq-card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
            2. Material Type
          </h2>
          <ResourceTypeSelector value={draft.resourceType} onChange={draft.setResourceType} />
        </div>

        {/* 3. Document Payload / Dropzone */}
        <div className="daq-card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
            3. Document or External Link
          </h2>
          {draft.resourceType === 'link' ? (
            <div className="space-y-1.5">
              <label htmlFor="upload-external-url" className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                Resource Link URL <span className="text-rose-400">*</span>
              </label>
              <input
                id="upload-external-url"
                type="url"
                required
                placeholder="https://drive.google.com/... or https://github.com/..."
                value={draft.externalUrl}
                onChange={(e) => draft.setExternalUrl(e.target.value)}
                className="w-full text-sm"
              />
            </div>
          ) : (
            <FileDropzone selectedFile={draft.selectedFile} onFileSelect={handleFileSelect} />
          )}

          {/* Duplicate Detection Warning */}
          {!dismissedWarning && duplicateMatches.length > 0 && (
            <DuplicateWarning
              matches={duplicateMatches}
              onDismiss={() => setDismissedWarning(true)}
              onSelectAsVersion={(resId) => navigate(`/resources/${resId}?action=update`)}
            />
          )}
        </div>

        {/* 4. Metadata Details */}
        <div className="daq-card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
            4. Details & Academic Metadata
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="upload-resource-title" className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                Resource Title <span className="text-rose-400">*</span>
              </label>
              <input
                id="upload-resource-title"
                type="text"
                required
                placeholder="e.g. CS201 Unit 3 — Graph Algorithms Comprehensive Notes"
                value={draft.title}
                onChange={(e) => draft.setTitle(e.target.value)}
                className="w-full text-sm"
              />
            </div>

            <div>
              <label htmlFor="upload-resource-description" className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                Description / Coverage (Optional)
              </label>
              <textarea
                id="upload-resource-description"
                rows={3}
                placeholder="Mention key topics, theorems covered, or syllabus regulation..."
                value={draft.description}
                onChange={(e) => draft.setDescription(e.target.value)}
                className="w-full text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="upload-semester-number" className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                  Semester (1-8)
                </label>
                <input
                  id="upload-semester-number"
                  type="number"
                  min={1}
                  max={8}
                  value={draft.semester}
                  onChange={(e) => draft.setSemester(Number(e.target.value) || 1)}
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label htmlFor="upload-page-count" className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                  Page Count (Optional)
                </label>
                <input
                  id="upload-page-count"
                  type="number"
                  min={1}
                  placeholder="e.g. 24"
                  value={draft.pageCount}
                  onChange={(e) =>
                    draft.setPageCount(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Summary Preview */}
        <UploadReviewSummary
          title={draft.title}
          resourceType={draft.resourceType}
          semester={draft.semester}
          subject={activeSubject}
          unitTitle={activeUnit?.title}
          topicTitle={activeTopic?.title}
          selectedFile={draft.selectedFile}
          externalUrl={draft.externalUrl}
          pageCount={draft.pageCount}
          changelog={draft.changelog}
        />

        {errorMsg && (
          <div className="p-3.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="daq-btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="daq-btn-primary">
            {isSubmitting ? 'Publishing...' : 'Publish Study Material'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadView;
