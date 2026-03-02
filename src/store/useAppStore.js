import { api } from '../services/api.js';
import { create } from 'zustand';

// ─── STATUS HELPERS ────────────────────────────────────────────────────────────
// DB status (lowercase) → UI-friendly label
export const STATUS_LABEL = {
    pending: 'Pending',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    verified: 'Verified'
};

// Map a DB complaint to a rich worker task object
function toWorkerTask(c) {
    return {
        id: c.id,
        dbId: c.id,
        citizen_id: c.citizen_id,
        assigned_worker_id: c.assigned_worker_id,
        category: c.category || 'General',
        icon: categoryIcon(c.category),
        priority: (c.priority || 'normal').toUpperCase(),
        status: c.status,          // raw DB status: 'assigned' | 'in_progress' | 'completed'
        escalation_flag: c.escalation_flag || false,
        location: c.location || '',
        description: c.description || '',
        title: c.title || '',
        sla: c.sla || '—',
        isEmergency: c.priority === 'emergency',
        createdAt: c.createdAt,
        completedAt: c.completedAt,
        workerName: c.workerName
    };
}

function categoryIcon(category) {
    const icons = {
        'Water Supply': 'water_drop', 'Water Leakage': 'water_drop',
        'Street Lighting': 'lightbulb', 'Electricity': 'bolt',
        'Sanitation': 'delete', 'Waste': 'delete',
        'Road': 'road', 'Power Fault': 'bolt'
    };
    return icons[category] || 'build';
}

// ─── PERFORMANCE MOCK DATA ──────────────────────────────────────────────────
const WORKER_PERF_DATA = {
    worker_01: {
        weekTasks: 18, weekChange: '+4',
        monthTasks: 72, monthChange: '+10%',
        avgResTime: '2.3', resChange: '-0.5d',
        escalations: 3, escChange: '-1',
        chartPath: "M 0 100 Q 20 100 30 70 Q 50 10 70 20 Q 90 45 120 45 Q 150 45 170 80 Q 190 50 220 50 Q 250 50 280 100 Q 310 100 340 40 Q 360 40 370 70 Q 380 90 400 30",
        chartFill: "M 0 100 Q 20 100 30 70 Q 50 10 70 20 Q 90 45 120 45 Q 150 45 170 80 Q 190 50 220 50 Q 250 50 280 100 Q 310 100 340 40 Q 360 40 370 70 Q 380 90 400 30 L 400 120 L 0 120 Z",
        distribution: [
            { label: 'Under 24h', value: '42 cases', width: '65%', color: 'green' },
            { label: '1 - 3 Days', value: '21 cases', width: '35%', color: 'blue' },
            { label: '3 - 7 Days', value: '6 cases', width: '15%', color: 'orange' },
            { label: 'Over 7 Days', value: '3 cases', width: '8%', color: 'red' },
        ],
        records: [
            { id: '#4492', category: 'Road Hazard', status: 'Pending Review', statusType: 'pending' },
            { id: '#3821', category: 'Sanitation', status: 'Escalated', statusType: 'escalated' },
            { id: '#2109', category: 'Public Lighting', status: 'Resolved', statusType: 'resolved' },
        ],
        bestDay: 'Wednesday',
        insight: 'You are resolving issues <span class="highlight">15% faster</span> than the department average.'
    },
    worker_02: {
        weekTasks: 12, weekChange: '+2',
        monthTasks: 58, monthChange: '+5%',
        avgResTime: '3.1', resChange: '-0.2d',
        escalations: 5, escChange: '+1',
        chartPath: "M0 80 Q 40 80 60 90 Q 80 100 120 70 Q 150 20 180 50 Q 220 80 250 40 Q 300 30 350 90 Q 380 95 400 60",
        chartFill: "M0 80 Q 40 80 60 90 Q 80 100 120 70 Q 150 20 180 50 Q 220 80 250 40 Q 300 30 350 90 Q 380 95 400 60 L 400 120 L 0 120 Z",
        distribution: [
            { label: 'Under 24h', value: '15 cases', width: '30%', color: 'green' },
            { label: '1 - 3 Days', value: '32 cases', width: '60%', color: 'blue' },
            { label: '3 - 7 Days', value: '12 cases', width: '25%', color: 'orange' },
            { label: 'Over 7 Days', value: '4 cases', width: '10%', color: 'red' },
        ],
        records: [
            { id: '#1003', category: 'Electricity', status: 'Resolved', statusType: 'resolved' },
            { id: '#ISSUE1005', category: 'Road Crack', status: 'Pending Review', statusType: 'pending' },
            { id: '#ISSUE1004', category: 'Pipe Burst', status: 'In Progress', statusType: 'resovled' },
        ],
        bestDay: 'Monday',
        insight: 'Your <span class="highlight">first-time fix rate</span> is exceptional this month. Great job!'
    }
};

// ─── STORE ─────────────────────────────────────────────────────────────────────
const useAppStore = create((set, get) => ({
    // ── Navigation ──────────────────────────────────────────────────────────
    currentRoute: 'login',
    selectedIssueId: null,
    currentAiIssueId: null,
    aiInsightsCache: {},

    navigate: (route) => set({ currentRoute: route }),
    setSelectedIssueId: (id) => set({ selectedIssueId: id }),
    setAiIssueId: (id) => set({ currentAiIssueId: id }),
    cacheAiResult: (id, result) => set((state) => ({
        aiInsightsCache: { ...state.aiInsightsCache, [id]: result }
    })),

    // ── Auth ────────────────────────────────────────────────────────────────
    isAuthenticated: false,
    currentUser: null,

    login: async (email, password) => {
        try {
            const data = await api.login(email, password);
            if (data.success) {
                const user = { id: data.id, role: data.role, email, name: data.name, profileImage: data.profileImage };
                set({ isAuthenticated: true, currentUser: user });
                // Sync the legacy 'user' object to match current user
                set((state) => ({
                    user: {
                        ...state.user,
                        id: user.id,
                        role: user.role,
                        fullName: user.name,
                        username: user.name
                    }
                }));
                return { success: true, role: data.role };
            }
        } catch (e) { console.error(e); }
        return { success: false };
    },

    logout: () => set({
        isAuthenticated: false,
        currentUser: null,
        currentRoute: 'login',
        issues: [],
        workerTasks: [],
        workerCompletedTasks: []
    }),

    // ── Data Fetching (role-aware, reads from shared complaints table) ───────
    fetchAppData: async () => {
        try {
            const state = get();
            const user = state.currentUser || state.user;
            if (!user) return;

            if (user.role === 'worker') {
                const [active, completed] = await Promise.all([
                    api.fetchWorkerTasks(user.id),
                    api.fetchWorkerCompletedTasks(user.id)
                ]);
                set({
                    workerTasks: active.map(toWorkerTask),
                    workerCompletedTasks: completed.map(toWorkerTask)
                });

            } else if (user.role === 'official') {
                const all = await api.fetchOfficialAll();
                set({ issues: all });

            } else {
                // citizen – fetch all for home feed
                const all = await api.fetchCitizenComplaints();
                set({ issues: all.map(i => ({ ...i, history: i.history || [] })) });
            }
        } catch (e) { console.error('fetchAppData failed:', e); }
    },

    // ── Issues (shared complaints – used by Citizen home feed + Official) ───
    issues: [],

    addIssue: async (newIssue) => {
        const state = get();
        const user = state.currentUser || state.user;
        // Optimistic add to local state immediately
        const optimistic = {
            ...newIssue,
            id: `#ISSUE${Date.now()}`,
            citizen_id: user.id,
            userId: user.id,
            username: user.username,
            author: { name: user.fullName || user.username || user.name },
            profileImage: user.profileImage,
            status: 'pending',
            date: 'Just now',
            createdAt: new Date().toISOString(),
            supportCount: 0,
            comments: [],
            history: [
                { stage: 'Reported', status: 'completed', date: new Date().toLocaleDateString() },
                { stage: 'Assigned', status: 'upcoming', date: '' },
                { stage: 'In Progress', status: 'upcoming', date: '' },
                { stage: 'Verified', status: 'upcoming', date: '' }
            ]
        };
        set((state) => ({ issues: [optimistic, ...state.issues] }));

        // Persist to DB
        const created = await api.createComplaint({
            citizen_id: user.id,
            title: newIssue.title,
            category: newIssue.category,
            description: newIssue.description,
            location: newIssue.location,
            image_url: newIssue.image,
            coordinates: newIssue.coordinates,
            priority: (newIssue.priority || 'normal').toLowerCase()
        });

        if (created) {
            // Replace optimistic entry with real DB record
            set((state) => ({
                issues: state.issues.map(i => i.id === optimistic.id ? created : i)
            }));
        }
    },

    deleteIssue: (id) => set((state) => ({
        issues: state.issues.filter(issue => issue.id !== id)
    })),

    // ── Official Actions (all go straight to DB via API) ────────────────────
    assignTaskToWorker: async (complaintId, workerId, priority) => {
        const state = get();
        const official_id = state.currentUser?.id || 'off_01';
        const result = await api.assignTask(complaintId, workerId, official_id, priority);
        if (result) {
            // Update local issues list with new status
            set((state) => ({
                issues: state.issues.map(i => i.id === complaintId ? result : i)
            }));
        }
        return result;
    },

    verifyTask: async (complaintId) => {
        const state = get();
        const official_id = state.currentUser?.id || 'off_01';
        const result = await api.verifyTask(complaintId, official_id);
        if (result) {
            set((state) => ({
                issues: state.issues.map(i => i.id === complaintId ? result : i)
            }));
        }
        return result;
    },

    rejectTask: async (complaintId, reason) => {
        const state = get();
        const official_id = state.currentUser?.id || 'off_01';
        const result = await api.rejectTask(complaintId, official_id, reason);
        if (result) {
            set((state) => ({
                issues: state.issues.map(i => i.id === complaintId ? result : i)
            }));
        }
        return result;
    },

    escalateTask: async (complaintId, reason) => {
        const state = get();
        const official_id = state.currentUser?.id || 'off_01';
        const result = await api.escalateTask(complaintId, official_id, reason);
        if (result) {
            set((state) => ({
                issues: state.issues.map(i => i.id === complaintId ? result : i)
            }));
        }
        return result;
    },

    // updateIssueStatus: kept for any legacy calls
    updateIssueStatus: async (id, newStatus) => {
        const state = get();
        if (newStatus === 'verified') await state.verifyTask(id);
        else if (newStatus === 'in_progress') await state.rejectTask(id, '');
    },

    // ── Worker State ────────────────────────────────────────────────────────
    workerTasks: [],             // active: assigned + in_progress
    workerCompletedTasks: [],    // completed + verified
    workerDashboardTab: 'HOME',
    workerDashboardSubTab: 'Assigned',
    selectedWorkerTaskId: null,
    showWorkerUpdateStatus: false,
    selectedTaskSessionId: null,
    taskSessionViewMode: 'full',

    setWorkerDashboardTab: (tab) => set({ workerDashboardTab: tab }),
    setWorkerDashboardSubTab: (subTab) => set({ workerDashboardSubTab: subTab }),
    setSelectedWorkerTaskId: (id) => set({ selectedWorkerTaskId: id }),
    setShowWorkerUpdateStatus: (val) => set({ showWorkerUpdateStatus: val }),
    setSelectedTaskSessionId: (id) => set({ selectedTaskSessionId: id }),
    setTaskSessionViewMode: (mode) => set({ taskSessionViewMode: mode }),

    getWorkerPerformance: () => {
        const user = get().currentUser || get().user;
        if (!user || user.role !== 'worker') return null;
        return WORKER_PERF_DATA[user.id] || WORKER_PERF_DATA['worker_01'];
    },

    // ── Official Navigation State ───────────────────────────────────────────
    officialActiveTab: 'Control',
    officialCurrentView: 'dashboard',
    officialSelectedTaskId: null,
    officialSelectedWorkerProfileId: null,

    setOfficialActiveTab: (tab) => set({ officialActiveTab: tab }),
    setOfficialCurrentView: (view) => set({ officialCurrentView: view }),
    setOfficialSelectedTaskId: (id) => set({ officialSelectedTaskId: id }),
    setOfficialSelectedWorkerProfileId: (id) => set({ officialSelectedWorkerProfileId: id }),

    officialSelectedWorkerAssignmentId: '',
    officialSelectedPriority: 'normal',
    setOfficialSelectedWorkerAssignmentId: (id) => set({ officialSelectedWorkerAssignmentId: id }),
    setOfficialSelectedPriority: (priority) => set({ officialSelectedPriority: priority }),

    // ── Worker UI Sync State ───────────────────────────────────────────────
    workerStatus: 'Available',
    isWorkerEditingProfile: false,
    setWorkerStatus: (status) => set({ workerStatus: status }),
    setIsWorkerEditingProfile: (val) => set({ isWorkerEditingProfile: val }),

    // Worker: Start Task (assigned → in_progress)
    workerStartTask: async (complaintId) => {
        const state = get();
        const worker_id = state.currentUser?.id || state.user?.id;
        if (!worker_id) return;

        // Validate local status first
        const task = state.workerTasks.find(t => t.id === complaintId);
        if (!task || task.status !== 'assigned') {
            console.warn('Cannot start: task not in assigned state');
            return;
        }

        const result = await api.startTask(complaintId, worker_id);
        if (result) {
            set((state) => ({
                workerTasks: state.workerTasks.map(t =>
                    t.id === complaintId ? { ...t, status: 'in_progress' } : t
                )
            }));
        }
        return result;
    },

    // Worker: Complete Task (in_progress → completed)
    workerCompleteTask: async (complaintId, notes) => {
        const state = get();
        const worker_id = state.currentUser?.id || state.user?.id;
        if (!worker_id) return;

        const task = state.workerTasks.find(t => t.id === complaintId);
        if (!task || task.status !== 'in_progress') {
            console.warn('Cannot complete: task not in_progress');
            return;
        }

        const result = await api.completeTask(complaintId, worker_id, notes);
        if (result) {
            // Move task from active list to completed list
            set((state) => ({
                workerTasks: state.workerTasks.filter(t => t.id !== complaintId),
                workerCompletedTasks: [toWorkerTask(result), ...state.workerCompletedTasks]
            }));
        }
        return result;
    },

    // Legacy shim used by some components
    updateWorkerTaskStatus: async (id, status) => {
        const state = get();
        if (status === 'Assigned') return; // view task → no DB change needed
        if (status === 'In Progress' || status === 'in_progress') {
            await state.workerStartTask(id);
        } else if (status === 'Completed' || status === 'completed') {
            await state.workerCompleteTask(id, '');
        }
    },

    // Legacy shim – local-only update (for UI only, avoid for real status changes)
    updateWorkerTask: (id, updates) => set((state) => ({
        workerTasks: state.workerTasks.map(t => t.id === id ? { ...t, ...updates } : t)
    })),

    addWorkerTask: (task) => set((state) => {
        const exists = state.workerTasks.find(t => t.id === task.id);
        if (exists) return state;
        return { workerTasks: [task, ...state.workerTasks] };
    }),

    // ── User / Account State ────────────────────────────────────────────────
    user: {
        id: 'user_123',
        username: 'Alex Johnson',
        fullName: 'Alex Johnson',
        email: 'alex.j@civicstream.org',
        phone: '+1 (555) 012-3456',
        address: '1200 Civic Center Plaza, Apartment 4B',
        city: 'Seattle',
        state: 'Washington',
        pinCode: '98101',
        location: 'Seattle, WA',
        role: 'citizen',
        profileImage: '/assets/profile_alex.png'
    },

    updateUser: (updates) => set((state) => {
        const newUser = { ...state.user, ...updates };
        if (updates.fullName && !updates.name) newUser.name = updates.fullName;
        if (updates.name && !updates.fullName) newUser.fullName = updates.name;
        const newCurrentUser = state.currentUser ? { ...state.currentUser, ...updates } : null;
        if (newCurrentUser) {
            if (updates.fullName && !updates.name) newCurrentUser.name = updates.fullName;
            if (updates.name && !updates.fullName) newCurrentUser.fullName = updates.name;
        }
        return { user: newUser, currentUser: newCurrentUser };
    }),

    myCitizenAccounts: [
        { id: 'user_123', name: 'Alex Johnson', username: 'civic_user_01', img: '/assets/profile_alex.png' }
    ],

    switchCitizenAccount: async (account) => {
        const data = await api.switchAccount(account.id);
        if (data && data.success) {
            set((state) => {
                let updatedAccounts = [...state.myCitizenAccounts];
                if (!updatedAccounts.find(a => a.id === account.id)) {
                    updatedAccounts.push({
                        id: account.id, name: account.name,
                        username: account.username, img: account.img
                    });
                }
                return {
                    myCitizenAccounts: updatedAccounts,
                    user: {
                        ...state.user,
                        id: account.id,
                        username: account.username,
                        fullName: account.name,
                        profileImage: account.img
                    },
                    currentUser: {
                        ...(state.currentUser || {}),
                        id: account.id,
                        name: account.name,
                        role: 'citizen'
                    },
                    currentRoute: 'home',
                    currentAiIssueId: null,
                    selectedIssueId: null
                };
            });
            // Re-fetch data – will now use new citizen_id
            await get().fetchAppData();
        }
    },

    // ── Location State ──────────────────────────────────────────────────────
    location: { lat: 13.0827, lon: 80.2707, city: 'Chennai', country: 'India', accuracy: null, type: 'default' },
    locationPermission: 'prompt',
    showLocationModal: false,
    setLocation: (location) => set({ location }),
    setLocationPermission: (permission) => set({ locationPermission: permission }),
    setShowLocationModal: (show) => set({ showLocationModal: show }),

    // ── Shared Form State ───────────────────────────────────────────────────
    formData: { username: '', email: '', message: '', fullName: '', phone: '', location: '', profilePhoto: null },
    updateFormField: (field, value) => set((state) => ({
        formData: { ...state.formData, [field]: value }
    })),

    // ── Shared UI State ─────────────────────────────────────────────────────
    counter: 0,
    incrementCounter: () => set((state) => ({ counter: state.counter + 1 })),
    resetCounter: () => set({ counter: 0 }),
    activeTab: 'details',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // ── Onboarding ──────────────────────────────────────────────────────────
    currentSlide: 0,
    isAutoPlaying: true,
    setCurrentSlide: (index) => set({ currentSlide: index }),
    setIsAutoPlaying: (status) => set({ isAutoPlaying: status }),
    nextSlide: () => set((state) => ({ currentSlide: (state.currentSlide + 1) % 3 })),
    prevSlide: () => set((state) => ({ currentSlide: (state.currentSlide - 1 + 3) % 3 })),

    // ── Role Selection ──────────────────────────────────────────────────────
    selectedRole: 'citizen',

    // ── Comments / Votes ────────────────────────────────────────────────────
    addComment: (issueId, comment) => set((state) => ({
        issues: state.issues.map(issue =>
            issue.id === issueId
                ? { ...issue, comments: [...(issue.comments || []), { ...comment, id: Date.now(), votes: 0, userVote: null }] }
                : issue
        )
    })),

    voteIssue: (issueId, type) => set((state) => ({
        issues: state.issues.map(issue => {
            if (issue.id !== issueId) return issue;
            let newCount = issue.supportCount || 0;
            const currentVote = issue.userVote;
            const nextVote = currentVote === type ? null : type;
            if (currentVote === 'up') newCount--;
            if (currentVote === 'down') newCount++;
            if (nextVote === 'up') newCount++;
            if (nextVote === 'down') newCount--;
            return { ...issue, supportCount: newCount, userVote: nextVote };
        })
    })),

    voteComment: (issueId, commentId, type) => set((state) => ({
        issues: state.issues.map(issue => {
            if (issue.id !== issueId) return issue;
            return {
                ...issue,
                comments: (issue.comments || []).map(comment => {
                    if (comment.id !== commentId) return comment;
                    let newVotes = comment.votes || 0;
                    const currentVote = comment.userVote;
                    const nextVote = currentVote === type ? null : type;
                    if (currentVote === 'up') newVotes--;
                    if (currentVote === 'down') newVotes++;
                    if (nextVote === 'up') newVotes++;
                    if (nextVote === 'down') newVotes--;
                    return { ...comment, votes: newVotes, userVote: nextVote };
                })
            };
        })
    })),

    // ── Stories ─────────────────────────────────────────────────────────────
    stories: [
        { id: 1, name: 'Your Story', icon: 'account_circle', isUser: true, image: '/assets/profile_alex.png' },
        { id: 2, name: 'Roads', icon: 'traffic', image: '/assets/story_roads.png' },
        { id: 3, name: 'Waste', icon: 'delete', image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=600&auto=format&fit=crop' },
        { id: 4, name: 'Water', icon: 'water_drop', image: 'https://images.unsplash.com/photo-1541123303191-ba297ef1706a?q=80&w=600&auto=format&fit=crop' },
        { id: 5, name: 'Parks', icon: 'forest', image: 'https://images.unsplash.com/photo-1585938389612-a552a28d6914?q=80&w=600&auto=format&fit=crop' },
        { id: 6, name: 'Updates', icon: 'update', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop' }
    ],

    // ── Filters ─────────────────────────────────────────────────────────────
    activeFilter: 'All Issues',
    setActiveFilter: (filter) => set({ activeFilter: filter }),

    // ── Drafts ──────────────────────────────────────────────────────────────
    drafts: [],
    addDraft: (draft) => set((state) => ({
        drafts: [...state.drafts, { ...draft, id: `DRAFT_${Date.now()}`, createdAt: new Date().toISOString() }]
    })),
    deleteDraft: (draftId) => set((state) => ({
        drafts: state.drafts.filter(d => d.id !== draftId)
    }))
}));

export default useAppStore;
