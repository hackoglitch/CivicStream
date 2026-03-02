import React, { useState, useEffect } from 'react';
import useAppStore from '../../store/useAppStore';
import useNotificationStore from '../../store/useNotificationStore';
import './OfficialDashboardScreen.css';
import { TaskListView, UnifiedIssueDetailsModal } from './OfficialViews';
import IssueDetailScreen from './IssueDetailScreen';
import OfficialProfileScreen from './OfficialProfileScreen';

const OfficialDashboardScreen = ({ variant = 'mobile' }) => {
    const isMobile = variant === 'mobile';
    const isDesktop = !isMobile;
    const logout = useAppStore(state => state.logout);
    const user = useAppStore(state => state.currentUser);
    const issues = useAppStore(state => state.issues);            // ← shared complaints from DB
    const fetchAppData = useAppStore(state => state.fetchAppData);
    const setSelectedIssueId = useAppStore(state => state.setSelectedIssueId);

    // Core Navigation State (Global via Store for Dual-View Sync)
    const activeTab = useAppStore(state => state.officialActiveTab);
    const setActiveTab = useAppStore(state => state.setOfficialActiveTab);
    const currentView = useAppStore(state => state.officialCurrentView);
    const setCurrentView = useAppStore(state => state.setOfficialCurrentView);
    const selectedTaskId = useAppStore(state => state.officialSelectedTaskId);
    const setSelectedTaskId = useAppStore(state => state.setOfficialSelectedTaskId);
    const selectedWorkerProfile = useAppStore(state => state.officialSelectedWorkerProfileId);
    const setSelectedWorkerProfile = useAppStore(state => state.setOfficialSelectedWorkerProfileId);
    const unreadCount = useNotificationStore(state => state.unreadCount);
    const navigate = useAppStore(state => state.navigate);

    const handleOpenIssue = (id) => {
        setSelectedIssueId(id);
        navigate('issue-detail');
    };

    // Load complaints from DB on mount
    useEffect(() => {
        fetchAppData();
    }, []);

    // ── Derived Metrics (from shared issues array) ───────────────────────────
    const total = issues.length;
    const pending = issues.filter(t => t.status === 'pending').length;
    const inProgress = issues.filter(t => t.status === 'in_progress').length;
    const completed = issues.filter(t => t.status === 'completed').length;
    const verified = issues.filter(t => t.status === 'verified').length;
    const escalations = issues.filter(t => t.escalation_flag);

    const metrics = [
        { label: 'Total', value: total.toString(), type: 'total' },
        { label: 'Pending', value: pending.toString(), type: 'new' },
        { label: 'In Progress', value: inProgress.toString(), type: 'pending' }
    ];

    const feedItems = [
        { role: 'Worker', action: 'completed a task', time: '15 minutes ago', location: 'Sector 4', icon: 'group', id: issues[0]?.id }
    ].filter(f => f.id);

    const renderNavItems = () => (
        <>
            <button className={`od-nav-item ${activeTab === 'Control' ? 'active' : ''}`} onClick={() => { setActiveTab('Control'); setCurrentView('dashboard'); }}>
                <span className="material-symbols-outlined">grid_view</span>
                <span className="od-nav-label">Dashboard</span>
            </button>
            <button className={`od-nav-item ${activeTab === 'Metrics' ? 'active' : ''}`} onClick={() => setActiveTab('Metrics')}>
                <span className="material-symbols-outlined">query_stats</span>
                <span className="od-nav-label">Metrics</span>
            </button>
            <button className={`od-nav-item ${activeTab === 'Live Map' ? 'active' : ''}`} onClick={() => setActiveTab('Live Map')}>
                <span className="material-symbols-outlined">map</span>
                <span className="od-nav-label">Live Map</span>
            </button>
            <button className={`od-nav-item ${activeTab === 'Config' ? 'active' : ''}`} onClick={() => setActiveTab('Config')}>
                <span className="material-symbols-outlined">settings</span>
                <span className="od-nav-label">Config</span>
            </button>
            <button className={`od-nav-item ${activeTab === 'Profile' ? 'active' : ''}`} onClick={() => setActiveTab('Profile')}>
                <span className="material-symbols-outlined">person</span>
                <span className="od-nav-label">Profile</span>
            </button>
        </>
    );

    const renderUnderDevelopment = (tab) => (
        <div className="od-content-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: '120px', height: '120px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#94a3b8' }}>
                    {tab === 'Metrics' ? 'analytics' : tab === 'Workers' ? 'engineering' : tab === 'Live Map' ? 'map' : 'settings'}
                </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: '0 0 12px 0' }}>{tab} Under Development</h2>
            <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '400px', lineHeight: '1.6', margin: 0 }}>
                We're building something great for the CivicStream management suite. This feature will be available in the next release.
            </p>
            <button className="od-btn primary" style={{ marginTop: '32px', width: 'auto', padding: '12px 24px' }} onClick={() => setActiveTab('Control')}>
                Back to Control
            </button>
        </div>
    );

    const renderDashboard = () => (
        <div className="od-content-wrapper animate-fade-in no-scrollbar">
            <header className="od-header">
                <div className="od-user-profile">
                    <div className="od-avatar-placeholder">
                        <span className="material-symbols-outlined">account_balance</span>
                    </div>
                    <div className="od-user-info">
                        <h1 className="od-greeting">Civic Ops Control</h1>
                        <p className="od-role">COMMAND CENTER</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button className="od-status" title="Notifications" onClick={() => navigate('notifications')} style={{ position: 'relative' }}>
                        <span className="material-symbols-outlined od-status-icon">notifications</span>
                        {unreadCount > 0 && <span className="unread-badge-wd" style={{ top: 8, right: 8 }}>{unreadCount}</span>}
                    </button>
                    <button className="od-status" title="Logout" onClick={logout}>
                        <span className="material-symbols-outlined od-status-icon">logout</span>
                    </button>
                    <button className="od-status" title="Profile" onClick={() => setActiveTab('Profile')} style={{ padding: 0, border: 'none', background: 'none' }}>
                        <img src={user?.profileImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="Profile" className="od-profile-avatar" />
                    </button>
                </div>
            </header>

            <main>
                {/* Real-Time Metrics */}
                <section className="od-section">
                    <h2 className="od-section-title">
                        <span className="material-symbols-outlined od-section-icon">analytics</span>
                        Real-Time Metrics
                    </h2>
                    <div className="od-overview-scroll">
                        {metrics.map((m, i) => (
                            <div key={i} className="od-card od-card-compact">
                                <div className={`od-icon-box ${i === 0 ? 'blue' : i === 1 ? 'orange' : 'yellow'}`}>
                                    <span className="material-symbols-outlined">
                                        {i === 0 ? 'assignment' : i === 1 ? 'pending_actions' : 'schedule'}
                                    </span>
                                </div>
                                <div className="od-card-number">{m.value}</div>
                                <div className="od-card-label">{m.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Quick Navigation */}
                <section className="od-section">
                    <h2 className="od-section-title" style={{ marginBottom: 16 }}>Quick Navigation</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button className="od-btn outline" style={{ background: '#f1f5f9', color: '#1e293b', fontSize: '13px', padding: '12px' }} onClick={() => setCurrentView('master_registry')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list_alt</span> Master Registry
                        </button>
                        <button className="od-btn danger" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '13px', padding: '12px' }} onClick={() => setCurrentView('escalated')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span> Escalated ({escalations.length})
                        </button>
                        <button className="od-btn outline" style={{ background: '#ffedd5', color: '#ea580c', fontSize: '13px', padding: '12px' }} onClick={() => setCurrentView('pending_assignment')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment_late</span> Pending ({pending})
                        </button>
                        <button className="od-btn primary" style={{ background: '#eff6ff', color: '#3b82f6', fontSize: '13px', padding: '12px' }} onClick={() => setCurrentView('assigned')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment_ind</span> Assigned Monitor
                        </button>
                        <button className="od-btn primary" style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '13px', padding: '12px' }} onClick={() => setCurrentView('in_progress')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>engineering</span> In Progress ({inProgress})
                        </button>
                        <button className="od-btn outline" style={{ background: '#ecfdf5', color: '#059669', fontSize: '13px', padding: '12px' }} onClick={() => setCurrentView('completed')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>fact_check</span> Verify ({completed})
                        </button>
                    </div>
                </section>

                {/* Worker Load */}
                <section className="od-section" style={{ marginTop: '12px' }}>
                    <div className="od-stats-row">
                        <div className="od-stat" style={{ cursor: 'pointer' }} onClick={() => setSelectedWorkerProfile('Ravi S.')}>
                            <span className="material-symbols-outlined od-stat-icon">group</span>
                            <div className="od-stat-content">
                                <div className="od-stat-title">Active Workers</div>
                                <div className="od-stat-value">2 / 2</div>
                            </div>
                        </div>
                        <div className="od-stat danger" style={{ cursor: 'pointer' }}>
                            <span className="material-symbols-outlined od-stat-icon">warning</span>
                            <div className="od-stat-content">
                                <div className="od-stat-title">Escalated Issues</div>
                                <div className="od-stat-value">{escalations.length}</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Escalated Issues & Activity Feed */}
                <section className="od-section" style={{ paddingBottom: '24px' }}>
                    <div className="od-tasks-header">
                        <h2 className="od-tasks-title">Escalated Issues & Feed</h2>
                        <button className="od-filter">
                            Filter
                            <span className="material-symbols-outlined">filter_list</span>
                        </button>
                    </div>
                    <div className="od-task-list">
                        {escalations.length === 0 && (
                            <p style={{ color: '#64748b', fontSize: '14px' }}>No escalated issues.</p>
                        )}
                        {escalations.map((esc, i) => (
                            <div key={i} className="od-task active">
                                <div className="od-task-top">
                                    <span className="od-tag red">ESCALATED</span>
                                    <div className="od-sla">
                                        <div className="od-sla-time red">
                                            <span className="material-symbols-outlined">warning</span>
                                            Urgent
                                        </div>
                                    </div>
                                </div>
                                <h2 className="od-task-id">{esc.id}</h2>
                                <div className="od-category-row">
                                    <span className="material-symbols-outlined od-category-icon">report_problem</span>
                                    {esc.category}
                                </div>
                                <p className="od-desc">{esc.title}</p>
                                <div className="od-loc">
                                    <span className="material-symbols-outlined">location_on</span>
                                    <span>{esc.location}</span>
                                </div>
                                <div className="od-actions">
                                    <button className="od-btn primary" onClick={() => handleOpenIssue(esc.id)}>
                                        View Issue
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {feedItems.map((item, i) => (
                            <div key={`feed-${i}`} className="od-task active" onClick={() => item.id && handleOpenIssue(item.id)} style={{ cursor: 'pointer' }}>
                                <div className="od-task-top">
                                    <span className="od-tag blue">FEED UPDATE</span>
                                    <div className="od-sla">
                                        <div className="od-sla-time gray">{item.time}</div>
                                    </div>
                                </div>
                                <h2 className="od-task-id">{item.role} {item.action}</h2>
                                <div className="od-category-row">
                                    <span className="material-symbols-outlined od-category-icon">{item.icon}</span>
                                    {item.role} Activity
                                </div>
                                <div className="od-loc" style={{ marginBottom: 0 }}>
                                    <span className="material-symbols-outlined">location_on</span>
                                    <span>{item.location}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );

    const renderWorkerProfileModal = () => (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f7f9fa', zIndex: 1000, overflowY: 'auto', padding: '24px' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button onClick={() => setSelectedWorkerProfile(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>arrow_back</span>
                </button>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Worker Management</div>
                <div style={{ width: 28 }}></div>
            </div>

            <div className="od-card" style={{ marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ padding: '24px', background: '#eff6ff', borderRadius: '50%', display: 'inline-block', marginBottom: '16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#3b82f6' }}>person</span>
                </div>
                <h2>{selectedWorkerProfile}</h2>
                <p style={{ color: '#64748b' }}>Sanitation Dept. • Level 4</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>2</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Active Tasks</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>14</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Completed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>1</div>
                        <div style={{ fontSize: '12px', color: '#dc2626' }}>Escalation</div>
                    </div>
                </div>
            </div>

            <div className="od-card" style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 16px', color: '#64748b' }}>Avg Resolution Time</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>3.2 days <span style={{ fontSize: '14px', color: '#10b981' }}>~12% faster</span></div>
            </div>

            <div className="od-card">
                <button className="od-btn danger" onClick={() => alert('Cannot disable if worker has Active Tasks.')}>
                    Disable Worker
                </button>
            </div>
        </div>
    );

    return (
        <div className={`official-dashboard-container ${isDesktop ? 'official-dashboard-desktop' : ''}`}>

            {selectedWorkerProfile && renderWorkerProfileModal()}

            {selectedTaskId && (
                <UnifiedIssueDetailsModal
                    taskId={selectedTaskId}
                    onClose={() => setSelectedTaskId(null)}
                />
            )}

            {!selectedWorkerProfile && !selectedTaskId && activeTab === 'Control' && currentView === 'dashboard' && renderDashboard()}

            {!selectedWorkerProfile && !selectedTaskId && activeTab === 'Live Map' && (
                <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
                    <IssueDetailScreen variant={variant} isTabPage={true} />
                </div>
            )}

            {!selectedWorkerProfile && !selectedTaskId && activeTab === 'Profile' && (
                <OfficialProfileScreen onBack={() => setActiveTab('Control')} />
            )}

            {!selectedWorkerProfile && !selectedTaskId && activeTab !== 'Control' && activeTab !== 'Live Map' && activeTab !== 'Profile' && renderUnderDevelopment(activeTab)}

            {/* ── Monitoring Views (filter from shared issues array) ─── */}
            {!selectedWorkerProfile && !selectedTaskId && currentView === 'master_registry' && (
                <TaskListView
                    title="Master Registry (All)"
                    filterFn={() => true}
                    onOpenTask={handleOpenIssue}
                    onBack={() => setCurrentView('dashboard')}
                />
            )}
            {!selectedWorkerProfile && !selectedTaskId && currentView === 'pending_assignment' && (
                <TaskListView
                    title="Pending Assignment"
                    filterFn={t => t.status === 'pending'}
                    onOpenTask={handleOpenIssue}
                    onBack={() => setCurrentView('dashboard')}
                />
            )}
            {!selectedWorkerProfile && !selectedTaskId && currentView === 'assigned' && (
                <TaskListView
                    title="Assigned Monitoring"
                    filterFn={t => t.status === 'assigned'}
                    onOpenTask={handleOpenIssue}
                    onBack={() => setCurrentView('dashboard')}
                />
            )}
            {!selectedWorkerProfile && !selectedTaskId && currentView === 'in_progress' && (
                <TaskListView
                    title="In Progress Tasks"
                    filterFn={t => t.status === 'in_progress'}
                    onOpenTask={handleOpenIssue}
                    onBack={() => setCurrentView('dashboard')}
                />
            )}
            {!selectedWorkerProfile && !selectedTaskId && currentView === 'completed' && (
                <TaskListView
                    title="Completed — Verification"
                    filterFn={t => t.status === 'completed'}
                    onOpenTask={handleOpenIssue}
                    onBack={() => setCurrentView('dashboard')}
                />
            )}
            {!selectedWorkerProfile && !selectedTaskId && currentView === 'verified' && (
                <TaskListView
                    title="Verified & Closed"
                    filterFn={t => t.status === 'verified'}
                    onOpenTask={handleOpenIssue}
                    onBack={() => setCurrentView('dashboard')}
                />
            )}
            {!selectedWorkerProfile && !selectedTaskId && currentView === 'escalated' && (
                <TaskListView
                    title="Escalated Issues"
                    filterFn={t => t.escalation_flag === true}
                    onOpenTask={handleOpenIssue}
                    onBack={() => setCurrentView('dashboard')}
                />
            )}

            {/* Bottom Nav (mobile) / Sidebar (desktop) */}
            <nav className={`od-bottom-nav ${isMobile ? 'od-bottom-nav-mobile' : ''}`}>
                {renderNavItems()}
            </nav>
        </div>
    );
};

export default OfficialDashboardScreen;
