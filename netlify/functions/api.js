import serverless from 'serverless-http';
import app from '../../server/index.js';

const serverlessHandler = serverless(app);

export const handler = async (event, context) => {
    // The Netlify redirect strips the leading /api path segment.
    // Restore it so the Express routes (/api/...) match correctly.
    if (!event.path.startsWith('/api')) {
        event.path = '/api' + (event.path.startsWith('/') ? event.path : '/' + event.path);
    }
    return serverlessHandler(event, context);
};
