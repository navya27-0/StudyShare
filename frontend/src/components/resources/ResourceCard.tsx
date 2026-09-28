import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  FileQuestion,
  FlaskConical,
  BookOpen,
  Link as LinkIcon,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Bookmark,
  Download,
  Eye,
  Star,
  ExternalLink,
  ArrowRight,
  User,
} from 'lucide-react';
import type { ResourceListItem, ResourceType } from '../../types';
import { resourcesApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface ResourceCardProps {
  resource: ResourceListItem;
  onVoteChange?: (resourceId: number, upvotes: number, downvotes: number, userVote: 'up' | 'down' | null) => void;
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

  const apiUrl = import.meta.env.VITE_API_URL || '';
  const downloadUrl = resource.file_url.startsWith('http')
    ? resource.file_url
    : `${apiUrl}${resource.file_url}`;

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
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    } catch {
      return '';
    }
  };

  // Type metadata and badge styling
  const getTypeBadge = (type: ResourceType) => {
    switch (type) {
      case 'question_bank':
        return {
          label: 'PYQ BANK',
          icon: <FileQuestion size={13} strokeWidth={1.75} />,
          bg: 'var(--status-exam-bg)',
          color: 'var(--status-exam)',
        };
      case 'lab_record':
        return {
          label: 'LAB CODE',
          icon: <FlaskConical size={13} strokeWidth={1.75} />,
          bg: 'var(--status-lab-bg)',
          color: 'var(--status-lab)',
        };
      case 'paper':
        return {
          label: 'MONOGRAPH',
          icon: <BookOpen size={13} strokeWidth={1.75} />,
          bg: 'var(--status-verified-bg)',
          color: 'var(--status-verified)',
        };
      case 'notes':
        return {
          label: 'NOTES',
          icon: <FileText size={13} strokeWidth={1.75} />,
          bg: 'var(--accent-tint)',
          color: 'var(--accent-core)',
        };
      case 'link':
        return {
          label: 'PORTAL LINK',
          icon: <LinkIcon size={13} strokeWidth={1.75} />,
          bg: 'var(--bg-muted)',
          color: 'var(--text-secondary)',
        };
      case 'pdf':
      default:
        return {
          label: 'DOC (PDF)',
          icon: <FileText size={13} strokeWidth={1.75} />,
          bg: 'var(--bg-muted)',
          color: 'var(--text-primary)',
        };
    }
  };

  const badge = getTypeBadge(resource.type);

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
      const msg = err instanceof Error ? err.message : 'Failed to register vote. Please check your network connection.';
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
        res.bookmarked ? 'Resource bookmarked to your library.' : 'Resource removed from saved library.',
        'info',
        2500
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update bookmark. Please check your network connection.';
      showToast(`Bookmark error: ${msg}`, 'error');
    } finally {
      setIsBookmarking(false);
    }
  };

  // Determine left status spine color per DESIGN.md Section 5
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
          gridTemplateColumns: '80px 100px 1fr 140px 90px 100px 80px',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 14px',
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
          }}
        >
          {badge.label}
        </div>

        {/* Taxonomy Code */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {resource.breadcrumbs?.subject.code || `S${resource.semester}`}
          {resource.breadcrumbs?.unit ? ` • U${resource.breadcrumbs.unit.unit_number}` : ''}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-primary)' }}>
          <Star size={13} fill={resource.rating_avg > 0 ? 'var(--status-exam)' : 'none'} color="var(--status-exam)" strokeWidth={1.75} />
          <span>{resource.rating_avg > 0 ? resource.rating_avg.toFixed(1) : '—'}</span>
        </div>

        {/* Net Votes Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
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
            <ChevronUp size={14} className={animatingVote === 'up' ? 'vote-pop-up' : ''} strokeWidth={2} aria-hidden="true" />
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
            <ChevronDown size={14} className={animatingVote === 'down' ? 'vote-pop-down' : ''} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Download action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
          <button
            type="button"
            onClick={handleBookmarkToggle}
            aria-label={isBookmarked ? `Remove ${resource.title} from bookmarks` : `Bookmark ${resource.title}`}
            style={{
              padding: '6px',
              color: isBookmarked ? 'var(--accent-core)' : 'var(--text-muted)',
            }}
            className="touch-target"
          >
            <Bookmark size={14} className={animatingBookmark ? 'bookmark-pop' : ''} fill={isBookmarked ? 'var(--accent-core)' : 'none'} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            aria-label={`Download ${resource.title}`}
            style={{ padding: '6px', color: 'var(--text-secondary)' }}
            className="touch-target"
          >
            <Download size={14} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  // STANDARD HIGH-DENSITY LEDGER CARD LIST ITEM
  return (
    <div
      className="daq-card ledger-resource-card"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${spineColor}`,
        borderRadius: 'var(--radius-sm)',
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
      }}
    >
      <div className="daq-crosshair daq-crosshair-tl" />
      <div className="daq-crosshair daq-crosshair-tr" />
      <div className="daq-crosshair daq-crosshair-bl" />
      <div className="daq-crosshair daq-crosshair-br" />
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

          {/* Academic Taxonomy Breadcrumb Tag */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            {resource.breadcrumbs?.subject.code || `Semester ${resource.semester}`}
            {resource.breadcrumbs?.unit ? ` • Unit 0${resource.breadcrumbs.unit.unit_number}` : ''}
            {resource.breadcrumbs?.topic ? ` • ${resource.breadcrumbs.topic.title}` : ''}
          </span>

          {/* Verified Syllabus Tag */}
          {resource.is_verified && (
            <div
              className="verified-seal"
              title="Verified according to university syllabus"
            >
              <CheckCircle2 size={11} strokeWidth={2.2} />
              <span>SYLLABUS VERIFIED</span>
            </div>
          )}
        </div>

        {/* Top Right Action: Bookmark Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isBookmarked && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--accent-core)',
                backgroundColor: 'var(--accent-tint)',
                padding: '2px 6px',
                borderRadius: '2px',
                letterSpacing: '0.04em',
              }}
            >
              SAVED
            </span>
          )}
          <button
            type="button"
            onClick={handleBookmarkToggle}
            disabled={isBookmarking}
            aria-label={isBookmarked ? 'Remove revision bookmark' : 'Save to revision desk'}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              color: isBookmarked ? 'var(--accent-core)' : 'var(--text-muted)',
              backgroundColor: isBookmarked ? 'var(--accent-tint)' : 'transparent',
              border: isBookmarked ? '1px solid var(--accent-border)' : '1px solid transparent',
            }}
            title={isBookmarked ? 'Saved to Bookmarks' : 'Save for Revision'}
          >
            <Bookmark size={15} className={animatingBookmark ? 'bookmark-pop' : ''} fill={isBookmarked ? 'var(--accent-core)' : 'none'} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Resource Title */}
      <h3 style={{ margin: 0, lineHeight: 1.35 }}>
        <Link
          to={`/resources/${resource.id}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16.5px',
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
          <ArrowRight size={14} className="resource-title-arrow" />
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

      {/* Metadata Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          flexWrap: 'wrap',
          paddingTop: '2px',
        }}
      >
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
          <span>By {resource.uploader.display_name}</span>
        </Link>
        <span>•</span>
        <span>{formatDate(resource.created_at)}</span>

        {resource.file_size_bytes && (
          <>
            <span>•</span>
            <span>{formatFileSize(resource.file_size_bytes)}</span>
          </>
        )}

        {resource.page_count && (
          <>
            <span>•</span>
            <span>{resource.page_count} Pages</span>
          </>
        )}

        {resource.downloads_count > 0 && (
          <>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Download size={11} strokeWidth={1.75} />
              {resource.downloads_count}
            </span>
          </>
        )}

        {resource.views_count > 0 && (
          <>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Eye size={11} strokeWidth={1.75} />
              {resource.views_count}
            </span>
          </>
        )}
      </div>

      {/* Interactive Footer Bar */}
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
        {/* Left Interactive Group: Vote Pill & Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Net Votes Pill */}
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
                padding: '6px 8px',
                borderRadius: '2px',
                color: userVote === 'up' ? 'var(--accent-core)' : 'var(--text-secondary)',
              }}
              className="touch-target"
              title="Upvote verified accuracy"
            >
              <ChevronUp size={15} className={animatingVote === 'up' ? 'vote-pop-up' : ''} strokeWidth={2.2} aria-hidden="true" />
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
                padding: '6px 8px',
                borderRadius: '2px',
                color: userVote === 'down' ? 'var(--status-danger)' : 'var(--text-muted)',
              }}
              className="touch-target"
              title="Downvote inaccurate note"
            >
              <ChevronDown size={15} className={animatingVote === 'down' ? 'vote-pop-down' : ''} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          {/* Rating Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            aria-label={`Average rating: ${resource.rating_avg.toFixed(1)} out of 5 stars from ${resource.rating_count} ratings`}
          >
            <Star
              size={13}
              fill={resource.rating_avg > 0 ? 'var(--status-exam)' : 'none'}
              color="var(--status-exam)"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <strong style={{ color: 'var(--text-primary)' }}>
              {resource.rating_avg > 0 ? resource.rating_avg.toFixed(1) : '—'}
            </strong>
            {resource.rating_count > 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                ({resource.rating_count})
              </span>
            )}
          </div>
        </div>

        {/* Right Action Triggers: Inspect & Direct Download */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to={`/resources/${resource.id}`}
            aria-label={`Inspect resource details: ${resource.title}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            className="touch-target"
          >
            <span>INSPECT</span>
            <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
          </Link>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            aria-label={`Download ${resource.title}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-core)',
              color: 'var(--accent-contrast)',
              border: '1px solid var(--accent-core)',
              boxShadow: '0 2px 12px var(--accent-tint)',
              transition: 'all 160ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="touch-target"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-core)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Download size={13} strokeWidth={1.75} aria-hidden="true" />
            <span>DOWNLOAD</span>
          </a>
        </div>
      </div>
    </div>
  );
};
