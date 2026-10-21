import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  FileQuestion,
  FlaskConical,
  BookOpen,
  Link as LinkIcon,
  CheckCircle2,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Bookmark,
  Download,
  Eye,
  Star,
  ArrowRight,
  User,
  Check,
} from 'lucide-react';
import type { ResourceListItem, ResourceType } from '../../types';
import {
  resourcesApi,
  getDownloadedIds,
  markResourceDownloaded,
} from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface ResourceCardProps {
  resource: ResourceListItem;
  onVoteChange?: (
    resourceId: number,
    upvotes: number,
    downvotes: number,
    userVote: 'up' | 'down' | null
  ) => void;
  onBookmarkChange?: (resourceId: number, isBookmarked: boolean) => void;
  viewMode?: 'dense' | 'compact';
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onVoteChange,
  onBookmarkChange,
  viewMode = 'dense',
}) => {
  const { showToast } = useToast();
  const [upvotes, setUpvotes] = useState(resource.upvotes_count);
  const [downvotes, setDownvotes] = useState(resource.downvotes_count);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(resource.user_vote ?? null);
  const [isBookmarked, setIsBookmarked] = useState(resource.is_bookmarked ?? false);
  const [isVoting, setIsVoting] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [animatingVote, setAnimatingVote] = useState<'up' | 'down' | null>(null);
  const [animatingBookmark, setAnimatingBookmark] = useState(false);
  const [downloadsCount, setDownloadsCount] = useState(resource.downloads_count);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(() =>
    getDownloadedIds().has(resource.id)
  );
  const [isDownloading, setIsDownloading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';
  const targetPath = resource.download_url || resource.file_url;
  const downloadUrl = targetPath.startsWith('http')
    ? targetPath
    : `${apiUrl}${targetPath}`;

  // Format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date relative or concise
  const formatDate = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Updated today';
      if (diffDays === 1) return 'Updated yesterday';
      if (diffDays < 30) return `Updated ${diffDays} days ago`;
      if (diffDays < 365) return `Updated ${Math.floor(diffDays / 30)}mo ago`;
      return `Updated ${Math.floor(diffDays / 365)}y ago`;
    } catch {
      return '';
    }
  };

  // Type metadata and badge styling
  const getTypeBadge = (type: ResourceType) => {
    switch (type) {
      case 'question_bank':
        return {
          label: 'PAST PAPER / PYQ',
          shortFormat: 'PDF',
          icon: <FileQuestion size={13} strokeWidth={1.75} aria-hidden="true" />,
          bg: 'var(--status-exam-bg)',
          color: 'var(--status-exam)',
        };
      case 'lab_record':
        return {
          label: 'LAB MANUAL',
          shortFormat: 'LAB PDF',
          icon: <FlaskConical size={13} strokeWidth={1.75} aria-hidden="true" />,
          bg: 'var(--status-lab-bg)',
          color: 'var(--status-lab)',
        };
      case 'paper':
        return {
          label: 'REFERENCE PAPER',
          shortFormat: 'PDF',
          icon: <BookOpen size={13} strokeWidth={1.75} aria-hidden="true" />,
          bg: 'var(--status-verified-bg)',
          color: 'var(--status-verified)',
        };
      case 'notes':
        return {
          label: 'LECTURE NOTES',
          shortFormat: 'PDF',
          icon: <FileText size={13} strokeWidth={1.75} aria-hidden="true" />,
          bg: 'var(--accent-tint)',
          color: 'var(--accent-core)',
        };
      case 'link':
        return {
          label: 'WEB RESOURCE',
          shortFormat: 'LINK',
          icon: <LinkIcon size={13} strokeWidth={1.75} aria-hidden="true" />,
          bg: 'var(--bg-muted)',
          color: 'var(--text-secondary)',
        };
      case 'pdf':
      default:
        return {
          label: 'STUDY GUIDE',
          shortFormat: 'PDF',
          icon: <FileText size={13} strokeWidth={1.75} aria-hidden="true" />,
          bg: 'var(--bg-muted)',
          color: 'var(--text-primary)',
        };
    }
  };

  const badge = getTypeBadge(resource.type);

  // Verification status with clear student explanation (Priority 5.13)
  const isCommunityReviewed =
    !resource.is_verified &&
    ((resource.rating_count >= 2 && resource.rating_avg >= 4.0) || upvotes - downvotes >= 3);

  const handleDownloadClick = () => {
    setIsDownloading(true);
    markResourceDownloaded(resource.id);
    setIsDownloaded(true);
    resourcesApi
      .recordDownload(resource.id)
      .then((res) => {
        setDownloadsCount(res.downloads_count);
      })
      .catch(() => {
        // non-blocking telemetry
      })
      .finally(() => {
        setTimeout(() => setIsDownloading(false), 400);
      });
  };

  // Voting action with pop animation
  const handleVote = async (type: 'up' | 'down') => {
    if (isVoting) return;
    setIsVoting(true);
    setAnimatingVote(type);
    setTimeout(() => setAnimatingVote(null), 180);
    try {
      const res = await resourcesApi.vote(resource.id, type);
      setUpvotes(res.upvotes_count);
      setDownvotes(res.downvotes_count);
      setUserVote(res.vote_type);
      onVoteChange?.(resource.id, res.upvotes_count, res.downvotes_count, res.vote_type);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to register vote. Please check your network connection.';
      showToast(`Vote error: ${msg}`, 'error');
    } finally {
      setIsVoting(false);
    }
  };

  // Bookmark action with pop animation
  const handleBookmarkToggle = async () => {
    if (isBookmarking) return;
    setIsBookmarking(true);
    setAnimatingBookmark(true);
    setTimeout(() => setAnimatingBookmark(false), 180);
    try {
      const res = await resourcesApi.toggleBookmark(resource.id, isBookmarked);
      setIsBookmarked(res.bookmarked);
      onBookmarkChange?.(resource.id, res.bookmarked);
      showToast(
        res.bookmarked
          ? 'Saved to My Bookmarks for quick revision.'
          : 'Removed from My Bookmarks.',
        'info',
        2500
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to update bookmark. Please check your network connection.';
      showToast(`Bookmark error: ${msg}`, 'error');
    } finally {
      setIsBookmarking(false);
    }
  };

  // Determine left status spine color
  let spineColor = 'transparent';
  if (userVote === 'up') {
    spineColor = 'var(--accent-core)';
  } else if (resource.is_verified) {
    spineColor = 'var(--status-verified)';
  } else if (upvotes - downvotes < 0) {
    spineColor = 'var(--border-strong)';
  }

  // COMPACT TABLE ROW VIEW
  if (viewMode === 'compact') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '95px 110px 1fr 130px 85px 95px 90px',
          alignItems: 'center',
          gap: '12px',
          padding: '9px 14px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          borderLeft: `3px solid ${spineColor}`,
          fontSize: '13px',
          transition: 'background-color 100ms ease',
        }}
        className="compact-ledger-row"
      >
        {/* Type Badge */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '2px',
            backgroundColor: badge.bg,
            color: badge.color,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {badge.label}
        </div>

        {/* Course & Unit */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {resource.breadcrumbs?.subject.code || `Sem ${resource.semester}`}
          {resource.breadcrumbs?.unit ? ` · Unit ${resource.breadcrumbs.unit.unit_number}` : ''}
        </div>

        {/* Title */}
        <Link
          to={`/resources/${resource.id}`}
          style={{
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={resource.title}
        >
          {resource.title}
        </Link>

        {/* Contributor */}
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <Link
            to={`/profile/${resource.uploader.id}`}
            style={{ color: 'inherit' }}
            title={`View ${resource.uploader.display_name}'s profile`}
            className="uploader-link"
          >
            {resource.uploader.display_name}
          </Link>
        </div>

        {/* Rating */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            color: 'var(--text-primary)',
          }}
        >
          <Star
            size={13}
            fill={resource.rating_avg > 0 ? 'var(--status-exam)' : 'none'}
            color="var(--status-exam)"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>{resource.rating_avg > 0 ? resource.rating_avg.toFixed(1) : 'New'}</span>
        </div>

        {/* Net Votes Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
          }}
        >
          <button
            type="button"
            onClick={() => handleVote('up')}
            disabled={isVoting}
            aria-label={userVote === 'up' ? 'Remove upvote' : `Upvote ${resource.title}`}
            style={{
              padding: '4px',
              borderRadius: '2px',
              color: userVote === 'up' ? 'var(--accent-core)' : 'var(--text-muted)',
              backgroundColor: userVote === 'up' ? 'var(--accent-tint)' : 'transparent',
            }}
            className="touch-target"
          >
            <ChevronUp
              size={14}
              className={animatingVote === 'up' ? 'vote-pop-up' : ''}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
          <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>
            {upvotes - downvotes}
          </span>
          <button
            type="button"
            onClick={() => handleVote('down')}
            disabled={isVoting}
            aria-label={userVote === 'down' ? 'Remove downvote' : `Downvote ${resource.title}`}
            style={{
              padding: '4px',
              borderRadius: '2px',
              color: userVote === 'down' ? 'var(--status-danger)' : 'var(--text-muted)',
              backgroundColor: userVote === 'down' ? 'var(--status-danger-bg)' : 'transparent',
            }}
            className="touch-target"
          >
            <ChevronDown
              size={14}
              className={animatingVote === 'down' ? 'vote-pop-down' : ''}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Save & Download actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
          <button
            type="button"
            onClick={handleBookmarkToggle}
            aria-label={
              isBookmarked
                ? `Remove ${resource.title} from bookmarks`
                : `Save ${resource.title} to bookmarks`
            }
            style={{
              padding: '6px',
              color: isBookmarked ? 'var(--accent-core)' : 'var(--text-muted)',
            }}
            className="touch-target"
          >
            <Bookmark
              size={14}
              className={animatingBookmark ? 'bookmark-pop' : ''}
              fill={isBookmarked ? 'var(--accent-core)' : 'none'}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            onClick={handleDownloadClick}
            aria-label={`Download ${resource.title}`}
            style={{
              padding: '6px',
              color: isDownloaded ? 'var(--status-verified)' : 'var(--text-secondary)',
            }}
            className="touch-target"
            title={isDownloaded ? 'Downloaded on this device' : 'Download resource'}
          >
            {isDownloaded ? (
              <Check size={14} strokeWidth={2.2} aria-hidden="true" />
            ) : (
              <Download size={14} strokeWidth={1.75} aria-hidden="true" />
            )}
          </a>
        </div>
      </div>
    );
  }

  // STANDARD INFORMATIVE STUDENT RESOURCE CARD
  return (
    <article
      className="daq-card ledger-resource-card"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${spineColor}`,
        borderRadius: 'var(--radius-sm)',
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '11px',
        position: 'relative',
      }}
    >
      <div className="daq-crosshair daq-crosshair-tl" />
      <div className="daq-crosshair daq-crosshair-tr" />
      <div className="daq-crosshair daq-crosshair-bl" />
      <div className="daq-crosshair daq-crosshair-br" />

      {/* Top Row: Course · Unit + Resource Type + Verification Badge + Downloaded Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Course & Unit Context Pill */}
          {resource.breadcrumbs?.subject ? (
            <Link
              to={`/?subject_code=${resource.breadcrumbs.subject.code}${
                resource.breadcrumbs.unit ? `&unit_id=${resource.breadcrumbs.unit.id}` : ''
              }`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-strong)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
              title={`${resource.breadcrumbs.subject.code}: ${resource.breadcrumbs.subject.name}`}
            >
              {resource.breadcrumbs.subject.code}
              {resource.breadcrumbs.unit
                ? ` · Unit ${resource.breadcrumbs.unit.unit_number}`
                : ` · Sem ${resource.semester}`}
            </Link>
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Semester {resource.semester}
            </span>
          )}

          {/* Document Type Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '2px',
              backgroundColor: badge.bg,
              color: badge.color,
              letterSpacing: '0.04em',
            }}
          >
            {badge.icon}
            <span>{badge.label}</span>
          </div>

          {/* Topic Tag if present */}
          {resource.breadcrumbs?.topic && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              {resource.breadcrumbs.topic.title}
            </span>
          )}

          {/* Clear Verification Status Badge with Explanatory Tooltip (Priority 5.13) */}
          {resource.is_verified ? (
            <div
              className="verified-seal"
              title="Reviewed by an approved course administrator or faculty member for syllabus accuracy."
            >
              <CheckCircle2 size={11} strokeWidth={2.2} aria-hidden="true" />
              <span>Faculty verified</span>
            </div>
          ) : isCommunityReviewed ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                fontWeight: 600,
                color: 'var(--status-lab)',
                backgroundColor: 'var(--status-lab-bg)',
                border: '1px solid var(--status-lab-border)',
                padding: '2px 7px',
                borderRadius: '2px',
              }}
              title="Positively rated and verified by fellow students taking this course."
            >
              <ShieldCheck size={11} strokeWidth={2} aria-hidden="true" />
              <span>Community reviewed</span>
            </div>
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
                padding: '2px 6px',
                borderRadius: '2px',
              }}
              title="Uploaded by a student contributor."
            >
              Community uploaded
            </span>
          )}
        </div>

        {/* Downloaded Badge */}
        {isDownloaded && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              fontWeight: 700,
              color: 'var(--status-verified)',
              backgroundColor: 'var(--status-verified-bg)',
              border: '1px solid var(--status-verified-border)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}
            title="You have already downloaded this file on this device"
          >
            <Check size={11} strokeWidth={2.4} aria-hidden="true" />
            <span>Downloaded</span>
          </span>
        )}
      </div>

      {/* Resource Title */}
      <h3 style={{ margin: 0, lineHeight: 1.35 }}>
        <Link
          to={`/resources/${resource.id}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 160ms ease',
          }}
          className="resource-title-link"
        >
          <span>{resource.title}</span>
          <ArrowRight size={14} className="resource-title-arrow" aria-hidden="true" />
        </Link>
      </h3>

      {/* Description Snippet */}
      {resource.description && (
        <p
          style={{
            fontSize: '13.5px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {resource.description}
        </p>
      )}

      {/* At-a-Glance Student Metadata Summary Row:
          PDF · 24 pages · 4.2 MB · Updated 3 days ago · 4.6 ★ · 142 downloads */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12.5px',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          paddingTop: '2px',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {badge.shortFormat}
        </span>

        {resource.page_count && (
          <>
            <span aria-hidden="true">·</span>
            <span>{resource.page_count} pages</span>
          </>
        )}

        {resource.file_size_bytes && (
          <>
            <span aria-hidden="true">·</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {formatFileSize(resource.file_size_bytes)}
            </span>
          </>
        )}

        <span aria-hidden="true">·</span>
        <span>{formatDate(resource.created_at)}</span>

        <span aria-hidden="true">·</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            color: 'var(--text-primary)',
            fontWeight: 600,
          }}
          aria-label={
            resource.rating_avg > 0
              ? `Rated ${resource.rating_avg.toFixed(1)} out of 5 stars`
              : 'No ratings yet'
          }
        >
          {resource.rating_avg > 0 ? `${resource.rating_avg.toFixed(1)} ★` : 'New ★'}
        </span>

        <span aria-hidden="true">·</span>
        <span>{downloadsCount} downloads</span>

        <span aria-hidden="true">·</span>
        <Link
          to={`/profile/${resource.uploader.id}`}
          style={{
            color: 'var(--text-secondary)',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={`View ${resource.uploader.display_name}'s profile`}
          className="uploader-link"
        >
          <User size={12} strokeWidth={1.75} aria-hidden="true" />
          <span>{resource.uploader.display_name}</span>
        </Link>
      </div>

      {/* Interactive Footer Bar: Votes on left, [Preview] [Download] [Save] on right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '10px',
          marginTop: '2px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Left Interactive Group: Helpful Vote Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: userVote === 'up' ? 'var(--accent-tint)' : 'var(--bg-subdued)',
              border: `1px solid ${userVote === 'up' ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '2px 4px',
            }}
          >
            <button
              type="button"
              onClick={() => handleVote('up')}
              disabled={isVoting}
              aria-label={userVote === 'up' ? 'Remove upvote' : `Upvote ${resource.title}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '5px 8px',
                borderRadius: '2px',
                color: userVote === 'up' ? 'var(--accent-core)' : 'var(--text-secondary)',
              }}
              title="Mark as helpful for this course"
            >
              <ChevronUp
                size={15}
                className={animatingVote === 'up' ? 'vote-pop-up' : ''}
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </button>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: userVote === 'up' ? 'var(--accent-core)' : 'var(--text-primary)',
                minWidth: '22px',
                textAlign: 'center',
                padding: '0 2px',
              }}
            >
              {upvotes - downvotes}
            </span>

            <button
              type="button"
              onClick={() => handleVote('down')}
              disabled={isVoting}
              aria-label={userVote === 'down' ? 'Remove downvote' : `Downvote ${resource.title}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '5px 8px',
                borderRadius: '2px',
                color: userVote === 'down' ? 'var(--status-danger)' : 'var(--text-muted)',
              }}
              title="Downvote if inaccurate or incomplete"
            >
              <ChevronDown
                size={15}
                className={animatingVote === 'down' ? 'vote-pop-down' : ''}
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Right Action Triggers: [Preview] [Download] [Save] */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* [Preview] */}
          <Link
            to={`/resources/${resource.id}`}
            aria-label={`Preview ${resource.title}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Eye size={13} strokeWidth={1.8} aria-hidden="true" />
            <span>Preview</span>
          </Link>

          {/* [Download] */}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            onClick={handleDownloadClick}
            aria-label={`Download ${resource.title}${
              resource.file_size_bytes ? ` (${formatFileSize(resource.file_size_bytes)})` : ''
            }`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-core)',
              color: 'var(--accent-contrast)',
              border: '1px solid var(--accent-core)',
              boxShadow: '0 2px 12px var(--accent-tint)',
              transition: 'all 160ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Download size={13} strokeWidth={1.9} aria-hidden="true" />
            <span>
              {isDownloading
                ? 'Downloading...'
                : isDownloaded
                  ? 'Download again'
                  : `Download${
                      resource.file_size_bytes
                        ? ` (${formatFileSize(resource.file_size_bytes)})`
                        : ''
                    }`}
            </span>
          </a>

          {/* [Save] */}
          <button
            type="button"
            onClick={handleBookmarkToggle}
            disabled={isBookmarking}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? `Saved: ${resource.title}` : `Save ${resource.title} to bookmarks`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12.5px',
              fontWeight: 600,
              color: isBookmarked ? 'var(--accent-core)' : 'var(--text-secondary)',
              backgroundColor: isBookmarked ? 'var(--accent-tint)' : 'var(--bg-subdued)',
              border: isBookmarked
                ? '1px solid var(--accent-core)'
                : '1px solid var(--border-subtle)',
            }}
            title={isBookmarked ? 'Saved in My Bookmarks' : 'Save to My Bookmarks'}
          >
            <Bookmark
              size={13}
              className={animatingBookmark ? 'bookmark-pop' : ''}
              fill={isBookmarked ? 'var(--accent-core)' : 'none'}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
