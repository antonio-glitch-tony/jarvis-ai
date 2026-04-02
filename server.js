// server.js - Entry point per H.A.R.R.Y. AI Assistant
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

// Importa il controller HARRY (ex JARVIS)
const harryController = require('./src/controllers/HarryController');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ═══════════════════════════════════════════════════════════
   API Routes Chat - H.A.R.R.Y.
═══════════════════════════════════════════════════════════ */
app.post('/api/chat',                harryController.chat.bind(harryController));
app.post('/api/chat/history',        harryController.chatWithHistory.bind(harryController));
app.post('/api/chat/new',            harryController.newChat.bind(harryController));
app.get('/api/conversations',        harryController.getConversations.bind(harryController));
app.get('/api/conversations/:id',    harryController.getConversation.bind(harryController));
app.delete('/api/conversations/:id', harryController.deleteConversation.bind(harryController));

/* ═══════════════════════════════════════════════════════════
   API Routes Speciali
═══════════════════════════════════════════════════════════ */
app.post('/api/translate',           harryController.translate.bind(harryController));
app.post('/api/summarize',           harryController.summarize.bind(harryController));
app.post('/api/code',                harryController.generateCode.bind(harryController));
app.post('/api/debug',               harryController.debugCode.bind(harryController));
app.post('/api/explain',             harryController.explain.bind(harryController));
app.post('/api/exercise',            harryController.createExercise.bind(harryController));
app.get('/api/models',               harryController.getModels.bind(harryController));
app.post('/api/models/switch',       harryController.switchModel.bind(harryController));
app.get('/api/system/info',          harryController.getSystemInfo.bind(harryController));

/* ═══════════════════════════════════════════════════════════
   Auth Routes - COMPLETE
═══════════════════════════════════════════════════════════ */
app.post('/api/auth/register-send-code',  harryController.registerSendCode.bind(harryController));
app.post('/api/auth/register',            harryController.register.bind(harryController));
app.post('/api/auth/register-confirm-ga', harryController.registerConfirmGA.bind(harryController));
app.post('/api/auth/verify-google-auth',  harryController.verifyGoogleAuth.bind(harryController));  // ROUTA IMPORTANTE!
app.post('/api/auth/login',               harryController.login.bind(harryController));
app.post('/api/auth/recover',             harryController.recover.bind(harryController));
app.post('/api/auth/reset-password',      harryController.resetPassword.bind(harryController));
app.post('/api/auth/change-password',     harryController.changePassword.bind(harryController));
app.get('/api/auth/me',                   harryController.me.bind(harryController));
app.put('/api/auth/profile',              harryController.updateProfile.bind(harryController));

// Route di debug per resettare utenti (SOLO PER TEST, rimuovere in produzione)
app.post('/api/auth/debug/reset-users',   (req, res) => {
    if (global._users) {
        global._users = {};
        res.json({ success: true, message: 'Utenti resettati' });
    } else {
        res.json({ success: true, message: 'Nessun utente da resettare' });
    }
});

// Route per vedere utenti registrati (SOLO PER TEST)
app.get('/api/auth/debug/users', (req, res) => {
    const users = global._users ? Object.keys(global._users).map(email => ({
        email,
        completed: global._users[email].completed,
        hasFingerprint: !!global._users[email].fingerprint
    })) : [];
    res.json({ success: true, users });
});

/* ═══════════════════════════════════════════════════════════
   GitHub OAuth — RIMOSSO (non utilizzato)
═══════════════════════════════════════════════════════════ */
app.get('/api/auth/github',          harryController.githubLogin.bind(harryController));
app.get('/api/auth/github/callback', harryController.githubCallback.bind(harryController));

/* ═══════════════════════════════════════════════════════════
   Health Check
═══════════════════════════════════════════════════════════ */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'H.A.R.R.Y.', 
        version: '4.0.0', 
        platform: 'OpenRouter',
        creator: 'Antonio Pepice',
        uptime: process.uptime()
    });
});

/* ═══════════════════════════════════════════════════════════
   Root - Serve index.html
═══════════════════════════════════════════════════════════ */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* ═══════════════════════════════════════════════════════════
   Error handling middleware
═══════════════════════════════════════════════════════════ */
app.use((err, req, res, next) => {
    console.error('❌ Errore server:', err);
    res.status(500).json({ error: 'Errore interno del server' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trovata' });
});

/* ═══════════════════════════════════════════════════════════
   Avvio del server
═══════════════════════════════════════════════════════════ */
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    console.log('═'.repeat(60));
    console.log('🚀 H.A.R.R.Y. v4.0 - Hyper-Adaptive Responsive Robotic Intelligence');
    console.log('═'.repeat(60));
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`👨‍💻 Creato da Antonio Pepice`);
    console.log(`🔐 2FA: Attivo con Google Authenticator`);
    console.log(`🆔 Fingerprint: SHA-256`);
    console.log(`🤖 AI Model: OpenRouter`);
    console.log('═'.repeat(60));
});

// Gestione chiusura graceful
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM ricevuto, chiusura graceful...');
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT ricevuto, chiusura graceful...');
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});