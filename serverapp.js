/* ═══════════════════════════════════════════════════════════
   J.A.R.V.I.S. — Express Server  (app.js)
   New routes:
   • POST /api/auth/recover
   • POST /api/auth/reset-password
   • POST /api/auth/change-password
   • GET  /api/auth/github
   • GET  /api/auth/github/callback
   ═══════════════════════════════════════════════════════════ */
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const jarviController = require('./controllers/jarviController');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

/* ── CHAT API ── */
app.post('/api/chat',          jarviController.chat.bind(jarviController));
app.post('/api/chat/history',  jarviController.chatWithHistory.bind(jarviController));
app.post('/api/chat/new',      jarviController.newChat.bind(jarviController));

/* ── CONVERSATIONS ── */
app.get   ('/api/conversations',     jarviController.getConversations.bind(jarviController));
app.get   ('/api/conversations/:id', jarviController.getConversation.bind(jarviController));
app.delete('/api/conversations/:id', jarviController.deleteConversation.bind(jarviController));

/* ── SPECIAL AI ── */
app.post('/api/translate', jarviController.translate.bind(jarviController));
app.post('/api/summarize', jarviController.summarize.bind(jarviController));
app.post('/api/code',      jarviController.generateCode.bind(jarviController));
app.post('/api/debug',     jarviController.debugCode.bind(jarviController));
app.post('/api/explain',   jarviController.explain.bind(jarviController));
app.post('/api/exercise',  jarviController.createExercise.bind(jarviController));

/* ── MODELS ── */
app.get ('/api/models',        jarviController.getModels.bind(jarviController));
app.post('/api/models/switch', jarviController.switchModel.bind(jarviController));

/* ── SYSTEM ── */
app.get('/api/system/info', jarviController.getSystemInfo.bind(jarviController));

/* ── AUTH (existing — delegated to authController if present) ── */
// These are handled by your existing authController. The entries below
// add the NEW ones that were missing.

// Password recovery (from login page, no JWT needed)
app.post('/api/auth/recover',         jarviController.recover.bind(jarviController));
app.post('/api/auth/reset-password',  jarviController.resetPassword.bind(jarviController));
app.post('/api/auth/change-password', jarviController.changePassword.bind(jarviController));

// GitHub OAuth
app.get('/api/auth/github',           jarviController.githubLogin.bind(jarviController));
app.get('/api/auth/github/callback',  jarviController.githubCallback.bind(jarviController));

/* ── HEALTH CHECK ── */
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Jarvi AI', version: '2.0.0', platform: 'OpenRouter' });
});

/* ── STATIC FALLBACK ── */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;