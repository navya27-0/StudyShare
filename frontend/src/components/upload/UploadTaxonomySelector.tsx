import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { SubjectItem } from '../../types';

interface UploadTaxonomySelectorProps {
  subjects: SubjectItem[];
  selectedSubjectId: number | '';
  selectedUnitId: number | '';
  selectedTopicId: number | '';
  onSubjectChange: (id: number | '') => void;
  onUnitChange: (id: number | '') => void;
  onTopicChange: (id: number | '') => void;
  onCreateUnit: (title: string, unitNumber?: number) => Promise<void>;
  onCreateTopic: (title: string) => Promise<void>;
}

export const UploadTaxonomySelector: React.FC<UploadTaxonomySelectorProps> = ({
  subjects,
  selectedSubjectId,
  selectedUnitId,
  selectedTopicId,
  onSubjectChange,
  onUnitChange,
  onTopicChange,
  onCreateUnit,
  onCreateTopic,
}) => {
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState<number | ''>('');
  const [isCreatingUnit, setIsCreatingUnit] = useState(false);

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const units = activeSubject?.units || [];
  const activeUnit = units.find((u) => u.id === selectedUnitId);
  const topics = activeUnit?.topics || [];

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitTitle.trim()) return;
    try {
      setIsCreatingUnit(true);
      await onCreateUnit(
        newUnitTitle.trim(),
        typeof newUnitNumber === 'number' ? newUnitNumber : undefined
      );
      setNewUnitTitle('');
      setNewUnitNumber('');
      setShowUnitModal(false);
    } finally {
      setIsCreatingUnit(false);
    }
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;
    try {
      setIsCreatingTopic(true);
      await onCreateTopic(newTopicTitle.trim());
      setNewTopicTitle('');
      setShowTopicModal(false);
    } finally {
      setIsCreatingTopic(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Subject / Course Selector */}
      <div className="space-y-1.5">
        <label htmlFor="upload-course-select" className="block text-xs font-semibold uppercase tracking-wider text-white/70">
          1. Course / Subject <span className="text-rose-400">*</span>
        </label>
        <select
          id="upload-course-select"
          value={selectedSubjectId}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : '';
            onSubjectChange(val);
          }}
          className="w-full text-sm"
        >
          <option value="">Select course...</option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.code} — {sub.name} (Sem {sub.semester})
            </option>
          ))}
        </select>
      </div>

      {/* 2. Unit Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="upload-unit-select" className="text-xs font-semibold uppercase tracking-wider text-white/70">
            2. Unit <span className="text-rose-400">*</span>
          </label>
          {selectedSubjectId !== '' && (
            <button
              type="button"
              onClick={() => setShowUnitModal(true)}
              className="text-[11px] text-white/60 hover:text-white flex items-center gap-1 font-medium"
            >
              <Plus size={12} /> Add Unit
            </button>
          )}
        </div>
        <select
          id="upload-unit-select"
          value={selectedUnitId}
          disabled={selectedSubjectId === ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : '';
            onUnitChange(val);
          }}
          className="w-full text-sm"
        >
          <option value="">Select unit...</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              Unit {u.unit_number}: {u.title}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Topic Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="upload-topic-select" className="text-xs font-semibold uppercase tracking-wider text-white/70">
            3. Topic <span className="text-rose-400">*</span>
          </label>
          {selectedUnitId !== '' && (
            <button
              type="button"
              onClick={() => setShowTopicModal(true)}
              className="text-[11px] text-white/60 hover:text-white flex items-center gap-1 font-medium"
            >
              <Plus size={12} /> Add Topic
            </button>
          )}
        </div>
        <select
          id="upload-topic-select"
          value={selectedTopicId}
          disabled={selectedUnitId === ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : '';
            onTopicChange(val);
          }}
          className="w-full text-sm"
        >
          <option value="">Select topic...</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {/* Inline Unit Modal */}
      {showUnitModal && (
        <div className="daq-modal-backdrop">
          <div className="daq-modal-dialog p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Create Academic Unit</h3>
              <button
                type="button"
                onClick={() => setShowUnitModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUnitSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                  Unit Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graph Algorithms & Trees"
                  value={newUnitTitle}
                  onChange={(e) => setNewUnitTitle(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                  Unit Number (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 3"
                  value={newUnitNumber}
                  onChange={(e) =>
                    setNewUnitNumber(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="daq-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isCreatingUnit} className="daq-btn-primary">
                  {isCreatingUnit ? 'Creating...' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Topic Modal */}
      {showTopicModal && (
        <div className="daq-modal-backdrop">
          <div className="daq-modal-dialog p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Create Topic</h3>
              <button
                type="button"
                onClick={() => setShowTopicModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTopicSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dijkstra Shortest Path"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="daq-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isCreatingTopic} className="daq-btn-primary">
                  {isCreatingTopic ? 'Creating...' : 'Create Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
