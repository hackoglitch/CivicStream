import React, { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import './OfficialDashboardScreen.css'; // inherit dashboard styles

/**
 * UnifiedIssueDetailsModal
 * Reads from the shared `issues` array (complaint records from DB).
 * All actions (assign, verify, reject, escalate) call real API via store.
 */
export const UnifiedIssueDetailsModal = ({ taskId, onClose }) => {
    const issues = useAppStore(state => state.issues);
    const workerAccounts = useAppStore(state => state.workerAccounts || []);
    const assignTaskToWorker = useAppStore(state => state.assignTaskToWorker);
    const verifyTask = useAppStore(state => state.verifyTask);
    const rejectTask = useAppStore(state => state.rejectTask);
    const escalateTask = useAppStore(state => state.escalateTask);
    const fetchAppData = useAppStore(state => state.fetchAppData);

    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const selectedWorkerId = useAppStore(state => state.officialSelectedWorkerAssignmentId);
    const setSelectedWorkerId = useAppStore(state => state.setOfficialSelectedWorkerAssignmentId);
    const selectedPriority = useAppStore(state => state.officialSelectedPriority);
    const setSelectedPriority = useAppStore(state => state.setOfficialSelectedPriority);
    const [loading, setLoading] = useState(false);

    // Find from shared issues array
    const task = issues.find(t => t.id === taskId);
    if (!task) return null;

    const handleAssign = async () => {
        if (!selectedWorkerId) return alert('Select a worker first');
        setLoading(true);
        await assignTaskToWorker(task.id, selectedWorkerId, selectedPriority);
        await fetchAppData();
        setLoading(false);
        onClose();
    };

    const handleEscalate = async () => {
        setLoading(true);
        await escalateTask(task.id, 'Escalated by official');
        setLoading(false);
        alert('Task has been escalated.');
    };

    const handleVerify = async () => {
        setLoading(true);
        await verifyTask(task.id);
        await fetchAppData();
        setLoading(false);
        onClose();
    };

    const handleReject = async () => {
        if (!rejectReason) return alert('Rejection reason required');
        setLoading(true);
        await rejectTask(task.id, rejectReason);
        await fetchAppData();
        setLoading(false);
        onClose();
    };

    // Status display label
    const statusLabel = {
        pending: 'Pending',
        assigned: 'Assigned',
        in_progress: 'In Progress',
        completed: 'Completed',
        verified: 'Verified'
    }[task.status] || task.status;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f7f9fa', overflowY: 'auto' }} className="animate-fade-in no-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', position: 'sticky', top: 0, background: '#f7f9fa', zIndex: 10, borderBottom: '1px solid #e2e8f0' }}>
                <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>arrow_back</span>
                </button>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Issue Details</div>
                <div style={{ width: 28 }}></div>
            </div>

            {/* Issue Info */}
            <div className="od-card" style={{ margin: '16px', marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{task.id}</h3>
                    <span className={`od-tag ${task.status === 'verified' ? 'green' : task.status === 'completed' ? 'blue' : task.status === 'in_progress' ? 'yellow' : 'orange'}`}>
                        {statusLabel}
                    </span>
                </div>
                {task.escalation_flag && (
                    <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined">warning</span> ESCALATED
                    </div>
                )}
                <h4 style={{ margin: '12px 0 4px', fontSize: '16px' }}>{task.title}</h4>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.5, fontSize: '14px' }}>{task.description}</p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', color: '#64748b', fontSize: '14px', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
                    {task.location}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', color: '#64748b', fontSize: '13px', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                    Reported by: {task.author?.name || 'Unknown'}
                </div>
            </div>

            {/* Worker Assigned */}
            <div className="od-card" style={{ margin: '12px 16px 0' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Worker Assigned
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ padding: '8px', background: '#e2e8f0', borderRadius: '50%' }}>person</span>
                    <span style={{ fontWeight: 600 }}>
                        {task.assigned_worker_id ? (task.workerName || task.assigned_worker_id) : 'Unassigned'}
                    </span>
                </div>
            </div>

            {/* Actions Panel */}
            <div className="od-card" style={{ margin: '12px 16px 24px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Actions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* PENDING → assign */}
                    {task.status === 'pending' && (
                        <>
                            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>SELECT WORKER</label>
                                <select
                                    value={selectedWorkerId}
                                    onChange={e => setSelectedWorkerId(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '8px', fontFamily: 'inherit' }}
                                >
                                    <option value="">Select a worker...</option>
                                    <option value="worker_01">Ravi S. (Sanitation)</option>
                                    <option value="worker_02">David Miller (Roads)</option>
                                </select>

                                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>SET PRIORITY</label>
                                <select
                                    value={selectedPriority}
                                    onChange={e => setSelectedPriority(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit' }}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="high">High Priority</option>
                                    <option value="emergency">Emergency (Critical)</option>
                                </select>
                            </div>
                            <button className="od-btn primary" onClick={handleAssign} disabled={loading} style={{ marginTop: '12px' }}>
                                {loading ? 'Assigning...' : 'Confirm Assignment'}
                            </button>
                        </>
                    )}

                    {/* ASSIGNED → escalate / reassign */}
                    {task.status === 'assigned' && (
                        <>
                            <button className="od-btn" style={{ background: '#f1f5f9', color: '#334155' }}>Reassign Worker</button>
                            <button className="od-btn danger" onClick={handleEscalate} disabled={loading}>
                                {loading ? 'Escalating...' : 'Escalate Task'}
                            </button>
                        </>
                    )}

                    {/* IN_PROGRESS → escalate */}
                    {task.status === 'in_progress' && (
                        <button className="od-btn danger" onClick={handleEscalate} disabled={loading}>
                            {loading ? 'Escalating...' : 'Escalate Task'}
                        </button>
                    )}

                    {/* COMPLETED → verify or reject */}
                    {task.status === 'completed' && !showRejectForm && (
                        <>
                            <button className="od-btn primary" onClick={handleVerify} disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify & Close'}
                            </button>
                            <button className="od-btn danger" onClick={() => setShowRejectForm(true)}>
                                Send Back to Worker
                            </button>
                        </>
                    )}
                    {task.status === 'completed' && showRejectForm && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <textarea
                                placeholder="Rejection reason required..."
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit' }}
                                rows={3}
                            />
                            <button className="od-btn danger" onClick={handleReject} disabled={loading}>
                                {loading ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                            <button className="od-btn" style={{ background: '#f1f5f9', color: '#334155' }} onClick={() => setShowRejectForm(false)}>
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* VERIFIED → closed */}
                    {task.status === 'verified' && (
                        <div style={{ padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined">check_circle</span>
                            Task has been verified and closed.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * TaskListView
 * Generic list for official monitoring pages.
 * Reads from shared `issues` (complaints from DB) filtered by filterFn.
 */
export const TaskListView = ({ title, filterFn, onOpenTask, onBack }) => {
    const issues = useAppStore(state => state.issues);
    const tasks = issues.filter(filterFn);

    const statusLabel = (status) => ({
        pending: 'Pending',
        assigned: 'Assigned',
        in_progress: 'In Progress',
        completed: 'Completed',
        verified: 'Verified'
    }[status] || status);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f7f9fa', overflowY: 'auto' }} className="animate-fade-in no-scrollbar">
            <div className="od-header" style={{ position: 'sticky', top: 0, background: '#f7f9fa', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
                    </button>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{title}</h2>
                </div>
                <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>{tasks.length} total</div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>inbox</span>
                        No records found
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="od-task active" style={{ padding: '16px' }}>
                            <div className="od-task-top" style={{ marginBottom: '12px' }}>
                                <span className={`od-tag ${task.priority === 'emergency' ? 'red' : task.status === 'verified' ? 'green' : 'blue'}`}>
                                    {statusLabel(task.status)}
                                </span>
                                {task.escalation_flag && (
                                    <span className="od-tag red" style={{ marginLeft: 8 }}>ESCALATED</span>
                                )}
                            </div>
                            <h3 className="od-task-id" style={{ fontSize: '16px', margin: '0 0 4px 0' }}>{task.id}</h3>
                            <p style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>{task.title}</p>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {task.description}
                            </p>
                            {task.assigned_worker_id && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
                                    {task.workerName || task.assigned_worker_id}
                                </div>
                            )}
                            <button
                                className="od-btn outline"
                                style={{ background: '#f1f5f9', color: '#3b82f6', padding: '10px' }}
                                onClick={() => onOpenTask(task.id)}
                            >
                                View Details
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
