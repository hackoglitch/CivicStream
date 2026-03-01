import 'dotenv/config';
//import express from 'express';
import cors from 'cors';
import { query } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Fetch Complaints with user Join
app.get('/api/citizen/complaints', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                c.id, c.category, c.status, c.title, c.location, c.description, c.date, c.created_at as "createdAt", 
                c.support_count as "supportCount", c.image_url as image, c.coordinates, c.comments, c.history,
                c.citizen_id,
                u.id as "userId", u.name as "authorName", u.username, u.profile_image as "profileImage"
            FROM complaints c
            JOIN users u ON c.citizen_id = u.id
            ORDER BY c.created_at DESC
        `);

        // Format to match exactly what frontend expects
        const formatted = result.rows.map(row => ({
            id: row.id,
            citizen_id: row.citizen_id,
            userId: row.userId,
            username: row.username,
            author: { name: row.authorName },
            profileImage: row.profileImage,
            category: row.category,
            status: row.status,
            title: row.title,
            location: row.location,
            description: row.description,
            date: row.date,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
            supportCount: row.supportCount,
            image: row.image,
            coordinates: row.coordinates,
            comments: row.comments,
            history: row.history
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

app.get('/api/citizen/accounts', async (req, res) => {
    try {
        const result = await query(`SELECT id, name, username, profile_image as img FROM users WHERE role = 'citizen'`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/citizen/switch-account', async (req, res) => {
    const { accountId } = req.body;
    try {
        const result = await query(`SELECT id, name, username, profile_image as img, role FROM users WHERE id = $1`, [accountId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false });

        res.json({ success: true, ...result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
