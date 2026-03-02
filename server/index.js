import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query, getClient } from './db.js';
import { createNotification, notifyAllOfficials } from './notification.service.js';

const app = express();
app.use(cors());
app.use(express.json());

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Build a full complaint object from a DB row
function formatComplaint(row) {
    return {
        id: row.id,
        citizen_id: row.citizen_id,
        assigned_worker_id: row.assigned_worker_id,
        userId: row.citizen_id,
        username: row.citizen_username,
        author: { name: row.citizen_name },
        profileImage: row.citizen_profile_image,
        workerName: row.worker_name || null,
        category: row.category,
        status: row.status,
        priority: row.priority,
        escalation_flag: row.escalation_flag,
        title: row.title,
        location: row.location,
        description: row.description,
        date: row.date,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
        verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
        supportCount: row.support_count,
        image: row.image_url,
        coordinates: row.coordinates,
        comments: row.comments || [],
        history: row.history || []
    };
}

// Base SELECT for complaints with citizen+worker JOINs
const BASE_COMPLAINT_SELECT = `
    SELECT
        c.id, c.citizen_id, c.assigned_worker_id,
        c.category, c.status, c.priority, c.escalation_flag,
        c.title, c.location, c.description, c.date,
        c.created_at, c.completed_at, c.verified_at,
        c.support_count, c.image_url, c.coordinates, c.comments, c.history,
        u.name     AS citizen_name,
        u.username AS citizen_username,
        u.profile_image AS citizen_profile_image,
        w.name     AS worker_name
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    LEFT JOIN users w ON c.assigned_worker_id = w.id
`;

// Validate allowed status transitions
const VALID_TRANSITIONS = {
    pending: ['assigned'],
    assigned: ['in_progress'],
    in_progress: ['completed'],
    completed: ['verified', 'in_progress']  // verified = confirm; in_progress = reject
};

function isValidTransition(from, to) {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// Insert audit log entry (fire-and-forget, don't await)
function auditLog(complaint_id, action, performed_by, details = {}) {
    query(
        `INSERT INTO audit_log (complaint_id, action, performed_by, details)
         VALUES ($1, $2, $3, $4)`,
        [complaint_id, action, performed_by, JSON.stringify(details)]
    ).catch(err => console.error('Audit log error:', err));
}

// ─── CITIZEN ROUTES ────────────────────────────────────────────────────────────

// GET  /api/citizen/my-complaints?citizen_id=xxx
app.get('/api/citizen/my-complaints', async (req, res) => {
    const { citizen_id } = req.query;
    if (!citizen_id) return res.status(400).json({ error: 'citizen_id required' });
    try {
        const result = await query(
            `${BASE_COMPLAINT_SELECT}
             WHERE c.citizen_id = $1
             ORDER BY c.created_at DESC`,
            [citizen_id]
        );
        res.json(result.rows.map(formatComplaint));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// GET  /api/citizen/complaints  (all complaints – used for home feed)
app.get('/api/citizen/complaints', async (req, res) => {
    try {
        const result = await query(
            `${BASE_COMPLAINT_SELECT} ORDER BY c.created_at DESC`
        );
        res.json(result.rows.map(formatComplaint));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// POST /api/citizen/create
app.post('/api/citizen/create', async (req, res) => {
    const { citizen_id, title, category, description, location, image_url, coordinates, priority } = req.body;
    if (!citizen_id || !title || !category || !description) {
        return res.status(400).json({ error: 'citizen_id, title, category, description are required' });
    }
    try {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const id = `#ISSUE${Date.now()}`;
            const historyInit = JSON.stringify([
                { stage: 'Reported', status: 'completed', date: new Date().toLocaleString() },
                { stage: 'Assigned', status: 'upcoming', date: '' },
                { stage: 'In Progress', status: 'upcoming', date: '' },
                { stage: 'Verified', status: 'upcoming', date: '' }
            ]);

            await client.query(
                `INSERT INTO complaints
                 (id, citizen_id, category, status, priority, escalation_flag,
                  title, location, description, date, image_url, coordinates, comments, history)
                 VALUES ($1,$2,$3,'pending',$4,false,$5,$6,$7,'Just now',$8,$9,'[]',$10)`,
                [
                    id, citizen_id, category, priority || 'normal',
                    title, location || '', description,
                    image_url || null,
                    coordinates ? JSON.stringify(coordinates) : null,
                    historyInit
                ]
            );

            const result = await client.query(
                `${BASE_COMPLAINT_SELECT} WHERE c.id = $1`, [id]
            );
            auditLog(id, 'created', citizen_id, { status: 'pending' });
            await notifyAllOfficials(id, 'complaint_created', 'New Complaint Reported', `A new complaint "${title}" has been reported.`, client);
            await client.query('COMMIT');
            res.status(201).json(formatComplaint(result.rows[0]));
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create complaint' });
    }
});

// ─── OFFICIAL ROUTES ───────────────────────────────────────────────────────────

// GET /api/official/pending
app.get('/api/official/pending', async (req, res) => {
    try {
        const result = await query(
            `${BASE_COMPLAINT_SELECT} WHERE c.status = 'pending' ORDER BY c.created_at DESC`
        );
        res.json(result.rows.map(formatComplaint));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// GET /api/official/all  (master registry)
app.get('/api/official/all', async (req, res) => {
    try {
        const result = await query(
            `${BASE_COMPLAINT_SELECT} ORDER BY c.created_at DESC`
        );
        res.json(result.rows.map(formatComplaint));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// GET /api/official/by-status?status=assigned
app.get('/api/official/by-status', async (req, res) => {
    const { status } = req.query;
    const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'verified'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    try {
        const result = await query(
            `${BASE_COMPLAINT_SELECT} WHERE c.status = $1 ORDER BY c.created_at DESC`,
            [status]
        );
        res.json(result.rows.map(formatComplaint));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// GET /api/official/escalated
app.get('/api/official/escalated', async (req, res) => {
    try {
        const result = await query(
            `${BASE_COMPLAINT_SELECT} WHERE c.escalation_flag = true ORDER BY c.created_at DESC`
        );
        res.json(result.rows.map(formatComplaint));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/official/assign  { complaint_id, worker_id, official_id, priority? }
app.post('/api/official/assign', async (req, res) => {
    const { complaint_id, worker_id, official_id, priority } = req.body;
    if (!complaint_id || !worker_id) return res.status(400).json({ error: 'complaint_id and worker_id required' });
    try {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const cur = await client.query(`SELECT status FROM complaints WHERE id = $1`, [complaint_id]);
            if (cur.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ error: 'Complaint not found' });
            }
            if (!isValidTransition(cur.rows[0].status, 'assigned')) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(409).json({ error: `Cannot transition from ${cur.rows[0].status} to assigned` });
            }
            const updates = priority
                ? `assigned_worker_id=$1, status='assigned', priority=$2 WHERE id=$3`
                : `assigned_worker_id=$1, status='assigned' WHERE id=$2`;
            const params = priority ? [worker_id, priority, complaint_id] : [worker_id, complaint_id];
            await client.query(`UPDATE complaints SET ${updates}`, params);

            auditLog(complaint_id, 'assigned', official_id, { worker_id, priority });
            await createNotification(worker_id, complaint_id, 'worker_assigned', 'New Task Assigned', `You have been assigned to task ${complaint_id}.`, client);

            const result = await client.query(`${BASE_COMPLAINT_SELECT} WHERE c.id = $1`, [complaint_id]);
            await client.query('COMMIT');
            res.json(formatComplaint(result.rows[0]));
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/official/verify  { complaint_id, official_id }
app.post('/api/official/verify', async (req, res) => {
    const { complaint_id, official_id } = req.body;
    if (!complaint_id) return res.status(400).json({ error: 'complaint_id required' });
    try {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const cur = await client.query(`SELECT status, citizen_id FROM complaints WHERE id = $1`, [complaint_id]);
            if (cur.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ error: 'Not found' });
            }
            if (!isValidTransition(cur.rows[0].status, 'verified')) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(409).json({ error: `Cannot verify from status ${cur.rows[0].status}` });
            }
            await client.query(
                `UPDATE complaints SET status='verified', verified_at=NOW() WHERE id=$1`,
                [complaint_id]
            );
            auditLog(complaint_id, 'verified', official_id);
            await createNotification(cur.rows[0].citizen_id, complaint_id, 'complaint_verified', 'Complaint Verified', `Your complaint ${complaint_id} has been verified and closed.`, client);
            const result = await client.query(`${BASE_COMPLAINT_SELECT} WHERE c.id = $1`, [complaint_id]);
            await client.query('COMMIT');
            res.json(formatComplaint(result.rows[0]));
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/official/reject  { complaint_id, official_id, reason }
app.post('/api/official/reject', async (req, res) => {
    const { complaint_id, official_id, reason } = req.body;
    if (!complaint_id) return res.status(400).json({ error: 'complaint_id required' });
    try {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const cur = await client.query(`SELECT status, assigned_worker_id FROM complaints WHERE id = $1`, [complaint_id]);
            if (cur.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ error: 'Not found' });
            }
            if (cur.rows[0].status !== 'completed') {
                await client.query('ROLLBACK');
                client.release();
                return res.status(409).json({ error: `Can only reject completed tasks. Current: ${cur.rows[0].status}` });
            }
            await client.query(
                `UPDATE complaints SET status='in_progress', completed_at=NULL WHERE id=$1`,
                [complaint_id]
            );
            auditLog(complaint_id, 'rejected', official_id, { reason });
            await createNotification(cur.rows[0].assigned_worker_id, complaint_id, 'complaint_rejected', 'Task Rejected', `Your work on task ${complaint_id} was rejected. Reason: ${reason}`, client);
            const result = await client.query(`${BASE_COMPLAINT_SELECT} WHERE c.id = $1`, [complaint_id]);
            await client.query('COMMIT');
            res.json(formatComplaint(result.rows[0]));
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/official/escalate  { complaint_id, official_id, reason }
app.post('/api/official/escalate', async (req, res) => {
    const { complaint_id, official_id, reason } = req.body;
    if (!complaint_id) return res.status(400).json({ error: 'complaint_id required' });
    try {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            await client.query(
                `UPDATE complaints SET escalation_flag=true WHERE id=$1`,
                [complaint_id]
            );
            auditLog(complaint_id, 'escalated', official_id, { reason });
            await notifyAllOfficials(complaint_id, 'complaint_escalated', 'Complaint Escalated', `Complaint ${complaint_id} has been escalated. Reason: ${reason}`, client);
            const result = await client.query(`${BASE_COMPLAINT_SELECT} WHERE c.id = $1`, [complaint_id]);
            await client.query('COMMIT');
            res.json(formatComplaint(result.rows[0]));
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// ─── WORKER ROUTES ─────────────────────────────────────────────────────────────

// GET /api/worker/my-tasks?worker_id=xxx
app.get('/api/worker/my-tasks', async (req, res) => {
    const { worker_id } = req.query;
    if (!worker_id) return res.status(400).json({ error: 'worker_id required' });
    try {
        const result = await query(
            `${BASE_COMPLAINT_SELECT}
             WHERE c.assigned_worker_id = $1
               AND c.status IN ('assigned', 'in_progress')
             ORDER BY c.created_at DESC`,
            [worker_id]
        );
        res.json(result.rows.map(formatComplaint));
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/worker/completed-tasks?worker_id=xxx
app.get('/api/worker/completed-tasks', async (req, res) => {
    const { worker_id } = req.query;
    if (!worker_id) return res.status(400).json({ error: 'worker_id required' });
    try {
        const result = await query(
            `${BASE_COMPLAINT_SELECT}
             WHERE c.assigned_worker_id = $1
               AND c.status IN ('completed', 'verified')
             ORDER BY c.completed_at DESC NULLS LAST`,
            [worker_id]
        );
        res.json(result.rows.map(formatComplaint));
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/worker/start  { complaint_id, worker_id }
app.post('/api/worker/start', async (req, res) => {
    const { complaint_id, worker_id } = req.body;
    if (!complaint_id || !worker_id) return res.status(400).json({ error: 'complaint_id and worker_id required' });
    try {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const cur = await client.query(
                `SELECT status, assigned_worker_id, citizen_id FROM complaints WHERE id=$1`,
                [complaint_id]
            );
            if (cur.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ error: 'Not found' });
            }
            const row = cur.rows[0];
            if (row.assigned_worker_id !== worker_id) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(403).json({ error: 'This task is not assigned to you' });
            }
            if (!isValidTransition(row.status, 'in_progress')) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(409).json({ error: `Cannot start from status ${row.status}` });
            }
            await client.query(`UPDATE complaints SET status='in_progress' WHERE id=$1`, [complaint_id]);
            auditLog(complaint_id, 'started', worker_id);
            await createNotification(row.citizen_id, complaint_id, 'task_started', 'Task Started', `A worker has started resolving your complaint ${complaint_id}.`, client);
            await notifyAllOfficials(complaint_id, 'task_started', 'Task Started', `Worker has started task ${complaint_id}.`, client);
            const result = await client.query(`${BASE_COMPLAINT_SELECT} WHERE c.id = $1`, [complaint_id]);
            await client.query('COMMIT');
            res.json(formatComplaint(result.rows[0]));
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/worker/complete  { complaint_id, worker_id, notes? }
app.post('/api/worker/complete', async (req, res) => {
    const { complaint_id, worker_id, notes } = req.body;
    if (!complaint_id || !worker_id) return res.status(400).json({ error: 'complaint_id and worker_id required' });
    try {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const cur = await client.query(
                `SELECT status, assigned_worker_id, citizen_id FROM complaints WHERE id=$1`,
                [complaint_id]
            );
            if (cur.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ error: 'Not found' });
            }
            const row = cur.rows[0];
            if (row.assigned_worker_id !== worker_id) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(403).json({ error: 'This task is not assigned to you' });
            }
            if (!isValidTransition(row.status, 'completed')) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(409).json({ error: `Cannot complete from status ${row.status}` });
            }
            await client.query(
                `UPDATE complaints SET status='completed', completed_at=NOW() WHERE id=$1`,
                [complaint_id]
            );
            auditLog(complaint_id, 'completed', worker_id, { notes });
            await createNotification(row.citizen_id, complaint_id, 'task_completed', 'Task Completed', `The worker has marked your complaint ${complaint_id} as completed. Pending verification.`, client);
            await notifyAllOfficials(complaint_id, 'task_completed', 'Task Completed', `Worker completed task ${complaint_id}.`, client);
            const result = await client.query(`${BASE_COMPLAINT_SELECT} WHERE c.id = $1`, [complaint_id]);
            await client.query('COMMIT');
            res.json(formatComplaint(result.rows[0]));
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// ─── SHARED USER/ACCOUNT ROUTES ────────────────────────────────────────────────

app.get('/api/citizen/accounts', async (req, res) => {
    try {
        const result = await query(
            `SELECT id, name, username, profile_image as img, role FROM users WHERE role='citizen'`
        );
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/worker/accounts', async (req, res) => {
    try {
        const result = await query(
            `SELECT id, name, username, profile_image as img FROM users WHERE role='worker'`
        );
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/citizen/switch-account', async (req, res) => {
    const { accountId } = req.body;
    try {
        const result = await query(
            `SELECT id, name, username, profile_image as img, role FROM users WHERE id=$1`,
            [accountId]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false });
        res.json({ success: true, ...result.rows[0] });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ─── NOTIFICATION ROUTES ─────────────────────────────────────────────────────────

app.get('/api/notifications', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    try {
        const result = await query(
            `SELECT * FROM notifications WHERE recipient_user_id = $1 ORDER BY created_at DESC`,
            [user_id]
        );
        res.json(result.rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
        await query(`UPDATE notifications SET is_read = true WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

app.patch('/api/notifications/read-all', async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    try {
        await query(`UPDATE notifications SET is_read = true WHERE recipient_user_id = $1`, [user_id]);
        res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/notifications/unread-count', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    try {
        const result = await query(
            `SELECT COUNT(*) FROM notifications WHERE recipient_user_id = $1 AND is_read = false`,
            [user_id]
        );
        res.json({ count: parseInt(result.rows[0].count, 10) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// ─── START ─────────────────────────────────────────────────────────────────────

export default app;

// Only start the HTTP server when running directly (not imported as a module)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}
