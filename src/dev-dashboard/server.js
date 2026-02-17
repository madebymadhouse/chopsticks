// src/dev-dashboard/server.js
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Node 20+ provides global fetch.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.DEV_DASHBOARD_PORT || 3001;
const USERNAME = process.env.DEV_DASHBOARD_USERNAME;
const PASSWORD = process.env.DEV_DASHBOARD_PASSWORD;

// Dev API connection details
const DEV_API_BASE_URL = process.env.DEV_API_BASE_URL || `http://localhost:${process.env.DEV_API_PORT || 3002}/dev-api`;
const DEV_API_USERNAME = process.env.DEV_API_USERNAME; // Re-use for Dev API Auth
const DEV_API_PASSWORD = process.env.DEV_API_PASSWORD; // Re-use for Dev API Auth

// Base64 encoded credentials for Dev API
const DEV_API_AUTH_HEADER =
  DEV_API_USERNAME && DEV_API_PASSWORD
    ? `Basic ${Buffer.from(`${DEV_API_USERNAME}:${DEV_API_PASSWORD}`).toString('base64')}`
    : "";


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Basic Authentication Middleware
function authenticate(req, res, next) {
    if (!USERNAME || !PASSWORD) {
        return res.status(503).send("Dev dashboard credentials not configured.");
    }
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).send('Authentication required.');
    }

    const [type, credentials] = authHeader.split(' ');
    if (type !== 'Basic') {
        return res.status(401).send('Unsupported authentication type.');
    }

    const decoded = Buffer.from(credentials, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');

    if (username === USERNAME && password === PASSWORD) {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.status(401).send('Invalid credentials.');
    }
}

app.use(authenticate);

// Routes
app.get('/', async (req, res) => {
    try {
        if (!DEV_API_AUTH_HEADER) {
            throw new Error("Dev API credentials not configured.");
        }
        const response = await fetch(`${DEV_API_BASE_URL}/status`, {
            headers: {
                'Authorization': DEV_API_AUTH_HEADER
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch status: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        res.render('index', {
            registeredAgents: data.registeredAgents,
            activeAgents: data.activeAgents,
            connectedRunners: data.connectedRunners,
            sessions: data.sessions,
            assistantSessions: data.assistantSessions,
            error: null
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.render('index', {
            registeredAgents: [],
            activeAgents: [],
            connectedRunners: [],
            sessions: [],
            assistantSessions: [],
            error: error.message
        });
    }
});

// API Endpoints
app.post('/api/agents/add', async (req, res) => {
    const { token, clientId, tag } = req.body;
    if (!token || !clientId || !tag) {
        return res.status(400).json({ error: 'Missing token, clientId, or tag.' });
    }

    try {
        const response = await fetch(`${DEV_API_BASE_URL}/agents/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': DEV_API_AUTH_HEADER
            },
            body: JSON.stringify({ token, clientId, tag })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to add agent token.');
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agents/update_status', async (req, res) => {
    const { agentId, status } = req.body;
    if (!agentId || !status) {
        return res.status(400).json({ error: 'Missing agentId or status.' });
    }

    try {
        const response = await fetch(`${DEV_API_BASE_URL}/agents/update_status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': DEV_API_AUTH_HEADER
            },
            body: JSON.stringify({ agentId, status })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update agent status.');
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agents/delete', async (req, res) => {
    const { agentId } = req.body;
    if (!agentId) {
        return res.status(400).json({ error: 'Missing agentId.' });
    }

    try {
        const response = await fetch(`${DEV_API_BASE_URL}/agents/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': DEV_API_AUTH_HEADER
            },
            body: JSON.stringify({ agentId })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete agent token.');
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agents/restart/:agentId', async (req, res) => {
    const { agentId } = req.params;
    if (!agentId) {
        return res.status(400).json({ error: 'Missing agentId.' });
    }
    try {
        const response = await fetch(`${DEV_API_BASE_URL}/agents/restart/${agentId}`, {
            method: 'POST',
            headers: {
                'Authorization': DEV_API_AUTH_HEADER
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to restart agent.');
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agents/stop/:agentId', async (req, res) => {
    const { agentId } = req.params;
    if (!agentId) {
        return res.status(400).json({ error: 'Missing agentId.' });
    }
    try {
        const response = await fetch(`${DEV_API_BASE_URL}/agents/stop/${agentId}`, {
            method: 'POST',
            headers: {
                'Authorization': DEV_API_AUTH_HEADER
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to stop agent.');
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agents/start/:agentId', async (req, res) => {
    const { agentId } = req.params;
    if (!agentId) {
        return res.status(400).json({ error: 'Missing agentId.' });
    }
    try {
        const response = await fetch(`${DEV_API_BASE_URL}/agents/start/${agentId}`, {
            method: 'POST',
            headers: {
                'Authorization': DEV_API_AUTH_HEADER
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to start agent.');
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Dev Dashboard running on http://localhost:${PORT}`);
});
