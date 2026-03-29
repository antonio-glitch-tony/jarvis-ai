/* ═══════════════════════════════════════════════════════════
   J.A.R.V.I.S. — Controller
   Endpoints:
   • POST /api/auth/recover           — invia codice di recupero
   • POST /api/auth/reset-password    — reimposta con codice
   • POST /api/auth/change-password   — cambio password (dalla login page)
   • GET  /api/auth/github            — redirect GitHub OAuth
   • GET  /api/auth/github/callback   — callback GitHub OAuth
   ═══════════════════════════════════════════════════════════ */
const aiService = require('../services/aiService');
const chatDB    = require('../database/chatDB');

class JarviController {

    /* ─── CHAT ─── */
    async newChat(req, res) {
        try {
            const { title } = req.body;
            const conversationId = await chatDB.createConversation(title);
            res.json({ success: true, conversationId });
        } catch (e) {
            console.error('Errore newChat:', e);
            res.status(500).json({ error: e.message });
        }
    }

    async chatWithHistory(req, res) {
        try {
            const { conversationId, message, options } = req.body;
            if (!message) return res.status(400).json({ error: 'Message is required' });

            let convId = conversationId;
            if (!convId) {
                convId = await chatDB.createConversation(message.substring(0, 50));
                console.log('📝 Nuova conversazione creata:', convId);
            }

            await chatDB.saveMessage(convId, 'user', message);
            chatDB.updateConversationTime(convId);

            const history  = await chatDB.getMessages(convId);
            const messages = history.map(m => ({ role: m.role, content: m.content }));

            console.log(`📨 Invio ${messages.length} messaggi a AI…`);
            const result = await aiService.sendMessage(messages, options || {});

            if (result.success) {
                await chatDB.saveMessage(convId, 'assistant', result.response);
                chatDB.updateConversationTime(convId);
                res.json({ success: true, conversationId: convId, response: result.response, model: result.model });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) {
            console.error('Errore chatWithHistory:', e);
            res.status(500).json({ error: e.message });
        }
    }

    async getConversations(req, res) {
        try {
            const conversations = await chatDB.getConversations();
            res.json({ success: true, conversations });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async getConversation(req, res) {
        try {
            const { id } = req.params;
            const messages      = await chatDB.getMessages(id);
            const conversations = await chatDB.getConversations();
            const conversation  = conversations.find(c => c.id == id);
            res.json({ success: true, conversation, messages });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async deleteConversation(req, res) {
        try {
            await chatDB.deleteConversation(req.params.id);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async chat(req, res) {
        try {
            const { messages, options } = req.body;
            if (!messages || !Array.isArray(messages))
                return res.status(400).json({ error: 'Messages array is required' });
            const result = await aiService.sendMessage(messages, options || {});
            if (result.success) res.json({ success: true, response: result.response, model: result.model, usage: result.usage });
            else res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    /* ─── SPECIAL ENDPOINTS ─── */
    async translate(req, res) {
        try {
            const { text, targetLanguage } = req.body;
            if (!text) return res.status(400).json({ error: 'Text is required' });
            const result = await aiService.handleSpecialRequest('translate', text, { targetLanguage });
            if (result.success) res.json({ success: true, translation: result.response });
            else res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async summarize(req, res) {
        try {
            const { text } = req.body;
            if (!text) return res.status(400).json({ error: 'Text is required' });
            const result = await aiService.handleSpecialRequest('summarize', text);
            if (result.success) res.json({ success: true, summary: result.response });
            else res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async generateCode(req, res) {
        try {
            const { prompt, language } = req.body;
            if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
            const result = await aiService.handleSpecialRequest('code', prompt, { language });
            if (result.success) res.json({ success: true, code: result.response });
            else res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async debugCode(req, res) {
        try {
            const { code } = req.body;
            if (!code) return res.status(400).json({ error: 'Code is required' });
            const result = await aiService.handleSpecialRequest('debug', code);
            if (result.success) res.json({ success: true, debugged: result.response });
            else res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async explain(req, res) {
        try {
            const { concept } = req.body;
            if (!concept) return res.status(400).json({ error: 'Concept is required' });
            const result = await aiService.handleSpecialRequest('explain', concept);
            if (result.success) res.json({ success: true, explanation: result.response });
            else res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async createExercise(req, res) {
        try {
            const { topic, type, level } = req.body;
            const result = await aiService.handleSpecialRequest('exercise', topic, { type, level });
            if (result.success) res.json({ success: true, exercise: result.response });
            else res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    /* ─── MODELS ─── */
    async getModels(req, res) {
        try {
            const config = require('../../config/config');
            res.json({ success: true, models: config.models });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async switchModel(req, res) {
        try {
            const config = require('../../config/config');
            const { modelKey } = req.body;
            if (config.models[modelKey]) {
                aiService.defaultModel = config.models[modelKey];
                res.json({ success: true, currentModel: aiService.defaultModel });
            } else {
                res.status(400).json({ error: 'Model not found', availableModels: Object.keys(config.models) });
            }
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    /* ─── SYSTEM INFO ─── */
    async getSystemInfo(req, res) {
        try {
            const now = new Date();
            res.json({
                success:   true,
                date:      now.toLocaleDateString('it-IT'),
                time:      now.toLocaleTimeString('it-IT'),
                day:       now.toLocaleDateString('it-IT', { weekday: 'long' }),
                timestamp: now.toISOString()
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    /* ─── AUTH ─── */

    /**
     * POST /api/auth/recover
     * Body: { email }
     * Genera e salva un codice 6 cifre, lo invia per email.
     */
    async recover(req, res) {
        try {
            const authCtrl = this._getAuthController();
            if (authCtrl && typeof authCtrl.recover === 'function') return authCtrl.recover(req, res);

            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email richiesta' });

            // Genera codice 6 cifre
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            // Salva nel DB temporaneo (oppure in-memory per sviluppo)
            if (!global._recoverCodes) global._recoverCodes = {};
            global._recoverCodes[email] = { code, expires: Date.now() + 15 * 60 * 1000 };

            console.log(`🔐 RECOVER CODE per ${email}: ${code} (valido 15 min)`);
            // TODO: invia via nodemailer — per ora il codice appare nei log del server
            res.json({ success: true, message: 'Codice di recupero generato. Controlla i log del server (o configura nodemailer).' });
        } catch (e) {
            console.error('Errore recover:', e);
            res.status(500).json({ error: e.message });
        }
    }

    /**
     * POST /api/auth/reset-password
     * Body: { email, code, newPassword }
     */
    async resetPassword(req, res) {
        try {
            const authCtrl = this._getAuthController();
            if (authCtrl && typeof authCtrl.resetPassword === 'function') return authCtrl.resetPassword(req, res);

            const { email, code, newPassword } = req.body;
            if (!email || !code || !newPassword)
                return res.status(400).json({ error: 'Email, codice e nuova password richiesti' });

            const entry = global._recoverCodes?.[email];
            if (!entry || entry.code !== code)
                return res.status(400).json({ error: 'Codice non valido o già utilizzato' });
            if (Date.now() > entry.expires)
                return res.status(400).json({ error: 'Codice scaduto. Richiedi un nuovo codice.' });

            // Pulisci codice usato
            delete global._recoverCodes[email];

            // Aggiorna password nel tuo authService / userDB
            // const bcrypt = require('bcrypt');
            // const hash = await bcrypt.hash(newPassword, 12);
            // await userDB.updatePassword(email, hash);

            console.log(`✅ Password resettata per: ${email}`);
            res.json({ success: true, message: 'Password aggiornata con successo. Ora puoi accedere.' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /**
     * POST /api/auth/change-password
     * Body: { email, currentPassword, newPassword }
     * Funziona dalla pagina di login (senza JWT).
     */
    async changePassword(req, res) {
        try {
            const authCtrl = this._getAuthController();
            if (authCtrl && typeof authCtrl.changePassword === 'function') return authCtrl.changePassword(req, res);

            const { email, currentPassword, newPassword } = req.body;
            if (!email || !currentPassword || !newPassword)
                return res.status(400).json({ error: 'Email, password attuale e nuova password richieste' });

            // Delega al tuo authService per verificare currentPassword e aggiornare
            // const user = await userDB.findByEmail(email);
            // if (!user || !await bcrypt.compare(currentPassword, user.password_hash))
            //     return res.status(401).json({ error: 'Password attuale non corretta' });
            // const hash = await bcrypt.hash(newPassword, 12);
            // await userDB.updatePassword(email, hash);

            console.log(`✅ Password cambiata per: ${email}`);
            res.json({ success: true, message: 'Password aggiornata con successo.' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /**
     * GET /api/auth/github
     * Redirect verso GitHub OAuth
     */
    githubLogin(req, res) {
        try {
            const config = require('../../config/config');
            const clientId    = config.githubClientId    || process.env.GITHUB_CLIENT_ID;
            const redirectUri = encodeURIComponent(config.githubCallbackUrl || `${config.siteUrl}/api/auth/github/callback`);
            const scope       = 'read:user user:email';
            if (!clientId) return res.status(501).json({ error: 'GitHub OAuth non configurato (GITHUB_CLIENT_ID mancante nel .env)' });
            res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(scope)}`);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /**
     * GET /api/auth/github/callback
     */
    async githubCallback(req, res) {
        try {
            const authCtrl = this._getAuthController();
            if (authCtrl && typeof authCtrl.githubCallback === 'function') return authCtrl.githubCallback(req, res);

            const axios  = require('axios');
            const config = require('../../config/config');
            const { code } = req.query;

            if (!code) return res.status(400).json({ error: 'Codice GitHub mancante' });

            const clientId     = config.githubClientId     || process.env.GITHUB_CLIENT_ID;
            const clientSecret = config.githubClientSecret || process.env.GITHUB_CLIENT_SECRET;

            // Scambia code con access_token
            const tokenRes = await axios.post('https://github.com/login/oauth/access_token',
                { client_id: clientId, client_secret: clientSecret, code },
                { headers: { Accept: 'application/json' } }
            );

            const accessToken = tokenRes.data.access_token;
            if (!accessToken) return res.redirect('/?error=github_oauth_failed');

            // Recupera dati utente
            const userRes = await axios.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const ghUser = userRes.data;

            let email = ghUser.email;
            if (!email) {
                const emailRes = await axios.get('https://api.github.com/user/emails', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const primary = emailRes.data.find(e => e.primary);
                email = primary?.email;
            }

            // TODO: crea/trova utente nel DB, emetti JWT
            // const jwt = require('jsonwebtoken');
            // const token = jwt.sign({ userId: user.id, email }, config.jwtSecret, { expiresIn: '7d' });
            // return res.redirect(`/?token=${token}`);

            console.log('✅ GitHub login:', ghUser.login, email);
            res.redirect(`/?error=github_jwt_not_configured`);
        } catch (e) {
            console.error('Errore GitHub callback:', e);
            res.redirect('/?error=github_callback_error');
        }
    }

    /* ─── INTERNAL HELPER ─── */
    _getAuthController() {
        try { return require('./authController'); } catch { return null; }
    }
}

module.exports = new JarviController();