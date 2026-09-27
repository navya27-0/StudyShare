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
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: '4px solid var(--accent-core)',
        borderRadius: 'var(--radius-md)',
        padding: '18px 20px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '20px',
        position: 'relative',
        transition: 'all 120ms ease',
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isCollapsed ? 0 : '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-tint)',
              color: 'var(--accent-core)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--accent-core)',
                  letterSpacing: '0.04em',
                }}
              >
                QUALITY & RECENCY RANKING
              </span>
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: 'var(--bg-muted)',
                  color: 'var(--text-muted)',
                  padding: '1px 5px',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                WEIGHTED
              </span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Most Useful This Week
            </h2>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {isCollapsed ? (
            <>
              <span>Show</span> <ChevronDown size={14} />
            </>
          ) : (
            <>
              <span>Minimize</span> <ChevronUp size={14} />
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
                  transition: 'border-color 100ms ease, transform 80ms ease, background-color 100ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-muted)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-subdued)';
                }}
              >
                <div>
                  {/* Top line: Rank number + Subject code + Type */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: index === 0 ? 'var(--accent-core)' : 'var(--text-muted)',
                        }}
                      >
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
