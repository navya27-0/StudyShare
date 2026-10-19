import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, X } from 'lucide-react';

interface FileDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  maxSizeBytes?: number;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  selectedFile,
  onFileSelect,
  maxSizeBytes = 50 * 1024 * 1024,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > maxSizeBytes) {
      setErrorMsg(`File exceeds ${maxSizeBytes / (1024 * 1024)} MB limit.`);
      return;
    }
    setErrorMsg(null);
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.zip,.py,.c,.cpp,.java"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {!selectedFile ? (
        <div
          className={`daq-dropzone ${isDragOver ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload document dropzone"
        >
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <UploadCloud size={24} />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">
              Click to select or drag and drop your study document
            </p>
            <p className="text-xs text-white/60 mt-1">
              PDF, DOCX, PPTX, TXT, Markdown, Images, Source Code (PY, C, CPP, JAVA), or ZIP (up to 50 MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="daq-card p-4 flex items-center justify-between border-white/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-white text-sm truncate">{selectedFile.name}</p>
              <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ready
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onFileSelect(null)}
            className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Remove file"
            aria-label="Remove selected file"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}
    </div>
  );
};
