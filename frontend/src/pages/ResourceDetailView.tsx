import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Bookmark,
  Flag,
  FileText,
  FileQuestion,
  FlaskConical,
  BookOpen,
  Link as LinkIcon,
  ChevronUp,
  ChevronDown,
  Star,
  ExternalLink,
  Clock,
  User as UserIcon,
  History,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCode,
  Copy,
  Check,
} from 'lucide-react';
import { resourcesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { ResourceDetail, ResourceType } from '../types';

export const ResourceDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Voting & Engagement State
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // Rating State
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userStars, setUserStars] = useState<number | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [ratingFeedback, setRatingFeedback] = useState<string | null>(null);

  // Bookmark State
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  // Download State
  const [downloadsCount, setDownloadsCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Copy link feedback
  const [copied, setCopied] = useState(false);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReasonCategory, setReportReasonCategory] = useState('Outdated Syllabus or Curriculum');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // New Version Upload State
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionUrl, setNewVersionUrl] = useState('');
  const [newVersionChangelog, setNewVersionChangelog] = useState('');
  const [newVersionPageCount, setNewVersionPageCount] = useState<number | ''>('');
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [versionUploadError, setVersionUploadError] = useState<string | null>(null);
  const [versionUploadSuccess, setVersionUploadSuccess] = useState<string | null>(null);
  const newVersionFileRef = useRef<HTMLInputElement>(null);

  // Micro-interaction animation states
  const [animatingVote, setAnimatingVote] = useState<'up' | 'down' | null>(null);
  const [animatingBookmark, setAnimatingBookmark] = useState(false);
  const [animatingStar, setAnimatingStar] = useState<number | null>(null);

  const resourceId = id ? parseInt(id, 10) : NaN;

  // Load Resource Data
  const loadResourceData = async () => {
    if (isNaN(resourceId)) {
      setLoadError('Invalid resource ID requested.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await resourcesApi.get(resourceId);
      setResource(data);
      setUpvotes(data.upvotes_count);
      setDownvotes(data.downvotes_count);
      setUserVote(data.user_vote ?? null);
      setRatingAvg(data.rating_avg);
      setRatingCount(data.rating_count);
      setDownloadsCount(data.downloads_count);

      // Check bookmark status
      if (user) {
        try {
          const bmData = await resourcesApi.getUserBookmarks(user.id);
          const list = bmData?.items || bmData?.bookmarks || [];
          const hasBookmarked = list.some((b: { resource_id: number }) => b.resource_id === data.id);
          setIsBookmarked(hasBookmarked);
        } catch {
          // Ignore bookmark check error
        }
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load study resource.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResourceData();
  }, [resourceId, user?.id]);

  // Handle escape key to dismiss open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReportModal) setShowReportModal(false);
        if (showNewVersionForm) setShowNewVersionForm(false);
      }
    };
    if (showReportModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showReportModal, showNewVersionForm]);

  // Resolve absolute or proxied file URL
  const resolveFileUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const apiBase = import.meta.env.VITE_API_URL || '';
    return `${apiBase}${url}`;
  };

  // Format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format timestamp
  const formatDate = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Type badge info
  const getTypeBadge = (type: ResourceType) => {
    switch (type) {
      case 'notes':
        return { label: 'LECTURE NOTES', bg: 'var(--bg-muted)', color: 'var(--text-primary)', icon: <FileText size={16} /> };
      case 'pdf':
        return { label: 'REFERENCE PDF', bg: 'var(--bg-subdued)', color: 'var(--text-primary)', icon: <FileCode size={16} /> };
      case 'paper':
        return { label: 'EXAM PYQ', bg: 'var(--status-exam-bg)', color: 'var(--status-exam)', icon: <FileQuestion size={16} /> };
      case 'lab_record':
        return { label: 'LAB MANUAL', bg: 'var(--status-lab-bg)', color: 'var(--status-lab)', icon: <FlaskConical size={16} /> };
      case 'question_bank':
        return { label: 'QUESTION BANK', bg: 'var(--status-exam-bg)', color: 'var(--status-exam)', icon: <BookOpen size={16} /> };
      case 'link':
        return { label: 'EXTERNAL RESOURCE', bg: 'var(--accent-tint)', color: 'var(--accent-core)', icon: <LinkIcon size={16} /> };
      default:
        return { label: 'DOCUMENT', bg: 'var(--bg-muted)', color: 'var(--text-primary)', icon: <FileText size={16} /> };
    }
  };

  // Vote Handler with pop animation
  const handleVote = async (type: 'up' | 'down') => {
    if (!resource || isVoting) return;
    setIsVoting(true);
    setAnimatingVote(type);
    setTimeout(() => setAnimatingVote(null), 180);
    try {
      const res = await resourcesApi.vote(resource.id, type);
      setUpvotes(res.upvotes_count);
      setDownvotes(res.downvotes_count);
      setUserVote(res.vote_type);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to record vote. Please check your network connection.', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  // Rating Handler with star-burst pop animation
  const handleRate = async (stars: number) => {
    if (!resource || isRating) return;
    setIsRating(true);
    setAnimatingStar(stars);
    setTimeout(() => setAnimatingStar(null), 180);
    setRatingFeedback(null);
    try {
      const res = await resourcesApi.rate(resource.id, stars);
      setUserStars(res.score);
      setRatingAvg(res.rating_avg);
      setRatingCount(res.rating_count);
      setRatingFeedback(`You rated this ${stars} star${stars > 1 ? 's' : ''}`);
      showToast(`Submitted ${stars}-star rating. Thank you!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit rating. Please try again.';
      setRatingFeedback(msg);
      showToast(msg, 'error');
    } finally {
      setIsRating(false);
    }
  };

  // Bookmark Handler with pop animation
  const handleToggleBookmark = async () => {
    if (!resource || isBookmarking) return;
    setIsBookmarking(true);
    setAnimatingBookmark(true);
    setTimeout(() => setAnimatingBookmark(false), 180);
    try {
      const res = await resourcesApi.toggleBookmark(resource.id, isBookmarked);
      setIsBookmarked(res.bookmarked);
      showToast(res.bookmarked ? 'Resource saved to your bookmarks library.' : 'Resource removed from your bookmarks.', 'info');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update bookmark status.', 'error');
    } finally {
      setIsBookmarking(false);
    }
  };

  // Download Handler
  const handleDownload = async () => {
    if (!resource) return;
    setIsDownloading(true);
    try {
      // Increment download counter via API
      await resourcesApi.recordDownload(resource.id);
      setDownloadsCount((prev) => prev + 1);

      // Open or trigger download
      const targetUrl = resolveFileUrl(resource.file_url);
      if (resource.type === 'link') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.download = resource.title.replace(/[^a-zA-Z0-9_-]/g, '_');
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: unknown) {
      // Fallback: trigger download directly
      try {
        window.open(resolveFileUrl(resource.file_url), '_blank');
      } catch {
        showToast(err instanceof Error ? err.message : 'Failed to download resource file.', 'error');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy Link Handler
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Report Submission Handler
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;
    setIsSubmittingReport(true);
    setReportError(null);

    const fullReason = reportDetails.trim()
      ? `${reportReasonCategory}: ${reportDetails.trim()}`
      : reportReasonCategory;

    try {
      await resourcesApi.report(resource.id, fullReason);
      setReportSuccessMessage('Thank you. Your report has been submitted for moderation review.');
      showToast('Report submitted for administrative moderation review.', 'success');
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccessMessage(null);
        setReportDetails('');
      }, 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report.';
      setReportError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // New Version Upload Handler
  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;
    setVersionUploadError(null);
    setVersionUploadSuccess(null);

    if (!newVersionChangelog.trim() || newVersionChangelog.trim().length < 3) {
      const msg = 'Please provide a changelog note explaining what changed (min 3 characters).';
      setVersionUploadError(msg);
      showToast(msg, 'error');
      return;
    }

    if (resource.type === 'link') {
      if (!newVersionUrl.trim() || !newVersionUrl.startsWith('http')) {
        const msg = 'Please provide a valid URL starting with http:// or https://';
        setVersionUploadError(msg);
        showToast(msg, 'error');
        return;
      }
    } else {
      if (!newVersionFile) {
        const msg = 'Please select a replacement file to upload for this version.';
        setVersionUploadError(msg);
        showToast(msg, 'error');
        return;
      }
      if (newVersionFile.size > 50 * 1024 * 1024) {
        const msg = 'File exceeds the maximum allowed size limit of 50 MB.';
        setVersionUploadError(msg);
        showToast(msg, 'error');
        return;
      }
    }

    setIsUploadingVersion(true);

    try {
      const formData = new FormData();
      formData.append('changelog', newVersionChangelog.trim());

      if (resource.type === 'link') {
        formData.append('external_url', newVersionUrl.trim());
      } else if (newVersionFile) {
        formData.append('file', newVersionFile);
      }

      if (newVersionPageCount !== '') {
        formData.append('page_count', String(newVersionPageCount));
      }

      const updatedResource = await resourcesApi.update(resource.id, formData);
      setResource(updatedResource);
      const successMsg = `Version ${updatedResource.current_version?.version_number || 'new'} uploaded successfully!`;
      setVersionUploadSuccess(successMsg);
      showToast(successMsg, 'success');
      setShowNewVersionForm(false);
      setNewVersionFile(null);
      setNewVersionUrl('');
      setNewVersionChangelog('');
      setNewVersionPageCount('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload new version.';
      setVersionUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploadingVersion(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ width: '160px', height: '18px', backgroundColor: 'var(--bg-muted)', borderRadius: '4px', marginBottom: '24px' }} />
        <div style={{ width: '70%', height: '32px', backgroundColor: 'var(--bg-muted)', borderRadius: '4px', marginBottom: '16px' }} />
        <div style={{ width: '100%', height: '400px', backgroundColor: 'var(--bg-subdued)', borderRadius: '8px' }} />
      </div>
    );
  }

  if (loadError || !resource) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', padding: '32px', textAlign: 'center' }}>
        <AlertTriangle size={48} style={{ color: 'var(--accent-core)', margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          Resource Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          {loadError || 'The requested study resource could not be found or has been removed.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={loadResourceData}
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Retry Loading
          </button>
          <button
            onClick={() => navigate('/')}
            className="daq-btn-primary"
          >
            Return to Catalog
          </button>
        </div>
      </div>
    );
  }

  const badge = getTypeBadge(resource.type);
  const fileUrl = resolveFileUrl(resource.file_url);
  const isPdf = resource.type === 'pdf' || resource.file_url.toLowerCase().endsWith('.pdf');
  const isOwnerOrAdmin = user && (user.id === resource.uploader.id || user.role === 'admin');

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Top Breadcrumb & Hierarchy Path */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={15} /> Catalog
          </Link>
          <span>/</span>
          {resource.breadcrumbs ? (
            <>
              <Link
                to={`/?subject_code=${encodeURIComponent(resource.breadcrumbs.subject.code)}`}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--accent-core)',
                }}
              >
                {resource.breadcrumbs.subject.code}
              </Link>
              <span>/</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Unit {resource.breadcrumbs.unit.unit_number}
              </span>
              <span>/</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {resource.breadcrumbs.topic.title}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>Semester {resource.semester}</span>
          )}
        </div>

        {/* Action icons (Share, Bookmark, Report) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopyLink}
            title="Copy share link"
            aria-label="Copy share link to clipboard"
            className="touch-target"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            {copied ? <Check size={14} style={{ color: 'var(--status-verified)' }} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? 'Copied' : 'Share'}
          </button>
          <button
            type="button"
            onClick={handleToggleBookmark}
            title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
            aria-label={isBookmarked ? 'Remove from bookmarks' : 'Save to bookmarks'}
            aria-pressed={isBookmarked}
            className="touch-target"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: isBookmarked ? 'var(--accent-tint)' : 'var(--bg-surface)',
              border: `1px solid ${isBookmarked ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: isBookmarked ? 'var(--accent-core)' : 'var(--text-secondary)',
              fontWeight: isBookmarked ? 600 : 400,
            }}
          >
            <Bookmark size={14} className={animatingBookmark ? 'bookmark-pop' : ''} fill={isBookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            title="Report this resource"
            aria-label="Report this resource"
            className="touch-target"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: 'var(--status-danger)',
            }}
          >
            <Flag size={14} aria-hidden="true" /> Report
          </button>
        </div>
      </div>

      {/* Main Grid: Left content (68%) / Right sidebar (32%) */}
      <div className="resource-detail-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '28px' }}>
        {/* Left Column: Details, Preview, Versions */}
        <div>
          {/* Resource Title Header */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '2px',
                  backgroundColor: badge.bg,
                  color: badge.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {badge.icon} {badge.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--bg-subdued)',
                  color: 'var(--text-muted)',
                }}
              >
                Sem {resource.semester}
              </div>
              {resource.is_verified && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '2px',
                    backgroundColor: 'var(--status-verified-bg)',
                    color: 'var(--status-verified)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle2 size={12} /> VERIFIED
                </div>
              )}
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.3,
                marginBottom: '10px',
              }}
            >
              {resource.title}
            </h1>

            {/* Metadata bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '16px',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserIcon size={14} />
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {resource.uploader.display_name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>Uploaded {formatDate(resource.created_at)}</span>
              </div>
              {resource.current_version && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--accent-core)',
                    backgroundColor: 'var(--accent-tint)',
                    padding: '1px 6px',
                    borderRadius: '2px',
                  }}
                >
                  v{resource.current_version.version_number}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {resource.description && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                marginBottom: '24px',
              }}
            >
              {resource.description}
            </div>
          )}

          {/* File Preview Area */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: '28px',
            }}
          >
            {/* Preview Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                backgroundColor: 'var(--bg-subdued)',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {badge.icon}
                <span>Document Preview</span>
                {resource.file_size_bytes ? (
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                    ({formatFileSize(resource.file_size_bytes)})
                  </span>
                ) : null}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--accent-core)',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={13} /> Open in new tab
                </a>
              </div>
            </div>

            {/* Viewer Component */}
            {isPdf ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  className="mobile-pdf-banner"
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-subdued)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Viewing on phone? Open full document:
                  </span>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--accent-core)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Full Screen PDF</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </div>
                <div style={{ width: '100%', height: '580px', backgroundColor: '#525659' }} className="pdf-iframe-container">
                  <iframe
                    src={`${fileUrl}#toolbar=1&navpanes=0`}
                    title={`PDF preview of ${resource.title}`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              </div>
            ) : resource.type === 'link' ? (
              <div style={{ padding: '36px 24px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-tint)',
                    color: 'var(--accent-core)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <ExternalLink size={26} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>
                  External Academic Resource
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px' }}>
                  This material is hosted off-platform at an external repository or shared drive.
                </p>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    backgroundColor: 'var(--bg-subdued)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '20px',
                  }}
                >
                  {resource.file_url}
                </div>
                <div>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => resourcesApi.recordDownload(resource.id)}
                    className="daq-btn-primary"
                    style={{
                      padding: '10px 24px',
                      fontSize: '13px',
                    }}
                  >
                    Open External Resource <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, marginBottom: '6px' }}>
                  Download to Inspect File
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 20px' }}>
                  This document format ({resource.type.toUpperCase()}) cannot be embedded directly in the browser viewer.
                </p>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="daq-btn-primary"
                  style={{
                    padding: '10px 24px',
                    fontSize: '13px',
                  }}
                >
                  <Download size={16} /> Download File ({formatFileSize(resource.file_size_bytes)})
                </button>
              </div>
            )}
          </div>

          {/* Version History Section */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 24px',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} style={{ color: 'var(--accent-core)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Version History ({resource.versions.length})
                </h2>
              </div>

              {isOwnerOrAdmin && !showNewVersionForm && (
                <button
                  type="button"
                  onClick={() => setShowNewVersionForm(true)}
                  aria-label="Upload new version of this resource"
                  className="touch-target"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--accent-core)',
                    backgroundColor: 'var(--accent-tint)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <Upload size={14} aria-hidden="true" /> Upload New Version
                </button>
              )}
            </div>

            {/* Inline New Version Upload Form */}
            {showNewVersionForm && (
              <form
                onSubmit={handleUploadNewVersion}
                style={{
                  backgroundColor: 'var(--bg-subdued)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '18px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Upload New Version (v{(resource.current_version?.version_number || 1) + 1})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNewVersionForm(false)}
                    aria-label="Cancel new version upload"
                    className="touch-target"
                    style={{ padding: '4px' }}
                  >
                    <X size={16} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                  </button>
                </div>

                {versionUploadError && (
                  <div style={{ fontSize: '13px', color: 'var(--status-danger)' }}>
                    {versionUploadError}
                  </div>
                )}

                {resource.type === 'link' ? (
                  <div>
                    <label
                      htmlFor="new-version-url"
                      style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}
                    >
                      Updated Outbound URL <span style={{ color: 'var(--accent-core)' }}>*</span>
                    </label>
                    <input
                      id="new-version-url"
                      type="url"
                      placeholder="https://..."
                      value={newVersionUrl}
                      onChange={(e) => setNewVersionUrl(e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="new-version-file"
                      style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}
                    >
                      Replacement Document File <span style={{ color: 'var(--accent-core)' }}>*</span>
                    </label>
                    <input
                      id="new-version-file"
                      ref={newVersionFileRef}
                      type="file"
                      aria-label="Select replacement document file"
                      onChange={(e) => e.target.files && setNewVersionFile(e.target.files[0])}
                      style={{ width: '100%', fontSize: '13px' }}
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="new-version-changelog"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Changelog Note <span style={{ color: 'var(--accent-core)' }}>*</span>
                  </label>
                  <input
                    id="new-version-changelog"
                    type="text"
                    placeholder="e.g. Corrected theorem derivation on page 4, added 2024 solutions"
                    value={newVersionChangelog}
                    onChange={(e) => setNewVersionChangelog(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {resource.type !== 'link' && (
                    <div style={{ width: '140px' }}>
                      <input
                        type="number"
                        placeholder="Page count"
                        aria-label="Estimated page count"
                        value={newVersionPageCount}
                        onChange={(e) => setNewVersionPageCount(e.target.value === '' ? '' : Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => setShowNewVersionForm(false)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUploadingVersion}
                      className="daq-btn-primary"
                      style={{
                        padding: '7px 20px',
                        fontSize: '12px',
                      }}
                    >
                      {isUploadingVersion ? 'Uploading...' : 'Publish Version'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {versionUploadSuccess && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--status-verified-bg)',
                  border: '1px solid var(--status-verified)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--status-verified)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} /> {versionUploadSuccess}
              </div>
            )}

            {/* Versions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...resource.versions]
                .sort((a, b) => b.version_number - a.version_number)
                .map((ver) => {
                  const isActive = resource.current_version?.id === ver.id;
                  const verUrl = resolveFileUrl(ver.file_url);

                  return (
                    <div
                      key={ver.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isActive ? 'var(--bg-subdued)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                            }}
                          >
                            v{ver.version_number}
                          </span>
                          {isActive && (
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '2px',
                                backgroundColor: 'var(--status-verified-bg)',
                                color: 'var(--status-verified)',
                              }}
                            >
                              CURRENT
                            </span>
                          )}
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {formatDate(ver.created_at)}
                          </span>
                          {ver.file_size_bytes ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              • {formatFileSize(ver.file_size_bytes)}
                            </span>
                          ) : null}
                          {ver.page_count ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              • {ver.page_count} pages
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {ver.changelog || 'No changelog description provided.'}
                        </div>
                      </div>

                      <a
                        href={verUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--accent-core)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      >
                        <Download size={13} /> Get File
                      </a>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Sidebar Column: Actions, Voting, Rating, Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Action Box */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Primary Download / Open Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              aria-label={resource.type === 'link' ? 'Open resource external link' : `Download file (${downloadsCount} downloads)`}
              className="daq-btn-primary touch-target"
              style={{
                width: '100%',
                padding: '12px 18px',
                fontSize: '13.5px',
              }}
            >
              {resource.type === 'link' ? (
                <>
                  <ExternalLink size={16} aria-hidden="true" /> Open Resource Link
                </>
              ) : (
                <>
                  <Download size={16} aria-hidden="true" /> Download File ({downloadsCount})
                </>
              )}
            </button>

            {/* Voting Pill */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                COMMUNITY REPUTATION
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg-subdued)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleVote('up')}
                  disabled={isVoting}
                  title="Upvote helpful resource"
                  aria-label={`Upvote helpful resource, currently ${upvotes} upvotes`}
                  aria-pressed={userVote === 'up'}
                  className="touch-target"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: userVote === 'up' ? 'var(--accent-tint)' : 'transparent',
                    color: userVote === 'up' ? 'var(--accent-core)' : 'var(--text-secondary)',
                    fontWeight: userVote === 'up' ? 700 : 500,
                  }}
                >
                  <ChevronUp size={18} className={animatingVote === 'up' ? 'vote-pop-up' : ''} aria-hidden="true" /> Upvote ({upvotes})
                </button>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: upvotes - downvotes > 0 ? 'var(--accent-core)' : 'var(--text-primary)',
                  }}
                  aria-label={`Net vote score ${upvotes - downvotes}`}
                >
                  {upvotes - downvotes > 0 ? `+${upvotes - downvotes}` : upvotes - downvotes}
                </div>

                <button
                  type="button"
                  onClick={() => handleVote('down')}
                  disabled={isVoting}
                  title="Downvote inaccurate resource"
                  aria-label={`Downvote inaccurate resource, currently ${downvotes} downvotes`}
                  aria-pressed={userVote === 'down'}
                  className="touch-target"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: userVote === 'down' ? 'var(--bg-muted)' : 'transparent',
                    color: userVote === 'down' ? 'var(--status-danger)' : 'var(--text-secondary)',
                    fontWeight: userVote === 'down' ? 700 : 500,
                  }}
                >
                  <ChevronDown size={18} className={animatingVote === 'down' ? 'vote-pop-down' : ''} aria-hidden="true" /> ({downvotes})
                </button>
              </div>
            </div>

            {/* Interactive 5-Star Rating Widget */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  QUALITY RATING
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {ratingAvg > 0 ? `${ratingAvg.toFixed(1)} / 5.0` : 'Unrated'}
                </span>
              </div>

              {/* Stars Row */}
              <div
                role="radiogroup"
                aria-label="Quality rating 1 to 5 stars"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled =
                    hoverRating !== null ? star <= hoverRating : userStars !== null ? star <= userStars : star <= Math.round(ratingAvg);

                  return (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={userStars === star}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => handleRate(star)}
                      disabled={isRating}
                      style={{
                        padding: '4px',
                        color: isFilled ? 'var(--status-exam)' : 'var(--border-strong)',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                      }}
                      className={`touch-target star-interactive ${animatingStar === star ? 'star-pop' : ''}`}
                    >
                      <Star size={22} fill={isFilled ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                  );
                })}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                  ({ratingCount})
                </span>
              </div>

              {ratingFeedback && (
                <div style={{ fontSize: '11px', color: 'var(--status-verified)', fontWeight: 600 }}>
                  {ratingFeedback}
                </div>
              )}
            </div>
          </div>

          {/* Academic Metadata Specification Box */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '14px',
              }}
            >
              Academic Specifications
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Format</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{badge.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Curriculum Semester</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Semester {resource.semester}</span>
              </div>
              {resource.page_count && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Length</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{resource.page_count} Pages</span>
                </div>
              )}
              {resource.file_size_bytes ? (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>File Size</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatFileSize(resource.file_size_bytes)}
                  </span>
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Views</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{resource.views_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Downloads</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{downloadsCount}</span>
              </div>
            </div>
          </div>

          {/* Contributor Profile Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
              }}
            >
              Uploader
            </h3>
            <Link
              to={`/profile/${resource.uploader.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
              }}
              title="View contributor profile"
              className="uploader-profile-card"
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-tint)',
                  border: '1px solid var(--accent-border)',
                  color: 'var(--accent-core)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0,
                  transition: 'border-color 100ms ease',
                }}
              >
                {resource.uploader.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {resource.uploader.display_name}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--accent-core)',
                    textTransform: 'capitalize',
                  }}
                >
                  {resource.uploader.role} • View Profile →
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Structured Report Reason Modal (NOT confirm) */}
      {showReportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flag size={18} style={{ color: 'var(--status-danger)' }} aria-hidden="true" />
                <h3
                  id="report-modal-title"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}
                >
                  Report Study Resource
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                aria-label="Close report modal"
                className="touch-target"
                style={{ padding: '6px', color: 'var(--text-muted)' }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Submit a report to the academic moderation team if this resource contains outdated syllabus topics, corrupted files, copyright violations, or inaccurate solutions.
            </p>

            {reportSuccessMessage ? (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--status-verified-bg)',
                  border: '1px solid var(--status-verified)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--status-verified)',
                  textAlign: 'center',
                }}
              >
                {reportSuccessMessage}
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reportError && (
                  <div style={{ fontSize: '13px', color: 'var(--status-danger)' }}>
                    {reportError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Reason Category <span style={{ color: 'var(--accent-core)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      'Outdated Syllabus or Curriculum',
                      'Corrupted, Missing or Incomplete File',
                      'Inaccurate Solution or Misleading Content',
                      'Copyright or Intellectual Property Infringement',
                      'Spam, Duplicate or Inappropriate Content',
                      'Other Reason',
                    ].map((reason) => (
                      <label
                        key={reason}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          value={reason}
                          checked={reportReasonCategory === reason}
                          onChange={(e) => setReportReasonCategory(e.target.value)}
                        />
                        {reason}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Specific Details (Optional)
                  </label>
                  <textarea
                    placeholder="Provide specific notes (e.g. Question 3 diagram is unreadable; unit 2 follows 2018 regulation rather than 2022)..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={3}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: 'var(--status-danger)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Responsive media styling for tablet & mobile */}
      <style>{`
        @media (max-width: 1023px) {
          .resource-detail-layout {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
        @media (max-width: 767px) {
          .mobile-pdf-banner {
            display: flex !important;
          }
          .pdf-iframe-container {
            height: 440px !important;
          }
        }
      `}</style>
    </div>
  );
};
