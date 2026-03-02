// src/services/api.js
// All operations target the shared complaints table via the Express server.
// No mock stubs for workflow operations – only real HTTP calls.

const BASE = '/api';

async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            console.error(`API Error [${res.status}] ${url}:`, err);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.error(`Network error on ${url}:`, e);
        return null;
    }
}

export const api = {
    // ── AUTH ──────────────────────────────────────────────────────────────────
    login: async (email, password) => {
        // Determine role from email keyword (mock auth — no real auth server)
        let role = 'citizen';
        if (email.includes('worker')) role = 'worker';
        else if (email.includes('official') || email.includes('admin')) role = 'official';

        // Map to a real seeded user
        const roleUserMap = {
            citizen: 'user_123',
            worker: email.includes('2') ? 'worker_02' : 'worker_01',
            official: 'off_01'
        };

        const names = {
            worker_01: 'Ravi S.',
            worker_02: 'David Miller',
            off_01: 'Officer Rajesh',
            user_123: 'Alex Johnson'
        };

        const images = {
            worker_01: 'https://i.pravatar.cc/150?u=ravi',
            worker_02: 'https://i.pravatar.cc/150?u=david',
            off_01: 'https://i.pravatar.cc/150?u=rajesh',
            user_123: '/assets/profile_alex.png'
        };

        const userId = roleUserMap[role];

        return {
            success: true,
            id: userId,
            role,
            name: names[userId] || email.split('@')[0] || 'User',
            profileImage: images[userId] || 'https://i.pravatar.cc/150'
        };
    },

    // ── CITIZEN ───────────────────────────────────────────────────────────────
    fetchCitizenComplaints: async () => {
        const data = await safeFetch(`${BASE}/citizen/complaints`);
        return data || [];
    },

    fetchMyCitizenComplaints: async (citizen_id) => {
        const data = await safeFetch(`${BASE}/citizen/my-complaints?citizen_id=${encodeURIComponent(citizen_id)}`);
        return data || [];
    },

    createComplaint: async ({ citizen_id, title, category, description, location, image_url, coordinates, priority }) => {
        return await safeFetch(`${BASE}/citizen/create`, {
            method: 'POST',
            body: JSON.stringify({ citizen_id, title, category, description, location, image_url, coordinates, priority })
        });
    },

    fetchCitizenAccounts: async () => {
        const data = await safeFetch(`${BASE}/citizen/accounts`);
        return data || [];
    },

    switchAccount: async (accountId) => {
        const data = await safeFetch(`${BASE}/citizen/switch-account`, {
            method: 'POST',
            body: JSON.stringify({ accountId })
        });
        return data || { success: false };
    },

    // ── OFFICIAL ──────────────────────────────────────────────────────────────
    fetchOfficialAll: async () => {
        const data = await safeFetch(`${BASE}/official/all`);
        return data || [];
    },

    fetchOfficialByStatus: async (status) => {
        const data = await safeFetch(`${BASE}/official/by-status?status=${status}`);
        return data || [];
    },

    fetchOfficialEscalated: async () => {
        const data = await safeFetch(`${BASE}/official/escalated`);
        return data || [];
    },

    assignTask: async (complaint_id, worker_id, official_id, priority) => {
        return await safeFetch(`${BASE}/official/assign`, {
            method: 'POST',
            body: JSON.stringify({ complaint_id, worker_id, official_id, priority })
        });
    },

    verifyTask: async (complaint_id, official_id) => {
        return await safeFetch(`${BASE}/official/verify`, {
            method: 'POST',
            body: JSON.stringify({ complaint_id, official_id })
        });
    },

    rejectTask: async (complaint_id, official_id, reason) => {
        return await safeFetch(`${BASE}/official/reject`, {
            method: 'POST',
            body: JSON.stringify({ complaint_id, official_id, reason })
        });
    },

    escalateTask: async (complaint_id, official_id, reason) => {
        return await safeFetch(`${BASE}/official/escalate`, {
            method: 'POST',
            body: JSON.stringify({ complaint_id, official_id, reason })
        });
    },

    // ── WORKER ────────────────────────────────────────────────────────────────
    fetchWorkerTasks: async (worker_id) => {
        const data = await safeFetch(`${BASE}/worker/my-tasks?worker_id=${encodeURIComponent(worker_id)}`);
        return data || [];
    },

    fetchWorkerCompletedTasks: async (worker_id) => {
        const data = await safeFetch(`${BASE}/worker/completed-tasks?worker_id=${encodeURIComponent(worker_id)}`);
        return data || [];
    },

    startTask: async (complaint_id, worker_id) => {
        return await safeFetch(`${BASE}/worker/start`, {
            method: 'POST',
            body: JSON.stringify({ complaint_id, worker_id })
        });
    },

    completeTask: async (complaint_id, worker_id, notes) => {
        return await safeFetch(`${BASE}/worker/complete`, {
            method: 'POST',
            body: JSON.stringify({ complaint_id, worker_id, notes })
        });
    },

    fetchWorkerAccounts: async () => {
        const data = await safeFetch(`${BASE}/worker/accounts`);
        return data || [];
    },

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    fetchNotifications: async (user_id) => {
        const data = await safeFetch(`${BASE}/notifications?user_id=${encodeURIComponent(user_id)}`);
        return data || [];
    },

    markNotificationRead: async (id) => {
        return await safeFetch(`${BASE}/notifications/${id}/read`, {
            method: 'PATCH',
        });
    },

    markAllNotificationsRead: async (user_id) => {
        return await safeFetch(`${BASE}/notifications/read-all`, {
            method: 'PATCH',
            body: JSON.stringify({ user_id })
        });
    },

    fetchUnreadNotificationCount: async (user_id) => {
        const data = await safeFetch(`${BASE}/notifications/unread-count?user_id=${encodeURIComponent(user_id)}`);
        return data ? data.count : 0;
    }
};
