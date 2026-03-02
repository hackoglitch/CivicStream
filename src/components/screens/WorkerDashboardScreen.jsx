import React, { useState, useRef, useEffect } from 'react';
import useAppStore from '../../store/useAppStore';
import useNotificationStore from '../../store/useNotificationStore';
import './WorkerDashboardScreen.css';

const TaskCard = ({ task, variant = 'home' }) => {
    const setWorkerDashboardTab = useAppStore(state => state.setWorkerDashboardTab);
    const setWorkerDashboardSubTab = useAppStore(state => state.setWorkerDashboardSubTab);
    const workerStartTask = useAppStore(state => state.workerStartTask);
    const workerCompleteTask = useAppStore(state => state.workerCompleteTask);
    const navigate = useAppStore(state => state.navigate);
    const setSelectedTaskSessionId = useAppStore(state => state.setSelectedTaskSessionId);
    const setTaskSessionViewMode = useAppStore(state => state.setTaskSessionViewMode);
    const [loading, setLoading] = useState(false);

    const handleViewTask = () => {
        // Home → navigate to tasks/assigned tab (no DB change)
        setWorkerDashboardTab('TASKS');
        setWorkerDashboardSubTab('assigned');
    };

    const handleStartTask = async () => {
        // From Assigned tab: assigned → in_progress via real API
        setLoading(true);
        await workerStartTask(task.id);
        setWorkerDashboardSubTab('in_progress');
        setLoading(false);
    };

    const handleDetails = () => {
        setSelectedTaskSessionId(task.id);
        setTaskSessionViewMode('details');
        navigate('task-session');
    };

    const handleMarkAsDone = async () => {
        // in_progress → completed via real API
        setLoading(true);
        await workerCompleteTask(task.id, '');
        setWorkerDashboardSubTab('completed');
        setLoading(false);
    };

    // Normalise status for display
    const statusIsInProgress = task.status === 'in_progress' || task.status === 'In Progress';
    const statusIsAssigned = task.status === 'assigned' || task.status === 'Assigned';
    const statusIsCompleted = task.status === 'completed' || task.status === 'Completed';

    return (
        <div className="mt-card animate-fade-in" style={{ marginBottom: variant === 'home' ? '0' : '16px' }}>
            <div className="mt-card-top">
                <span className={`mt-tag ${task.priority === 'EMERGENCY' || task.priority === 'emergency' ? 'red' : 'orange'}`}>
                    {task.priority || 'NORMAL'}
                </span>
                {!statusIsInProgress && !statusIsCompleted && task.sla && (
                    <div className="mt-sla">
                        <div className={`mt-sla-time ${task.priority === 'EMERGENCY' || task.priority === 'emergency' ? 'red' : 'orange'}`}>
                            <span className="material-symbols-outlined">alarm</span>
                            {task.sla}
                        </div>
                        <span className="mt-sla-label">SLA COUNTDOWN</span>
                    </div>
                )}
                {statusIsInProgress && (
                    <span className="wd-pill">IN PROGRESS</span>
                )}
                {statusIsCompleted && (
                    <span className="wd-pill" style={{ backgroundColor: '#10b981', color: 'white' }}>COMPLETED</span>
                )}
            </div>
            <h2 className="mt-id">{task.id}</h2>
            <div className="mt-category-row">
                <span className="material-symbols-outlined mt-category-icon">{task.icon || 'build'}</span>
                {task.category}
            </div>
            <p className="mt-desc">{task.description}</p>
            <div className="mt-loc">
                <span className="material-symbols-outlined">location_on</span>
                <span>{task.location}</span>
            </div>
            <div className="mt-actions">
                {variant === 'home' ? (
                    <button className="wd-btn primary" onClick={handleViewTask}>
                        View Task
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                ) : (
                    <>
                        <button className="mt-btn outline" onClick={handleDetails}>Details</button>
                        {statusIsAssigned && (
                            <button className="mt-btn solid" onClick={handleStartTask} disabled={loading}>
                                {loading ? 'Starting...' : 'Start Task'}
                            </button>
                        )}
                        {statusIsInProgress && (
                            <button className="mt-btn solid" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={handleMarkAsDone} disabled={loading}>
                                {loading ? 'Saving...' : 'Mark as Done'}
                            </button>
                        )}
                        {statusIsCompleted && (
                            <button className="mt-btn solid" style={{ backgroundColor: '#64748b', borderColor: '#64748b', opacity: 0.8 }} disabled>Completed</button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const DashboardHome = ({ user }) => {
    const workerTasks = useAppStore(state => state.workerTasks);
    const workerCompletedTasks = useAppStore(state => state.workerCompletedTasks || []);

    const assignedCount = workerTasks.filter(t => t.status === 'assigned').length;
    const inProgressCount = workerTasks.filter(t => t.status === 'in_progress').length;
    const completedCount = workerCompletedTasks.length;

    const userName = user?.name ? user.name.split(' ')[0] : 'Ravi';

    return (
        <div className="wd-content-wrapper animate-fade-in">
            <header className="wd-header">
                <div className="wd-user-profile">
                    <img alt="Worker Profile" className="wd-avatar" src={user?.profileImage || 'https://i.pravatar.cc/150'} />
                    <div className="wd-user-info">
                        <h1 className="wd-greeting">Good Morning, {userName}</h1>
                        <p className="wd-role">Field Worker • ID {user?.id?.toUpperCase() || '#4429'}</p>
                    </div>
                </div>
                <div className="wd-status">
                    <span className="wd-status-dot"></span>
                    AVAILABLE
                </div>
            </header>

            <main>
                {/* Today's Overview — driven by real DB data */}
                <section className="wd-section">
                    <h2 className="wd-section-title">
                        <span className="material-symbols-outlined wd-section-icon">analytics</span>
                        Today's Overview
                    </h2>
                    <div className="wd-overview-scroll">
                        <div className="wd-card wd-card-compact">
                            <div className="wd-icon-box blue">
                                <span className="material-symbols-outlined">assignment</span>
                            </div>
                            <div className="wd-card-number">{assignedCount}</div>
                            <div className="wd-card-label">ASSIGNED</div>
                        </div>
                        <div className="wd-card wd-card-compact">
                            <div className="wd-icon-box orange">
                                <span className="material-symbols-outlined">pending_actions</span>
                            </div>
                            <div className="wd-card-number">{inProgressCount}</div>
                            <div className="wd-card-label">IN PROGRESS</div>
                        </div>
                        <div className="wd-card wd-card-compact">
                            <div className="wd-icon-box" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <div className="wd-card-number">{completedCount}</div>
                            <div className="wd-card-label">COMPLETED</div>
                        </div>
                    </div>
                </section>

                {/* Performance Snapshot */}
                <section className="wd-section">
                    <div className="wd-stats-row">
                        <div className="wd-stat">
                            <span className="material-symbols-outlined wd-stat-icon">timer</span>
                            <div className="wd-stat-content">
                                <div className="wd-stat-title">Avg Res Time</div>
                                <div className="wd-stat-value cursor-default">42m</div>
                            </div>
                        </div>
                        <div className="wd-stat danger">
                            <span className="material-symbols-outlined wd-stat-icon">warning</span>
                            <div className="wd-stat-content">
                                <div className="wd-stat-title">Escalations</div>
                                <div className="wd-stat-value">1</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Your Active Tasks */}
                <section className="wd-section" style={{ paddingBottom: '24px' }}>
                    <div className="wd-tasks-header">
                        <h2 className="wd-tasks-title">Your Active Tasks</h2>
                        <button className="wd-filter">
                            Filter
                            <span className="material-symbols-outlined">filter_list</span>
                        </button>
                    </div>
                    <div className="wd-task-list">
                        {workerTasks.filter(t => t.status === 'assigned' || t.status === 'in_progress').slice(0, 3).map(task => (
                            <TaskCard key={task.id} task={task} variant="home" />
                        ))}
                        {workerTasks.filter(t => t.status === 'assigned' || t.status === 'in_progress').length === 0 && (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>task_alt</span>
                                No active tasks assigned to you.
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

const TaskDetailView = ({ taskId, onBack }) => (
    <div className="td-container animate-fade-in">
        {/* Header */}
        <div className="td-header">
            <button className="td-back-btn" onClick={onBack}>
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="td-task-id">{taskId}</h1>
            <span className="td-badge-assigned">Assigned</span>
        </div>

        {/* Content */}
        <div className="td-content">
            {/* Tags */}
            <div className="td-tags">
                <div className="td-tag emergency">
                    <span className="material-symbols-outlined">warning</span>
                    EMERGENCY
                </div>
                <div className="td-tag category">
                    <span className="material-symbols-outlined">water_drop</span>
                    Water Supply
                </div>
            </div>

            {/* SLA Card */}
            <div className="td-sla-card">
                <div className="td-sla-info">
                    <div className="td-sla-label">TIME TO RESOLVE</div>
                    <div className="td-sla-value">28m remaining</div>
                </div>
                <span className="material-symbols-outlined td-sla-icon">timer</span>
                <div className="td-progress-container">
                    <div className="td-progress-bar" style={{ width: '75%' }}></div>
                </div>
                <div className="td-sla-warning">CRITICAL: SLA Breach imminent</div>
            </div>

            {/* Description */}
            <div className="td-section">
                <h2 className="td-section-title">ISSUE DESCRIPTION</h2>
                <div className="td-desc-card">
                    <p>
                        Citizen reports major leakage in the main supply line near the community center.
                        Water pressure is extremely low in the surrounding blocks. Visible flooding on the sidewalk.
                    </p>
                </div>
            </div>

            {/* Reported Images */}
            <div className="td-section">
                <h2 className="td-section-title">REPORTED IMAGES</h2>
                <div className="td-images-scroll">
                    <img src="https://images.unsplash.com/photo-1541123303191-ba297ef1706a?q=80&w=300" alt="Leak 1" className="td-reported-img" />
                    <img src="https://images.unsplash.com/photo-1581094288338-2314dddb7ec4?q=80&w=300" alt="Leak 2" className="td-reported-img" />
                    <img src="https://images.unsplash.com/photo-1621905251918-48416bd83263?q=80&w=300" alt="Leak 3" className="td-reported-img" />
                </div>
            </div>

            {/* Location */}
            <div className="td-section">
                <h2 className="td-section-title">LOCATION</h2>
                <div className="td-location-card">
                    <div className="td-map-placeholder">
                        <img src="https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/80.22,13.08,15/600x300?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTAwMHozN2nyORneJ3In0.mXv6Dn4_9vFByInXwAAnFQ" alt="Map" className="td-map-img" />
                    </div>
                    <div className="td-location-footer">
                        <span className="td-address">122 Community Center Dr, North District</span>
                        <button className="td-map-link">
                            <span className="material-symbols-outlined">explore</span>
                            Open in Maps
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const UpdateStatusView = ({ taskId, onBack }) => {
    const [statusTab, setStatusTab] = useState('In Progress');
    const [notes, setNotes] = useState('');
    const [uploadedPhotos, setUploadedPhotos] = useState([]);
    const fileInputRef = useRef(null);
    const MAX_NOTES = 500;
    const MAX_PHOTOS = 4;

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const remaining = MAX_PHOTOS - uploadedPhotos.length;
        const toAdd = files.slice(0, remaining).map(f => URL.createObjectURL(f));
        setUploadedPhotos(prev => [...prev, ...toAdd]);
        e.target.value = '';
    };

    const removePhoto = (idx) => {
        setUploadedPhotos(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="us-container animate-fade-in">
            {/* Header */}
            <div className="us-header">
                <button className="us-back-btn" onClick={onBack}>
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="us-title">Update Status</h1>
                <span className="us-task-id">{taskId}</span>
            </div>

            {/* Scrollable Body */}
            <div className="us-body">
                {/* Current Status Card */}
                <div className="us-status-card">
                    <div className="us-status-card-left">
                        <span className="us-status-label">CURRENT STATUS</span>
                        <span className="us-status-value">Assigned</span>
                    </div>
                    <div className="us-active-badge">
                        <span className="us-active-dot"></span>
                        Active
                    </div>
                </div>

                {/* Change Status Toggle */}
                <div className="us-section">
                    <h2 className="us-section-title">Change Status</h2>
                    <div className="us-toggle-group">
                        <button
                            className={`us-toggle-btn ${statusTab === 'In Progress' ? 'active' : ''}`}
                            onClick={() => setStatusTab('In Progress')}
                        >
                            In Progress
                        </button>
                        <button
                            className={`us-toggle-btn ${statusTab === 'Completed' ? 'active' : ''}`}
                            onClick={() => setStatusTab('Completed')}
                        >
                            Completed
                        </button>
                    </div>

                    {/* Info Alert */}
                    <div className="us-info-alert">
                        <span className="material-symbols-outlined us-info-icon">info</span>
                        <p className="us-info-text">Make sure to upload proof before completing.</p>
                    </div>
                </div>

                {/* Work Notes */}
                <div className="us-section">
                    <div className="us-notes-header">
                        <h2 className="us-section-title">Work Notes</h2>
                        <span className="us-notes-count">{notes.length} / {MAX_NOTES}</span>
                    </div>
                    <textarea
                        className="us-notes-textarea"
                        placeholder="Describe the work performed or any issues encountered..."
                        value={notes}
                        maxLength={MAX_NOTES}
                        onChange={e => setNotes(e.target.value)}
                        rows={5}
                    />
                </div>

                {/* Upload Work Proof */}
                <div className="us-section">
                    <h2 className="us-section-title">
                        Upload Work Proof
                        <span className="us-required"> *</span>
                    </h2>

                    {/* Photo Previews */}
                    {uploadedPhotos.length > 0 && (
                        <div className="us-photo-grid">
                            {uploadedPhotos.map((src, idx) => (
                                <div key={idx} className="us-photo-thumb">
                                    <img src={src} alt={`Proof ${idx + 1}`} />
                                    <button className="us-photo-remove" onClick={() => removePhoto(idx)}>
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {uploadedPhotos.length < MAX_PHOTOS && (
                        <button
                            className="us-upload-zone"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="us-upload-icons">
                                <div className="us-upload-icon-circle">
                                    <span className="material-symbols-outlined">photo_camera</span>
                                </div>
                                <div className="us-upload-icon-circle">
                                    <span className="material-symbols-outlined">image</span>
                                </div>
                            </div>
                            <p className="us-upload-main">Tap to take photo or upload</p>
                            <p className="us-upload-sub">Maximum {MAX_PHOTOS} photos allowed</p>
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                </div>

                {/* Submit button — scrolls with content, visible at end of page */}
                <button className="us-submit-btn">
                    <span className="material-symbols-outlined">check_circle</span>
                    UPDATE STATUS
                </button>
            </div>
        </div>
    );
};

const InProgressContent = ({ onViewDetails }) => {
    const showUpdateStatus = useAppStore(state => state.showWorkerUpdateStatus);
    const setShowUpdateStatus = useAppStore(state => state.setShowWorkerUpdateStatus);

    if (showUpdateStatus) {
        return <UpdateStatusView taskId="#CS-1024" onBack={() => setShowUpdateStatus(false)} />;
    }

    const unreadCount = useNotificationStore(state => state.unreadCount);
    const navigate = useAppStore(state => state.navigate);

    return (
        <div className="ip-container animate-fade-in">
            <div className="ip-header">
                <div className="ip-title-group">
                    <h2 className="ip-main-title">In Progress Tasks (1)</h2>
                    <p className="ip-subtitle">Tasks you are currently working on</p>
                </div>
                <div className="ip-header-actions">
                    <button className="ip-bell-btn" onClick={() => navigate('notifications')} style={{ position: 'relative' }}>
                        <span className="material-symbols-outlined">notifications</span>
                        {unreadCount > 0 && <span className="unread-badge-wd">{unreadCount}</span>}
                    </button>
                </div>
            </div>

            {/* Task Card */}
            <div className="ip-task-card">
                <div className="ip-image-container">
                    <img
                        src="https://images.unsplash.com/photo-1542013936693-884638332954?q=80&w=1000&auto=format&fit=crop"
                        alt="Water Pipe Issue"
                        className="ip-task-image"
                    />
                    <div className="ip-badge emergency">
                        <span className="material-symbols-outlined">error</span>
                        EMERGENCY
                    </div>
                </div>

                <div className="ip-card-content">
                    <div className="ip-content-top">
                        <div className="ip-category">WATER SUPPLY</div>
                        <div className="ip-sla-block">
                            <span className="ip-sla-label">SLA COUNTDOWN</span>
                            <div className="ip-sla-time red">
                                <span className="material-symbols-outlined">timer</span>
                                28m 15s
                            </div>
                        </div>
                    </div>

                    <h3 className="ip-task-id">#CS-1024</h3>
                    <p className="ip-task-desc">
                        Main pipe burst reporting at Sector 4. Significant water loss observed near the main junction.
                    </p>

                    <div className="ip-actions">
                        <button className="ip-btn ip-btn-outline" onClick={() => {
                            useAppStore.getState().setSelectedTaskSessionId('#CS-1024');
                            useAppStore.getState().navigate('task-session');
                        }}>
                            <span className="material-symbols-outlined">visibility</span>
                            View Details
                        </button>
                        <button className="ip-btn ip-btn-solid" onClick={() => setShowUpdateStatus(true)}>
                            <span className="material-symbols-outlined">sync</span>
                            Update Status
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty State Footer */}
            <div className="ip-empty-footer">
                <div className="ip-check-circle">
                    <span className="material-symbols-outlined">check_circle</span>
                </div>
                <h4 className="ip-footer-text">No other active tasks</h4>
                <p className="ip-footer-subtext">Finish your current task to pick more.</p>
            </div>
        </div>
    );
};


const CompletedContent = () => (
    <div className="comp-container animate-fade-in">
        {/* Date Header */}
        <div className="comp-date-section">
            <h2 className="comp-today-date">Tuesday, Oct 24</h2>
            <p className="comp-success-msg">Tasks successfully completed and logged</p>
        </div>

        {/* Stats Summary Cards */}
        <div className="comp-stats-row">
            <div className="comp-stat-card">
                <span className="comp-stat-label">TOTAL COMPLETED</span>
                <div className="comp-stat-value-group">
                    <span className="comp-stat-value">4</span>
                    <span className="comp-dot green"></span>
                </div>
            </div>
            <div className="comp-stat-card">
                <span className="comp-stat-label">AVG TIME</span>
                <div className="comp-stat-value">1.4h</div>
            </div>
        </div>

        {/* Activity Section */}
        <div className="comp-section-title">ACTIVITY HISTORY</div>

        <div className="comp-history-list">
            {/* Task Card 1 */}
            <div className="comp-task-card verified">
                <div className="comp-card-top">
                    <span className="comp-task-id">#CS-29402</span>
                    <span className="comp-priority-tag">MEDIUM</span>
                </div>
                <h3 className="comp-task-title">Pothole Repair</h3>
                <div className="comp-loc-row">
                    <span className="material-symbols-outlined">location_on</span>
                    122 Oak Street, West District
                </div>
                <div className="comp-card-divider"></div>
                <div className="comp-card-footer">
                    <div className="comp-status verified">
                        <span className="material-symbols-outlined">check_circle</span>
                        VERIFIED
                    </div>
                    <div className="comp-time">Completed at 14:20</div>
                </div>
            </div>

            {/* Task Card 2 */}
            <div className="comp-task-card pending">
                <div className="comp-card-top">
                    <span className="comp-task-id">#CS-29388</span>
                    <span className="comp-priority-tag orange">HIGH</span>
                </div>
                <h3 className="comp-task-title">Street Light Maintenance</h3>
                <div className="comp-loc-row">
                    <span className="material-symbols-outlined">location_on</span>
                    Main Square, Central Plaza
                </div>
                <div className="comp-card-divider"></div>
                <div className="comp-card-footer">
                    <div className="comp-status pending">
                        <span className="material-symbols-outlined">schedule</span>
                        PENDING VERIFICATION
                    </div>
                    <div className="comp-time">Completed at 11:45</div>
                </div>
            </div>

            {/* Task Card 3 */}
            <div className="comp-task-card verified">
                <div className="comp-card-top">
                    <span className="comp-task-id">#CS-29312</span>
                    <span className="comp-priority-tag gray">LOW</span>
                </div>
                <h3 className="comp-task-title">Graffiti Removal</h3>
                <div className="comp-loc-row">
                    <span className="material-symbols-outlined">location_on</span>
                    Greenway Park Entrance
                </div>
                <div className="comp-card-divider"></div>
                <div className="comp-card-footer">
                    <div className="comp-status verified">
                        <span className="material-symbols-outlined">check_circle</span>
                        VERIFIED
                    </div>
                    <div className="comp-time">Completed at 09:15</div>
                </div>
            </div>
        </div>
    </div>
);

const MyTasksView = () => {
    const workerTasks = useAppStore(state => state.workerTasks);
    const workerCompletedTasks = useAppStore(state => state.workerCompletedTasks || []);
    const activeSubTab = useAppStore(state => state.workerDashboardSubTab);
    const setActiveSubTab = useAppStore(state => state.setWorkerDashboardSubTab);
    const selectedTaskId = useAppStore(state => state.selectedWorkerTaskId);
    const setSelectedTaskId = useAppStore(state => state.setSelectedWorkerTaskId);

    // DB-status-aware filtering
    const assignedTasks = workerTasks.filter(t => t.status === 'assigned');
    const inProgressTasks = workerTasks.filter(t => t.status === 'in_progress');
    // completed tasks come from workerCompletedTasks
    const completedTasks = workerCompletedTasks;

    const getHeaderTitle = () => {
        if (activeSubTab === 'assigned') return `Assigned Tasks (${assignedTasks.length})`;
        if (activeSubTab === 'in_progress') return `In Progress (${inProgressTasks.length})`;
        if (activeSubTab === 'completed') return `Completed Today (${completedTasks.length})`;
        return 'My Tasks';
    };

    const getActiveTasks = () => {
        if (activeSubTab === 'assigned') return assignedTasks;
        if (activeSubTab === 'in_progress') return inProgressTasks;
        if (activeSubTab === 'completed') return completedTasks;
        return [];
    };

    if (selectedTaskId) {
        return <TaskDetailView taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />;
    }

    return (
        <div className="wd-content-wrapper mt-wrapper animate-fade-in">
            <div className="mt-header-row">
                <button className="mt-icon-btn" style={{ color: '#3b82f6' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>arrow_back</span>
                </button>
                <h1 className="mt-title">{getHeaderTitle()}</h1>
                <button className="mt-icon-btn" style={{ color: '#475569' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                        {activeSubTab === 'completed' ? 'calendar_month' : 'tune'}
                    </span>
                </button>
            </div>

            <div className="mt-tabs-container">
                <button
                    className={`mt-tab ${activeSubTab === 'assigned' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('assigned')}
                >
                    Assigned ({assignedTasks.length})
                </button>
                <button
                    className={`mt-tab ${activeSubTab === 'in_progress' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('in_progress')}
                >
                    In Progress ({inProgressTasks.length})
                </button>
                <button
                    className={`mt-tab ${activeSubTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('completed')}
                >
                    Completed ({completedTasks.length})
                </button>
            </div>

            <div className="mt-list">
                {getActiveTasks().length > 0 ? (
                    getActiveTasks().map(task => (
                        <TaskCard key={task.id} task={task} variant="tasks" />
                    ))
                ) : (
                    <div className="mt-empty-state" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12 }}>
                            {activeSubTab === 'completed' ? 'task_alt' : 'assignment_late'}
                        </span>
                        <p>No {activeSubTab.replace('_', ' ')} tasks.</p>
                    </div>
                )}
            </div>

            {activeSubTab === 'assigned' && (
                <div className="mt-map-preview">
                    <button className="mt-map-btn">
                        <span className="material-symbols-outlined">map</span>
                        View On Map
                    </button>
                </div>
            )}
        </div>
    );
};

const WorkerPerformanceView = () => {
    const navigate = useAppStore(state => state.navigate);
    const unreadCount = useNotificationStore(state => state.unreadCount);
    const user = useAppStore(state => state.currentUser);
    const perf = useAppStore(state => state.getWorkerPerformance());

    if (!perf) return null;

    return (
        <div className="perf-container animate-fade-in">
            {/* Header */}
            <div className="perf-header">
                <div className="perf-profile-pic">
                    <img src={user?.profileImage || 'https://i.pravatar.cc/150'} alt="Profile" />
                </div>
                <h1 className="perf-title">My Performance</h1>
                <button className="perf-bell-btn" onClick={() => navigate('notifications')} style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined">notifications</span>
                    {unreadCount > 0 && <span className="unread-badge-wd">{unreadCount}</span>}
                </button>
            </div>

            <div className="perf-scroll-area">
                {/* Stats Grid */}
                <div className="perf-stats-grid">
                    <div className="perf-stat-card">
                        <div className="perf-stat-top">
                            <div className="perf-stat-icon blue">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <span className={`perf-stat-change ${perf.weekChange.startsWith('+') ? 'positive' : 'negative'}`}>
                                {perf.weekChange}
                            </span>
                        </div>
                        <p className="perf-stat-label">Tasks (Week)</p>
                        <h2 className="perf-stat-value">{perf.weekTasks}</h2>
                    </div>
                    <div className="perf-stat-card">
                        <div className="perf-stat-top">
                            <div className="perf-stat-icon purple">
                                <span className="material-symbols-outlined">calendar_month</span>
                            </div>
                            <span className={`perf-stat-change ${perf.monthChange.startsWith('+') ? 'positive' : 'negative'}`}>
                                {perf.monthChange}
                            </span>
                        </div>
                        <p className="perf-stat-label">Tasks (Month)</p>
                        <h2 className="perf-stat-value">{perf.monthTasks}</h2>
                    </div>
                    <div className="perf-stat-card">
                        <div className="perf-stat-top">
                            <div className="perf-stat-icon orange">
                                <span className="material-symbols-outlined">timer</span>
                            </div>
                            <span className="perf-stat-change positive">{perf.resChange}</span>
                        </div>
                        <p className="perf-stat-label">Avg Resolution</p>
                        <h2 className="perf-stat-value">{perf.avgResTime} <span className="perf-val-unit">Days</span></h2>
                    </div>
                    <div className="perf-stat-card">
                        <div className="perf-stat-top">
                            <div className="perf-stat-icon red">
                                <span className="material-symbols-outlined">priority_high</span>
                            </div>
                            <span className={`perf-stat-change ${perf.escChange.startsWith('-') ? 'positive' : 'negative'}`}>
                                {perf.escChange}
                            </span>
                        </div>
                        <p className="perf-stat-label">Escalations</p>
                        <h2 className="perf-stat-value">{perf.escalations}</h2>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="perf-info-banner">
                    <div className="perf-banner-icon">
                        <span className="material-symbols-outlined">auto_awesome</span>
                    </div>
                    <p className="perf-banner-text" dangerouslySetInnerHTML={{ __html: perf.insight }} />
                </div>

                {/* Weekly Task Completion Chart */}
                <div className="perf-card">
                    <div className="perf-card-header-flex">
                        <div>
                            <h3 className="perf-card-title">Weekly Task Completion</h3>
                            <p className="perf-card-subtitle">Activity trend over last 7 days</p>
                        </div>
                        <div className="perf-card-right">
                            <span className="perf-best-day-label">BEST DAY</span>
                            <span className="perf-best-day-value">{perf.bestDay}</span>
                        </div>
                    </div>

                    <div className="perf-chart-wrapper">
                        <svg viewBox="0 0 400 120" className="perf-chart-svg" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.2)" />
                                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                                </linearGradient>
                            </defs>
                            <path d={perf.chartFill} fill="url(#chartFill)" />
                            <path d={perf.chartPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <div className="perf-x-axis">
                            <span>M</span>
                            <span>T</span>
                            <span className={perf.bestDay === 'Wednesday' ? 'active' : ''}>W</span>
                            <span>T</span>
                            <span>F</span>
                            <span>S</span>
                            <span>S</span>
                        </div>
                    </div>
                </div>

                {/* Resolution Distribution */}
                <div className="perf-card">
                    <h3 className="perf-card-title mb-large">Resolution Distribution</h3>

                    {perf.distribution.map((item, idx) => (
                        <div key={idx} className="perf-bar-group">
                            <div className="perf-bar-labels">
                                <span className="perf-bar-label">{item.label}</span>
                                <span className="perf-bar-value">{item.value}</span>
                            </div>
                            <div className="perf-bar-track">
                                <div className={`perf-bar-fill ${item.color}`} style={{ width: item.width }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Escalation Records */}
                <div className="perf-card perf-card-last">
                    <div className="perf-card-header-flex">
                        <h3 className="perf-card-title">Escalation Records</h3>
                        <button className="perf-download-btn">
                            <span className="material-symbols-outlined">download</span>
                            CSV
                        </button>
                    </div>

                    <div className="perf-table-wrap">
                        <table className="perf-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>CATEGORY</th>
                                    <th className="text-right">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {perf.records.map((rec, idx) => (
                                    <tr key={idx}>
                                        <td className="perf-id-col">{rec.id}</td>
                                        <td>{rec.category}</td>
                                        <td className="text-right">
                                            <span className={`perf-badge ${rec.statusType}`}>{rec.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const WorkerProfileView = () => {
    const logout = useAppStore(state => state.logout);
    const setWorkerDashboardTab = useAppStore(state => state.setWorkerDashboardTab);
    const currentUser = useAppStore(state => state.currentUser);
    const updateUser = useAppStore(state => state.updateUser);
    const navigate = useAppStore(state => state.navigate);
    const unreadCount = useNotificationStore(state => state.unreadCount);

    const workerStatus = useAppStore(state => state.workerStatus);
    const setWorkerStatus = useAppStore(state => state.setWorkerStatus);
    const isEditing = useAppStore(state => state.isWorkerEditingProfile);
    const setIsEditing = useAppStore(state => state.setIsWorkerEditingProfile);
    const [tempProfile, setTempProfile] = useState({
        name: currentUser?.name || 'Ravi Sharma',
        phone: currentUser?.phone || '+91 98765 43210',
        email: currentUser?.email || 'ravi.sharma@municipality.gov',
        profileImage: currentUser?.profileImage || 'https://i.pravatar.cc/150'
    });

    // Sync tempProfile when entering editing mode
    React.useEffect(() => {
        if (isEditing) {
            setTempProfile({
                name: currentUser?.name || 'Ravi Sharma',
                phone: currentUser?.phone || '+91 98765 43210',
                email: currentUser?.email || 'ravi.sharma@municipality.gov',
                profileImage: currentUser?.profileImage || 'https://i.pravatar.cc/150'
            });
        }
    }, [isEditing, currentUser]);

    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [newPass, setNewPass] = useState('');

    const handleUpdateProfile = () => {
        updateUser({
            name: tempProfile.name,
            email: tempProfile.email,
            phone: tempProfile.phone,
            profileImage: tempProfile.profileImage
        });
        setIsEditing(false);
    };

    const handleAvatarChange = () => {
        const url = prompt("Enter new image URL:");
        if (url) {
            setTempProfile(prev => ({ ...prev, profileImage: url }));
        }
    };

    const handlePasswordChange = () => {
        if (newPass.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        alert('Password changed successfully!');
        setNewPass('');
        setIsChangePasswordOpen(false);
    };

    const getStatusColor = () => {
        switch (workerStatus) {
            case 'Available': return 'green';
            case 'Busy': return 'yellow';
            case 'Offline': return 'red';
            default: return 'green';
        }
    };

    return (
        <div className="prof-container animate-fade-in">
            {/* Header */}
            <div className="prof-header">
                <button className="prof-back-btn" onClick={() => setWorkerDashboardTab('HOME')}>
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="prof-title">My Profile</h1>
                <button className="prof-bell-btn" onClick={() => navigate('notifications')} style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined">notifications</span>
                    {unreadCount > 0 && <span className="unread-badge-wd">{unreadCount}</span>}
                </button>
            </div>

            <div className="prof-scroll-area">
                {/* Profile Card */}
                <div className="prof-card">
                    <div className="prof-avatar-wrapper">
                        <img src={isEditing ? tempProfile.profileImage : (currentUser?.profileImage || 'https://i.pravatar.cc/150')} alt="Profile" className="prof-avatar" />
                        {!isEditing && <span className={`prof-status-dot ${getStatusColor()}`}></span>}
                        {isEditing && (
                            <button
                                onClick={handleAvatarChange}
                                style={{ position: 'absolute', bottom: 0, right: 0, background: '#3b82f6', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>photo_camera</span>
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="prof-edit-form">
                            <input
                                type="text"
                                className="prof-edit-input"
                                value={tempProfile.name}
                                onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                                placeholder="Full Name"
                            />
                            <div className="prof-edit-field">
                                <span className="material-symbols-outlined">call</span>
                                <input
                                    type="text"
                                    className="prof-edit-input mini"
                                    value={tempProfile.phone}
                                    onChange={(e) => setTempProfile({ ...tempProfile, phone: e.target.value })}
                                />
                            </div>
                            <div className="prof-edit-field">
                                <span className="material-symbols-outlined">mail</span>
                                <input
                                    type="text"
                                    className="prof-edit-input mini"
                                    value={tempProfile.email}
                                    onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                                />
                            </div>
                            <div className="prof-edit-actions">
                                <button className="prof-save-btn" onClick={handleUpdateProfile}>Save</button>
                                <button className="prof-cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="prof-name">{currentUser?.name || tempProfile.name}</h2>
                            <p className="prof-dept">Public Works Department</p>
                            <p className="prof-worker-id">Worker ID: {currentUser?.id?.toUpperCase() || 'MW-7829'}</p>

                            <div className="prof-contact-info">
                                <span className="material-symbols-outlined">mail</span>
                                <span>{currentUser?.email || tempProfile.email}</span>
                            </div>
                            <div className="prof-contact-info mb-4">
                                <span className="material-symbols-outlined">call</span>
                                <span>{currentUser?.phone || tempProfile.phone}</span>
                            </div>

                            <button className="prof-edit-btn" onClick={() => setIsEditing(true)}>
                                <span className="material-symbols-outlined">edit</span>
                                Edit Profile
                            </button>
                        </>
                    )}
                </div>

                {/* Availability Section */}
                <h3 className="prof-section-title">AVAILABILITY STATUS</h3>
                <div className="prof-availability-toggle">
                    <button
                        className={`prof-toggle-btn ${workerStatus === 'Available' ? 'active' : ''}`}
                        onClick={() => setWorkerStatus('Available')}
                    >
                        <span className="prof-dot green"></span>
                        Available
                    </button>
                    <button
                        className={`prof-toggle-btn ${workerStatus === 'Busy' ? 'active' : ''}`}
                        onClick={() => setWorkerStatus('Busy')}
                    >
                        <span className="prof-dot yellow"></span>
                        Busy
                    </button>
                    <button
                        className={`prof-toggle-btn ${workerStatus === 'Offline' ? 'active' : ''}`}
                        onClick={() => setWorkerStatus('Offline')}
                    >
                        <span className="prof-dot red"></span>
                        Offline
                    </button>
                </div>
                <p className="prof-helper-text">Visible to dispatchers and team leads.</p>

                {/* Account Security Card */}
                <div className="prof-security-card">
                    <div className="prof-card-header">
                        <div className="prof-shield-icon">
                            <span className="material-symbols-outlined">security_update_good</span>
                        </div>
                        <h3 className="prof-card-title">Account Security</h3>
                    </div>

                    <button className="prof-list-item" onClick={() => setIsChangePasswordOpen(!isChangePasswordOpen)}>
                        <span className="prof-item-label">Change Password</span>
                        <span className={`material-symbols-outlined prof-item-icon ${isChangePasswordOpen ? 'rotated' : ''}`}>chevron_right</span>
                    </button>

                    {isChangePasswordOpen && (
                        <div className="prof-password-form animate-slide-down">
                            <input
                                type="password"
                                className="prof-edit-input no-margin"
                                placeholder="New Password"
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                            />
                            <button className="prof-update-pass-btn" onClick={handlePasswordChange}>Update Password</button>
                        </div>
                    )}

                    <div className="prof-list-item-toggle">
                        <div className="prof-item-text-group">
                            <span className="prof-item-label">Two-Factor Auth</span>
                            <span className="prof-item-desc">Secure your account</span>
                        </div>
                        <div className="prof-switch active">
                            <div className="prof-switch-thumb"></div>
                        </div>
                    </div>

                    <div className="prof-divider"></div>

                    <div className="prof-metadata">
                        <span className="prof-meta-label">METADATA</span>
                        <span className="prof-meta-value">Last Login: Oct 24, 2023 at 08:45 AM</span>
                    </div>
                </div>

                {/* Log Out Button */}
                <button className="prof-logout-btn" onClick={() => logout()}>
                    <span className="material-symbols-outlined">logout</span>
                    Log Out
                </button>
            </div>
        </div>
    );
};

const WorkerDashboardScreen = ({ variant = 'mobile' }) => {
    const isMobile = variant === 'mobile';
    const user = useAppStore(state => state.currentUser);
    const logout = useAppStore(state => state.logout);
    const setWorkerDashboardTab = useAppStore(state => state.setWorkerDashboardTab);
    const activeTab = useAppStore(state => state.workerDashboardTab);
    const fetchAppData = useAppStore(state => state.fetchAppData);

    // Load worker tasks from DB on mount
    useEffect(() => {
        fetchAppData();
    }, []);

    return (
        <div className={`worker-dashboard-container ${!isMobile ? 'worker-dashboard-desktop' : ''}`}>

            {activeTab === 'HOME' && <DashboardHome user={user} />}
            {activeTab === 'TASKS' && <MyTasksView />}
            {activeTab === 'PERFORMANCE' && <WorkerPerformanceView />}
            {activeTab === 'PROFILE' && <WorkerProfileView />}

            {/* Bottom Nav */}
            <nav className={`wd-bottom-nav ${isMobile ? 'wd-bottom-nav-mobile' : ''}`}>
                <button
                    className={`wd-nav-item ${activeTab === 'HOME' ? 'active' : ''}`}
                    onClick={() => setWorkerDashboardTab('HOME')}
                >
                    <span className="material-symbols-outlined">home</span>
                    <span className="wd-nav-label">HOME</span>
                </button>
                <button
                    className={`wd-nav-item ${activeTab === 'TASKS' ? 'active' : ''}`}
                    onClick={() => setWorkerDashboardTab('TASKS')}
                >
                    <span className="material-symbols-outlined">list_alt</span>
                    <span className="wd-nav-label">TASKS</span>
                </button>
                <button
                    className={`wd-nav-item ${activeTab === 'PERFORMANCE' ? 'active' : ''}`}
                    onClick={() => setWorkerDashboardTab('PERFORMANCE')}
                >
                    <span className="material-symbols-outlined">bar_chart</span>
                    <span className="wd-nav-label">PERFORMANCE</span>
                </button>
                <button
                    className={`wd-nav-item ${activeTab === 'PROFILE' ? 'active' : ''}`}
                    onClick={() => setWorkerDashboardTab('PROFILE')}
                >
                    <span className="material-symbols-outlined">person</span>
                    <span className="wd-nav-label">PROFILE</span>
                </button>
            </nav>
        </div>
    );
};

export default WorkerDashboardScreen;
