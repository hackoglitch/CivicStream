import React, { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import GoogleMap from '../common/GoogleMap';
import './IssueFullDetailsScreen.css';

/**
 * IssueFullDetailsScreen Component
 * 
 * Provides a deep-dive view into a specific civic issue.
 * Includes status timeline, media, descriptions, and citizen comments.
 */
const IssueFullDetailsScreen = ({ variant = 'mobile' }) => {
    const isMobile = variant === 'mobile';

    // Global State
    const issues = useAppStore(state => state.issues);
    const selectedIssueId = useAppStore(state => state.selectedIssueId);
    const currentUser = useAppStore(state => state.currentUser);
    const user = useAppStore(state => state.user);
    const navigate = useAppStore(state => state.navigate);
    const addComment = useAppStore(state => state.addComment);
    const updateIssueStatus = useAppStore(state => state.updateIssueStatus);

    // Filtered Issue
    const issue = issues.find(i => i.id === selectedIssueId);

    // Local State for Comments
    const [newComment, setNewComment] = useState('');

    const voteIssue = useAppStore(state => state.voteIssue);
    const voteComment = useAppStore(state => state.voteComment);

    if (!issue) {
        return (
            <div className="empty-state">
                <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#e2e8f0' }}>error</span>
                <h3>Issue not found</h3>
                <button onClick={() => {
                    if (currentUser?.role === 'official') {
                        navigate('official-dashboard');
                    } else if (currentUser?.role === 'worker') {
                        navigate('worker-dashboard');
                    } else {
                        navigate('home');
                    }
                }}>Go Back</button>
            </div>
        );
    }

    const handleSendComment = () => {
        if (!newComment.trim()) return;
        addComment(issue.id, {
            name: user.username,
            role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
            text: newComment,
            time: 'Just now',
            avatar: user.profileImage // Consistent user avatar
        });
        setNewComment('');
    };

    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        switch (s) {
            case 'pending': return { bg: '#fef3c7', text: '#d97706', label: 'Pending' };
            case 'assigned':
            case 'in_progress':
            case 'processing': return { bg: '#dbeafe', text: '#2563eb', label: 'In Progress' };
            case 'completed':
            case 'verified': return { bg: '#dcfce7', text: '#16a34a', label: 'Verified' };
            default: return { bg: '#f3f4f6', text: '#374151', label: 'Unknown' };
        }
    };

    const statusStyle = getStatusStyle(issue.status);

    return (
        <div className={`full-details-root ${!isMobile ? 'full-details-root--desktop' : 'full-details-root--mobile'}`}>
            {/* 1. Header */}
            <header className="details-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => {
                        if (currentUser?.role === 'official') {
                            navigate('official-dashboard');
                        } else if (currentUser?.role === 'worker') {
                            navigate('worker-dashboard');
                        } else {
                            navigate('home');
                        }
                    }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="header-title">Issue Details</h1>
                </div>
                <div className="header-right">
                    {user.id === issue.userId && (
                        <button
                            className="delete-btn"
                            onClick={() => {
                                if (window.confirm('Delete this report?')) {
                                    useAppStore.getState().deleteIssue(issue.id);
                                    navigate('home');
                                }
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>delete</span>
                        </button>
                    )}
                    <button className="icon-btn">
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>
                </div>
            </header>

            <div className="details-scroll-content">
                {/* 2. Issue Info Card */}
                <section className="info-card">
                    <div className="badge-row">
                        <span className="category-pill">{(issue.category || 'General').toUpperCase()}</span>
                        <span className="status-pill" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                            {statusStyle.label || issue.status}
                        </span>
                    </div>
                    <h2 className="issue-main-title">{issue.title}</h2>
                    <div className="location-row">
                        <span className="material-symbols-outlined">location_on</span>
                        <span>{issue.location}</span>
                    </div>

                    {issue.coordinates && issue.coordinates.length >= 2 && (
                        <div className="mini-map-container" style={{ height: '150px', borderRadius: '12px', overflow: 'hidden', margin: '16px 0' }}>
                            <GoogleMap
                                center={{ lat: issue.coordinates[1], lng: issue.coordinates[0] }}
                                zoom={15}
                                markers={[{ position: { lat: issue.coordinates[1], lng: issue.coordinates[0] } }]}
                                options={{ disableDefaultUI: true, zoomControl: false }}
                            />
                        </div>
                    )}

                    <div className="issue-stats-details">
                        <div className="reported-date">Reported {issue.date}</div>
                        <div className="voting-detailed">
                            <button
                                className={`vote-btn-detailed ${issue.userVote === 'up' ? 'upvoted' : ''}`}
                                onClick={() => voteIssue(issue.id, 'up')}
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: issue.userVote === 'up' ? "'FILL' 1" : "''" }}>thumb_up</span>
                                <span className="vote-count-num">{issue.supportCount || 0}</span>
                            </button>
                            <button
                                className={`vote-btn-detailed ${issue.userVote === 'down' ? 'downvoted' : ''}`}
                                onClick={() => voteIssue(issue.id, 'down')}
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: issue.userVote === 'down' ? "'FILL' 1" : "''" }}>thumb_down</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* 3. Media Section */}
                <section className="media-section">
                    <img src={issue.image} alt={issue.title} className="detail-image" />
                </section>

                {/* 4. Description Section */}
                <section className="description-section">
                    <h3>Description</h3>
                    <p>{issue.description}</p>
                </section>

                {/* 5. Progress Timeline */}
                <section className="timeline-section">
                    <h3>Progress Timeline</h3>
                    <div className="timeline-container">
                        {(issue.history || []).map((step, index) => (
                            <div key={index} className={`timeline-step ${step.status}`}>
                                <div className="step-indicator">
                                    <div className="step-line" />
                                    <div className="step-point">
                                        {step.status === 'completed' && <span className="material-symbols-outlined">check</span>}
                                        {step.status === 'current' && <div className="pulse-dot" />}
                                    </div>
                                </div>
                                <div className="step-text">
                                    <div className="step-name">{step.stage}</div>
                                    {step.date && <div className="step-date">{step.date}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 6. Comments Section */}
                <section className="comments-section">
                    <h3>Comments ({(issue.comments || []).length})</h3>
                    <div className="comments-list">
                        {(issue.comments || []).map((comment) => (
                            <div key={comment.id} className="comment-item">
                                <img src={comment.avatar} alt={comment.name} className="comment-avatar" />
                                <div className="comment-body">
                                    <div className="comment-header">
                                        <div className="comment-user-meta">
                                            <span className="comment-name">{comment.name}</span>
                                            <span className="role-tag">{comment.role}</span>
                                        </div>
                                        <div className="comment-actions-row">
                                            <div className="comment-voting">
                                                <span
                                                    className="material-symbols-outlined comment-vote-icon"
                                                    style={{
                                                        color: comment.userVote === 'up' ? '#3b82f6' : 'inherit',
                                                        fontVariationSettings: comment.userVote === 'up' ? "'FILL' 1" : "''"
                                                    }}
                                                    onClick={() => voteComment(issue.id, comment.id, 'up')}
                                                >thumb_up</span>
                                                <span className="comment-vote-count">{comment.votes || 0}</span>
                                                <span
                                                    className="material-symbols-outlined comment-vote-icon"
                                                    style={{
                                                        color: comment.userVote === 'down' ? '#ef4444' : 'inherit',
                                                        fontVariationSettings: comment.userVote === 'down' ? "'FILL' 1" : "''"
                                                    }}
                                                    onClick={() => voteComment(issue.id, comment.id, 'down')}
                                                >thumb_down</span>
                                            </div>
                                            <span className="comment-time">{comment.time}</span>
                                        </div>
                                    </div>
                                    <p className="comment-text">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Padding for fixed input */}
                <div style={{ height: '80px' }} />
            </div>

            {/* 7. Comment Input (Fixed) */}
            <div className="comment-input-fixed">
                <div className="input-wrapper">
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    />
                    <button className="send-btn" onClick={handleSendComment}>
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IssueFullDetailsScreen;
