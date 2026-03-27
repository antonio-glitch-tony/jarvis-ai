const express = require('express');
const cors = require('cors');
const path = require('path'); // Aggiungi questa linea
const jarviController = require('./controllers/jarviController');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public'))); // Aggiungi questa linea

// Routes API
app.post('/api/chat', jarviController.chat.bind(jarviController));
app.post('/api/translate', jarviController.translate.bind(jarviController));
app.post('/api/summarize', jarviController.summarize.bind(jarviController));
app.post('/api/code', jarviController.generateCode.bind(jarviController));
app.post('/api/debug', jarviController.debugCode.bind(jarviController));
app.post('/api/explain', jarviController.explain.bind(jarviController));
app.post('/api/exercise', jarviController.createExercise.bind(jarviController));
app.get('/api/models', jarviController.getModels.bind(jarviController));
app.post('/api/models/switch', jarviController.switchModel.bind(jarviController));

// Routes per storico chat
app.post('/api/chat/history', jarviController.chatWithHistory.bind(jarviController));
app.post('/api/chat/new', jarviController.newChat.bind(jarviController));
app.get('/api/conversations', jarviController.getConversations.bind(jarviController));
app.get('/api/conversations/:id', jarviController.getConversation.bind(jarviController));
app.delete('/api/conversations/:id', jarviController.deleteConversation.bind(jarviController));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Jarvi AI', 
    version: '1.0.0',
    platform: 'OpenRouter'
  });
});

// Root endpoint - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;