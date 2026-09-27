import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  UploadCloud,
  ThumbsUp,
  Award,
  BookOpen,
  Activity,
  FileText,
  Star,
  Bookmark,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersApi, resourcesApi } from '../services/api';
import { ResourceCard } from '../components/resources/ResourceCard';
import type { User, ResourceListItem, UserActivityItem } from '../types';

export const ProfileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const targetUserId = id ? parseInt(id, 10) : currentUser?.id;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [uploadedResources, setUploadedResources] = useState<ResourceListItem[]>([]);
  const [activities, setActivities] = useState<UserActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState<'uploads' | 'activity'>('uploads');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfileData = () => {
    if (!targetUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      usersApi.getProfile(targetUserId),
      resourcesApi.list({ uploader_id: targetUserId, page_size: 50 }),
      usersApi.getActivity(targetUserId, 25),
    ])
      .then(([userData, resourcesData, activityData]) => {
        setProfileUser(userData);
        setUploadedResources(resourcesData.items);
        setActivities(activityData.items);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load contributor profile');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadProfileData();
  }, [targetUserId]);

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatActivityTime = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) return 'Just now';
        return `${diffHours}h ago`;
      }
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ height: '140px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '24px' }} />
        <div style={{ height: '300px', backgroundColor: 'var(--bg-subdued)', borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '32px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
          Profile Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          {error || 'The requested contributor profile does not exist.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadProfileData}
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Retry Loading
          </button>
          <Link
            to="/"
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--accent-core)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const profile = profileUser.contributor_profile;
  const isSelf = currentUser?.id === profileUser.id;

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Profile Header Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '28px 24px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          {/* Identity Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {profileUser.avatar_url ? (
              <img
                src={profileUser.avatar_url}
                alt={`${profileUser.display_name}'s avatar profile picture`}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--accent-border)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-tint)',
                  border: '2px solid var(--accent-border)',
                  color: 'var(--accent-core)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '24px',
                }}
              >
                {profileUser.display_name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {profileUser.display_name}
                </h1>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '2px',
                    backgroundColor: profileUser.role === 'admin' ? 'var(--status-danger-bg)' : 'var(--bg-subdued)',
                    color: profileUser.role === 'admin' ? 'var(--status-danger)' : 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  {profileUser.role === 'admin' ? 'Curator' : 'Contributor'}
                </div>
                {isSelf && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '2px',
                      backgroundColor: 'var(--accent-tint)',
                      color: 'var(--accent-core)',
                      fontWeight: 600,
                    }}
                  >
                    YOU
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '14px',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                }}
              >
                {profile?.department && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <GraduationCap size={14} />
                    <span>{profile.department}</span>
                  </div>
                )}
                {profile?.semester && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <BookOpen size={14} />
                    <span>Semester {profile.semester}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={14} />
                  <span>Joined {formatDate(profileUser.created_at)}</span>
                </div>
              </div>

              {profile?.bio && (
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    marginTop: '10px',
                    maxWidth: '560px',
                    lineHeight: 1.5,
                  }}
                >
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Quick Upload CTA if viewing self */}
          {isSelf && (
            <Link
              to="/upload"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: 'var(--accent-core)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <UploadCloud size={16} /> Contribute Material
            </Link>
          )}
        </div>

        {/* 3 Metric Scoreboard Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '20px',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-subdued)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              <UploadCloud size={15} style={{ color: 'var(--accent-core)' }} />
              <span>RESOURCES UPLOADED</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {profile?.total_uploads ?? uploadedResources.length}
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-subdued)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              <ThumbsUp size={15} style={{ color: 'var(--accent-core)' }} />
              <span>UPVOTES RECEIVED</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {profile?.total_upvotes_received ?? 0}
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-subdued)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              <Award size={15} style={{ color: 'var(--status-exam)' }} />
              <span>REPUTATION SCORE</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 700, color: 'var(--status-exam)' }}>
              {profile?.reputation_points ?? 0} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>PTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={() => setActiveTab('uploads')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            color: activeTab === 'uploads' ? 'var(--accent-core)' : 'var(--text-secondary)',
            borderBottom: `2px solid ${activeTab === 'uploads' ? 'var(--accent-core)' : 'transparent'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 120ms ease',
          }}
        >
          <BookOpen size={16} />
          Uploaded Resources ({uploadedResources.length})
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            color: activeTab === 'activity' ? 'var(--accent-core)' : 'var(--text-secondary)',
            borderBottom: `2px solid ${activeTab === 'activity' ? 'var(--accent-core)' : 'transparent'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 120ms ease',
          }}
        >
          <Activity size={16} />
          Activity Log ({activities.length})
        </button>
      </div>

      {/* Tab 1: Uploaded Resources */}
      {activeTab === 'uploads' && (
        <div>
          {uploadedResources.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '48px 24px',
                textAlign: 'center',
              }}
            >
              <FileText size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No resources published yet</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 16px' }}>
                {isSelf
                  ? 'Contribute lecture notes, lab manuals, or PYQs to share with your university peers.'
                  : `${profileUser.display_name} has not published any study resources yet.`}
              </p>
              {isSelf && (
                <Link
                  to="/upload"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    backgroundColor: 'var(--accent-core)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <UploadCloud size={15} /> Upload First Resource
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {uploadedResources.map((res) => (
                <ResourceCard key={res.id} resource={res} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Activity List */}
      {activeTab === 'activity' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {activities.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '48px 24px',
                textAlign: 'center',
              }}
            >
              <Activity size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                No Study Activity Recorded
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                {isSelf
                  ? 'Actions such as contributing lecture notes, rating resources, or bookmarking study materials will populate your academic activity timeline.'
                  : `${profileUser.display_name} has no recent public activity logged in the community archive.`}
              </p>
              {isSelf && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Link
                    to="/"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--bg-subdued)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12.5px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Browse Catalog
                  </Link>
                  <Link
                    to="/upload"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--accent-core)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12.5px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: '#FFFFFF',
                    }}
                  >
                    Upload Resource
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activities.map((act, index) => {
                let icon = <FileText size={16} />;
                let iconBg = 'var(--bg-subdued)';
                let iconColor = 'var(--text-secondary)';

                if (act.action === 'uploaded') {
                  icon = <UploadCloud size={16} />;
                  iconBg = 'var(--accent-tint)';
                  iconColor = 'var(--accent-core)';
                } else if (act.action === 'rated') {
                  icon = <Star size={16} />;
                  iconBg = 'var(--status-exam-bg)';
                  iconColor = 'var(--status-exam)';
                } else if (act.action === 'bookmarked') {
                  icon = <Bookmark size={16} />;
                  iconBg = 'var(--status-lab-bg)';
                  iconColor = 'var(--status-lab)';
                }

                return (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      borderBottom: index < activities.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      transition: 'background-color 100ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: iconBg,
                          color: iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {icon}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {act.title}
                          </span>
                          {act.badge && (
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '2px',
                                backgroundColor: 'var(--bg-subdued)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {act.badge}
                            </span>
                          )}
                        </div>
                        <Link
                          to={`/resources/${act.resource_id}`}
                          style={{
                            fontSize: '13px',
                            color: 'var(--accent-core)',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {act.resource_title} <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatActivityTime(act.timestamp)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
