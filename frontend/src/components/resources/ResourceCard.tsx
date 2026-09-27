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
} from 'lucide-react';
import type { ResourceListItem, ResourceType } from '../../types';
import { resourcesApi } from '../../services/api';

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
  const [upvotes, setUpvotes] = useState(resource.upvotes_count);
  const [downvotes, setDownvotes] = useState(resource.downvotes_count);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(resource.user_vote ?? null);
  const [isBookmarked, setIsBookmarked] = useState(resource.is_bookmarked ?? false);
  const [isVoting, setIsVoting] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

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

  // Voting action
  const handleVote = async (type: 'up' | 'down') => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      const res = await resourcesApi.vote(resource.id, type);
      setUpvotes(res.upvotes_count);
      setDownvotes(res.downvotes_count);
      setUserVote(res.vote_type);
      onVoteChange?.(resource.id, res.upvotes_count, res.downvotes_count, res.vote_type);
    } catch {
      // Revert or show toast if needed
    } finally {
      setIsVoting(false);
    }
  };

  // Bookmark action
  const handleBookmarkToggle = async () => {
    if (isBookmarking) return;
    setIsBookmarking(true);
    try {
      const res = await resourcesApi.toggleBookmark(resource.id, isBookmarked);
      setIsBookmarked(res.bookmarked);
      onBookmarkChange?.(resource.id, res.bookmarked);
    } catch {
      // Revert if error
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
          {resource.uploader.display_name}
        </div>

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
          <Star size={13} fill={resource.rating_avg > 0 ? '#B87318' : 'none'} color="#B87318" strokeWidth={1.75} />
          <span>{resource.rating_avg > 0 ? resource.rating_avg.toFixed(1) : '—'}</span>
        </div>

        {/* Net Votes Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          <button
            type="button"
            onClick={() => handleVote('up')}
            disabled={isVoting}
            aria-label="Upvote"
            style={{
              padding: '2px 4px',
              borderRadius: '2px',
              color: userVote === 'up' ? 'var(--accent-core)' : 'var(--text-muted)',
              backgroundColor: userVote === 'up' ? 'var(--accent-tint)' : 'transparent',
            }}
          >
            <ChevronUp size={14} strokeWidth={2} />
          </button>
          <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>
            {upvotes - downvotes}
          </span>
          <button
            type="button"
            onClick={() => handleVote('down')}
            disabled={isVoting}
            aria-label="Downvote"
            style={{
              padding: '2px 4px',
              borderRadius: '2px',
              color: userVote === 'down' ? 'var(--status-danger)' : 'var(--text-muted)',
              backgroundColor: userVote === 'down' ? 'var(--status-danger-bg)' : 'transparent',
            }}
          >
            <ChevronDown size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Download action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
          <button
            type="button"
            onClick={handleBookmarkToggle}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            style={{
              padding: '4px',
              color: isBookmarked ? 'var(--accent-core)' : 'var(--text-muted)',
            }}
          >
            <Bookmark size={14} fill={isBookmarked ? 'var(--accent-core)' : 'none'} strokeWidth={1.75} />
          </button>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            aria-label="Download document"
            style={{ padding: '4px', color: 'var(--text-secondary)' }}
          >
            <Download size={14} strokeWidth={1.75} />
          </a>
        </div>
      </div>
    );
  }

  // STANDARD HIGH-DENSITY LEDGER CARD LIST ITEM
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${spineColor}`,
        borderRadius: 'var(--radius-sm)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 100ms ease, box-shadow 100ms ease',
        position: 'relative',
      }}
      className="ledger-resource-card"
    >
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
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--status-verified)',
                backgroundColor: 'var(--status-verified-bg)',
                padding: '1px 6px',
                borderRadius: '2px',
              }}
              title="Verified according to university syllabus"
            >
              <CheckCircle2 size={11} strokeWidth={2} />
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
            <Bookmark size={15} fill={isBookmarked ? 'var(--accent-core)' : 'none'} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Resource Title */}
      <h3 style={{ margin: 0, lineHeight: 1.35 }}>
        <Link
          to={`/resources/${resource.id}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '6px',
          }}
          className="resource-title-link"
        >
          <span>{resource.title}</span>
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
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
          By {resource.uploader.display_name}
        </span>
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
              aria-label="Upvote note"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 6px',
                borderRadius: '2px',
                color: userVote === 'up' ? 'var(--accent-core)' : 'var(--text-secondary)',
              }}
              title="Upvote verified accuracy"
            >
              <ChevronUp size={15} strokeWidth={2.2} />
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
              aria-label="Downvote note"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 6px',
                borderRadius: '2px',
                color: userVote === 'down' ? 'var(--status-danger)' : 'var(--text-muted)',
              }}
              title="Downvote inaccurate note"
            >
              <ChevronDown size={15} strokeWidth={2.2} />
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
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Star
              size={13}
              fill={resource.rating_avg > 0 ? '#B87318' : 'none'}
              color="#B87318"
              strokeWidth={1.75}
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <span>INSPECT</span>
            <ExternalLink size={12} strokeWidth={1.75} />
          </Link>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-core)',
              color: '#FFFFFF',
            }}
          >
            <Download size={13} strokeWidth={1.75} />
            <span>DOWNLOAD</span>
          </a>
        </div>
      </div>
    </div>
  );
};
