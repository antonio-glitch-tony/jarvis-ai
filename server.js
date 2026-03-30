const express = require('express');
const cors = require('cors');
const path = require('path');

// Importa da src/ (usa il nome corretto del file)
const jarviController = require('./src/controllers/jarviController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes Chat ──
app.post('/api/chat',                jarviController.chat.bind(jarviController));
app.post('/api/chat/history',        jarviController.chatWithHistory.bind(jarviController));
app.post('/api/chat/new',            jarviController.newChat.bind(jarviController));
app.get('/api/conversations',        jarviController.getConversations.bind(jarviController));
app.get('/api/conversations/:id',    jarviController.getConversation.bind(jarviController));
app.delete('/api/conversations/:id', jarviController.deleteConversation.bind(jarviController));

// ── API Routes Special ──
app.post('/api/translate',           jarviController.translate.bind(jarviController));
app.post('/api/summarize',           jarviController.summarize.bind(jarviController));
app.post('/api/code',                jarviController.generateCode.bind(jarviController));
app.post('/api/debug',               jarviController.debugCode.bind(jarviController));
app.post('/api/explain',             jarviController.explain.bind(jarviController));
app.post('/api/exercise',            jarviController.createExercise.bind(jarviController));
app.get('/api/models',               jarviController.getModels.bind(jarviController));
app.post('/api/models/switch',       jarviController.switchModel.bind(jarviController));
app.get('/api/system/info',          jarviController.getSystemInfo.bind(jarviController));

// ── Auth Routes ──
app.post('/api/auth/register-send-code',  jarviController.registerSendCode.bind(jarviController));
app.post('/api/auth/register',            jarviController.register.bind(jarviController));
app.post('/api/auth/register-confirm-ga', jarviController.registerConfirmGA.bind(jarviController));
app.post('/api/auth/login',               jarviController.login.bind(jarviController));
app.post('/api/auth/recover',             jarviController.recover.bind(jarviController));
app.post('/api/auth/reset-password',      jarviController.resetPassword.bind(jarviController));
app.post('/api/auth/change-password',     jarviController.changePassword.bind(jarviController));
app.get('/api/auth/me',                   jarviController.me.bind(jarviController));
app.put('/api/auth/profile',              jarviController.updateProfile.bind(jarviController));

// GitHub OAuth — RIMOSSO
app.get('/api/auth/github',          jarviController.githubLogin.bind(jarviController));
app.get('/api/auth/github/callback', jarviController.githubCallback.bind(jarviController));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'JARVIS AI', version: '2.2.0', platform: 'OpenRouter' });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 JARVIS Server running on port ${PORT}`);
    console.log(`🔐 Security: Email whitelist + Password + Parola Segreta + Fingerprint + Google 2FA`);
    console.log(`🌀 Hologram: Avengers style - NO face/eyes`);
});