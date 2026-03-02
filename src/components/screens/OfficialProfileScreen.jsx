import React, { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import './OfficialProfileScreen.css';

const OfficialProfileScreen = ({ onBack }) => {
    const user = useAppStore(state => state.currentUser || state.user);
    const updateUser = useAppStore(state => state.updateUser);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: user?.fullName || user?.name || 'Officer Sarah Johnson',
        dept: 'Department of Urban Development',
        id: 'GV-9421',
        email: user?.email || 'sarah.j@civic.gov',
        phone: user?.phone || '+1 (555) 012-3412'
    });

    // Notification Settings State
    const [notifications, setNotifications] = useState({
        assignments: true,
        escalations: true,
        updates: false
    });

    const toggleNotification = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        updateUser({
            fullName: formData.name,
            name: formData.name,
            email: formData.email,
            phone: formData.phone
        });

        setIsSaving(false);
        setIsEditing(false);
    };

    const renderMetric = (label, value, trend, icon, color) => (
        <div className="ops-metric-card">
            <div className="ops-metric-header">
                <div className={`ops-metric-icon ${color}`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <span className={`ops-metric-trend ${trend.startsWith('+') ? 'ops-trend-up' : trend.startsWith('-') ? 'ops-trend-down' : 'ops-trend-neutral'}`}>
                    {trend}
                </span>
            </div>
            <div className="ops-metric-label">{label}</div>
            <div className="ops-metric-value">{value}</div>
        </div>
    );

    const renderWorkload = (label, value, color) => (
        <div className={`ops-workload-card ${color}`}>
            <div className="ops-workload-val">{value}</div>
            <div className="ops-workload-label">{label}</div>
        </div>
    );

    const renderActivity = (title, desc, time, color) => (
        <div className="ops-activity-item">
            <div className="ops-activity-indicator">
                <div className="ops-indicator-dot" style={{ backgroundColor: color }}></div>
                <div className="ops-indicator-line"></div>
            </div>
            <div className="ops-activity-content">
                <div className="ops-activity-top">
                    <span className="ops-activity-title">{title}</span>
                    <span className="ops-activity-time">{time}</span>
                </div>
                <div className="ops-activity-desc">{desc}</div>
            </div>
        </div>
    );

    const renderSetting = (icon, label, key) => (
        <div className="ops-setting-item">
            <div className="ops-setting-left">
                <span className="material-symbols-outlined ops-setting-icon">{icon}</span>
                <span className="ops-setting-label">{label}</span>
            </div>
            <div
                className={`ops-switch ${notifications[key] ? 'active' : ''}`}
                onClick={() => toggleNotification(key)}
            >
                <div className="ops-switch-knob"></div>
            </div>
        </div>
    );

    return (
        <div className="official-profile-container animate-fade-in no-scrollbar">
            {/* Header */}
            <header className="ops-header">
                <button className="ops-icon-btn" onClick={onBack}>
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="ops-header-title">Official Profile</h1>
                <button className="ops-icon-btn">
                    <span className="material-symbols-outlined">notifications</span>
                </button>
            </header>

            <div className="ops-centered-content">
                {/* Profile Hero Card */}
                <div className="ops-hero-card">
                    <div className="ops-hero">
                        <div className="ops-avatar-wrapper">
                            <img
                                src={user?.profileImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"}
                                alt="Profile"
                                className="ops-main-avatar"
                            />
                            <div className="ops-status-dot"></div>
                        </div>

                        {!isEditing ? (
                            <>
                                <div className="ops-name-container">
                                    <h2 className="ops-name">{formData.name}</h2>
                                    <span className="ops-official-badge">Official</span>
                                </div>
                                <p className="ops-dept">{formData.dept}</p>
                                <div className="ops-id-container">
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>badge</span>
                                    {formData.id}
                                </div>
                                <div className="ops-contact-row">
                                    <span className="material-symbols-outlined">mail</span>
                                    <span>{formData.email}</span>
                                </div>
                                <div className="ops-contact-row" style={{ marginTop: 4 }}>
                                    <span className="material-symbols-outlined">call</span>
                                    <span>{formData.phone}</span>
                                </div>
                                <button className="ops-edit-btn" onClick={() => setIsEditing(true)} style={{ marginTop: 24 }}>
                                    <span className="material-symbols-outlined">edit</span>
                                    Edit Public Profile
                                </button>
                            </>
                        ) : (
                            <div className="ops-edit-form animate-slide-up">
                                <div className="ops-input-group">
                                    <label className="ops-input-label">Full Name</label>
                                    <input
                                        className="ops-input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div className="ops-input-group">
                                    <label className="ops-input-label">Department</label>
                                    <input
                                        className="ops-input"
                                        value={formData.dept}
                                        onChange={e => setFormData({ ...formData, dept: e.target.value })}
                                        placeholder="Enter department"
                                    />
                                </div>
                                <div className="ops-input-group">
                                    <label className="ops-input-label">Official ID</label>
                                    <input
                                        className="ops-input"
                                        value={formData.id}
                                        onChange={e => setFormData({ ...formData, id: e.target.value })}
                                        placeholder="Enter ID"
                                    />
                                </div>
                                <div className="ops-edit-actions">
                                    <button className="ops-btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                                    <button className={`ops-btn-primary ${isSaving ? 'saving' : ''}`} onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!isEditing && (
                    <>
                        {/* Performance Metrics */}
                        <section className="ops-section">
                            <div className="ops-section-header">
                                <h3 className="ops-section-title">Performance Metrics</h3>
                                <span className="ops-section-link">Last 30 Days</span>
                            </div>
                            <div className="ops-metrics-grid">
                                {renderMetric('Complaints Reviewed', '1,240', '+12%', 'forum', 'blue')}
                                {renderMetric('Total Verified', '850', '+5%', 'verified', 'green')}
                                {renderMetric('Escalations Handled', '45', '-2%', 'warning', 'orange')}
                                {renderMetric('Response Time', '4.2h', 'AVG', 'schedule', 'purple')}
                            </div>
                        </section>

                        {/* Current Workload */}
                        <section className="ops-section">
                            <h3 className="ops-section-title" style={{ marginBottom: 16 }}>Current Workload</h3>
                            <div className="ops-workload-row">
                                {renderWorkload('Pending', '12', 'yellow')}
                                {renderWorkload('In Progress', '08', 'blue')}
                                {renderWorkload('Completed', '34', 'green')}
                                {renderWorkload('Escalated', '03', 'red')}
                            </div>
                        </section>

                        {/* Recent Activity */}
                        <section className="ops-section">
                            <div className="ops-section-header">
                                <h3 className="ops-section-title">Recent Activity</h3>
                                <button className="ops-section-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View All</button>
                            </div>
                            <div className="ops-activity-list">
                                {renderActivity('Verified Issue #9822', 'Pothole repair request at Central Ave approved for maintenance.', '14:20 PM', '#22c55e')}
                                {renderActivity('Assigned Case #8741', 'Water leakage reported in District 4 assigned to inspection team.', '11:05 AM', '#3b82f6')}
                                {renderActivity('Escalated Ticket #1029', 'Complex zoning permit request moved to Senior Supervisor.', '09:45 AM', '#f97316')}
                            </div>
                        </section>

                        {/* Notification Settings */}
                        <section className="ops-section">
                            <h3 className="ops-section-title" style={{ marginBottom: 16 }}>Notification Settings</h3>
                            <div className="ops-card">
                                {renderSetting('assignment_ind', 'New Assignments', 'assignments')}
                                {renderSetting('warning', 'Escalation Alerts', 'escalations')}
                                {renderSetting('notifications_active', 'Verification Updates', 'updates')}
                            </div>
                        </section>

                        {/* Logout Section */}
                        <div style={{ padding: '0 20px 40px', display: 'flex', justifyContent: 'center' }}>
                            <button className="ops-logout-btn" onClick={() => window.location.reload()}>
                                <span className="material-symbols-outlined">logout</span>
                                Log Out
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default OfficialProfileScreen;
