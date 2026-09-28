import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Star,
  ChevronUp,
  ChevronDown,
  FileText,
  FileQuestion,
  FlaskConical,
  BookOpen,
  Link as LinkIcon,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { resourcesApi } from '../../services/api';
import type { ResourceListItem, ResourceType } from '../../types';

interface MostUsefulModuleProps {
  onSelectResource?: (resourceId: number) => void;
}

export const MostUsefulModule: React.FC<MostUsefulModuleProps> = () => {
  const [items, setItems] = useState<ResourceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let mounted = true;
    resourcesApi
      .list({ sort_by: 'ranked', page_size: 4 })
      .then((res) => {
        if (mounted) {
          setItems(res.items);
        }
      })
      .catch(() => {
        // Fallback or offline
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'notes':
        return <FileText size={14} />;
      case 'pdf':
        return <FileCode size={14} />;
      case 'paper':
        return <FileQuestion size={14} />;
      case 'lab_record':
        return <FlaskConical size={14} />;
      case 'question_bank':
        return <BookOpen size={14} />;
      case 'link':
        return <LinkIcon size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ width: '180px', height: '16px', backgroundColor: 'var(--bg-muted)', borderRadius: '3px', marginBottom: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '110px', backgroundColor: 'var(--bg-subdued)', borderRadius: 'var(--radius-sm)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="daq-card"
      style={{
        padding: '24px 28px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '20px',
        position: 'relative',
      }}
    >
      {/* Corner Crosshairs */}
      <div className="daq-crosshair daq-crosshair-tl" />
      <div className="daq-crosshair daq-crosshair-tr" />
      <div className="daq-crosshair daq-crosshair-bl" />
      <div className="daq-crosshair daq-crosshair-br" />

      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isCollapsed ? 0 : '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--accent-tint)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={15} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="daq-tag" style={{ fontSize: '9.5px', padding: '1.5px 6px' }}>
                02 / TELEMETRY
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                }}
              >
                ALGORITHMIC TIME-DECAY RANKING
              </span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '3px 0 0',
                letterSpacing: '-0.01em',
              }}
            >
              Most Useful <span className="academic-serif-italic" style={{ fontWeight: 400 }}>This Week</span>
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-subdued)',
            cursor: 'pointer',
            transition: 'all 140ms ease',
          }}
        >
          {isCollapsed ? (
            <>
              <span>EXPAND</span> <ChevronDown size={13} />
            </>
          ) : (
            <>
              <span>COLLAPSE</span> <ChevronUp size={13} />
            </>
          )}
        </button>
      </div>

      {/* Cards Grid */}
      {!isCollapsed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '12px',
          }}
        >
          {items.map((item, index) => {
            const subjectCode = item.breadcrumbs?.subject?.code || `SEM ${item.semester}`;
            const netVotes = item.upvotes_count - item.downvotes_count;
            const rankClass = index === 0 ? 'rank-badge-gold' : index === 1 ? 'rank-badge-silver' : 'rank-badge-bronze';

            return (
              <Link
                key={item.id}
                to={`/resources/${item.id}`}
                style={{
                  backgroundColor: 'var(--bg-subdued)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                  transition: 'border-color 140ms ease, transform 140ms ease, background-color 140ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-muted)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-subdued)';
                }}
              >
                <div>
                  {/* Top line: Rank badge + Subject code + Type */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`rank-badge ${rankClass}`}>
                        #{index + 1}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          padding: '1px 5px',
                          borderRadius: '2px',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {subjectCode}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {getTypeIcon(item.type)}
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      lineHeight: 1.35,
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.title}
                  </h3>
                </div>

                {/* Bottom line: Rating, net votes, and downloads */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.rating_avg > 0 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          color: 'var(--status-exam)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <Star size={11} fill="currentColor" /> {item.rating_avg.toFixed(1)}
                      </span>
                    ) : null}

                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: netVotes > 0 ? 'var(--accent-core)' : 'var(--text-muted)',
                      }}
                    >
                      {netVotes > 0 ? `+${netVotes}` : netVotes} votes
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-core)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    View <ArrowRight size={11} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
