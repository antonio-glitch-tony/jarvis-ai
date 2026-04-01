/* ═══════════════════════════════════════════════════════════
   J.A.R.V.I.S. — Controller v2.0 SYNC EDITION
   Le chat sono legate all'account via JWT.
   Ogni dispositivo vede e modifica le stesse chat.
   ═══════════════════════════════════════════════════════════ */
const aiService = require('../services/aiService');
const chatDB    = require('../database/chatDB');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode    = require('qrcode');

const ALLOWED_EMAIL = 'antonio.pepice08@gmail.com';
const JWT_SECRET    = process.env.JWT_SECRET || 'jarvis_secret_key_2024';

/* ── Helper: estrae userId dal token JWT nell'header Authorization ── */
function getUserIdFromReq(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;
    try {
        const token   = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        // Usa l'email normalizzata come userId stabile (univoco per account)
        return decoded.email ? decoded.email.trim().toLowerCase() : null;
    } catch (e) {
        return null;
    }
}

/* ── Middleware leggero per proteggere le route chat ── */
function requireAuth(req, res, next) {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Autenticazione richiesta' });
    req.userId = userId;
    next();
}

class JarviController {

    /* ══════════════════════════════════
       CHAT — sincronizzate per account
    ══════════════════════════════════ */

    async newChat(req, res) {
        try {
            const userId = getUserIdFromReq(req);
            if (!userId) return res.status(401).json({ error: 'Autenticazione richiesta' });
            const { title } = req.body;
            const conversationId = await chatDB.createConversation(userId, title);
            res.json({ success: true, conversationId });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async chatWithHistory(req, res) {
        try {
            const userId = getUserIdFromReq(req);
            if (!userId) return res.status(401).json({ error: 'Autenticazione richiesta' });

            const { conversationId, message, options } = req.body;
            if (!message) return res.status(400).json({ error: 'Message is required' });

            let convId = conversationId;

            if (!convId) {
                // Nuova conversazione — titolo = primo messaggio troncato
                convId = await chatDB.createConversation(userId, message.substring(0, 50));
            } else {
                // Verifica che la conversazione appartenga all'utente
                const owned = await chatDB.conversationBelongsToUser(convId, userId);
                if (!owned) return res.status(403).json({ error: 'Accesso negato a questa conversazione' });
            }

            await chatDB.saveMessage(convId, 'user', message);
            chatDB.updateConversationTime(convId);

            const history  = await chatDB.getMessages(convId);
            const messages = history.map(m => ({ role: m.role, content: m.content }));

            const result = await aiService.sendMessage(messages, options || {});

            if (result.success) {
                await chatDB.saveMessage(convId, 'assistant', result.response);
                chatDB.updateConversationTime(convId);
                res.json({ success: true, conversationId: convId, response: result.response });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /* Restituisce SOLO le conversazioni di questo account (cross-device sync) */
    async getConversations(req, res) {
        try {
            const userId = getUserIdFromReq(req);
            if (!userId) return res.status(401).json({ error: 'Autenticazione richiesta' });
            const conversations = await chatDB.getConversations(userId);
            res.json({ success: true, conversations });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async getConversation(req, res) {
        try {
            const userId = getUserIdFromReq(req);
            if (!userId) return res.status(401).json({ error: 'Autenticazione richiesta' });

            const { id } = req.params;
            const owned  = await chatDB.conversationBelongsToUser(id, userId);
            if (!owned) return res.status(403).json({ error: 'Accesso negato' });

            const messages      = await chatDB.getMessages(id);
            const conversations = await chatDB.getConversations(userId);
            const conversation  = conversations.find(c => c.id == id);
            res.json({ success: true, conversation, messages });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /* Elimina definitivamente la conversazione (per tutti i dispositivi) */
    async deleteConversation(req, res) {
        try {
            const userId = getUserIdFromReq(req);
            if (!userId) return res.status(401).json({ error: 'Autenticazione richiesta' });
            await chatDB.deleteConversation(req.params.id, userId);
            res.json({ success: true, message: 'Conversazione eliminata definitivamente' });
        } catch (e) {
            res.status(e.message.includes('Non autorizzato') ? 403 : 500).json({ error: e.message });
        }
    }

    async chat(req, res) {
        try {
            const { messages, options } = req.body;
            if (!messages || !Array.isArray(messages))
                return res.status(400).json({ error: 'Messages array is required' });
            const result = await aiService.sendMessage(messages, options || {});
            if (result.success) {
                res.json({ success: true, response: result.response });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    /* ══════════════════════════════════
       FUNZIONI SPECIALI
    ══════════════════════════════════ */

    async translate(req, res) {
        try {
            const { text, targetLanguage } = req.body;
            const result = await aiService.handleSpecialRequest('translate', text, { targetLanguage });
            result.success ? res.json({ success: true, translation: result.response }) : res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async summarize(req, res) {
        try {
            const { text } = req.body;
            const result = await aiService.handleSpecialRequest('summarize', text);
            result.success ? res.json({ success: true, summary: result.response }) : res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async generateCode(req, res) {
        try {
            const { prompt, language } = req.body;
            const result = await aiService.handleSpecialRequest('code', prompt, { language });
            result.success ? res.json({ success: true, code: result.response }) : res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async debugCode(req, res) {
        try {
            const { code } = req.body;
            const result = await aiService.handleSpecialRequest('debug', code);
            result.success ? res.json({ success: true, debugged: result.response }) : res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async explain(req, res) {
        try {
            const { concept } = req.body;
            const result = await aiService.handleSpecialRequest('explain', concept);
            result.success ? res.json({ success: true, explanation: result.response }) : res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async createExercise(req, res) {
        try {
            const { topic, type, level } = req.body;
            const result = await aiService.handleSpecialRequest('exercise', topic, { type, level });
            result.success ? res.json({ success: true, exercise: result.response }) : res.status(500).json({ error: result.error });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async getModels(req, res) {
        try {
            const config = require('../../config/config');
            res.json({ success: true, models: config.models });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async switchModel(req, res) {
        try {
            const config   = require('../../config/config');
            const { modelKey } = req.body;
            if (config.models[modelKey]) {
                aiService.defaultModel = config.models[modelKey];
                res.json({ success: true, currentModel: aiService.defaultModel });
            } else {
                res.status(400).json({ error: 'Model not found' });
            }
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async getSystemInfo(req, res) {
        try {
            const now = new Date();
            res.json({
                success: true,
                date: now.toLocaleDateString('it-IT'),
                time: now.toLocaleTimeString('it-IT'),
                day:  now.toLocaleDateString('it-IT', { weekday: 'long' })
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    /* ══════════════════════════════════
       AUTH
    ══════════════════════════════════ */

    async registerSendCode(req, res) {
        try {
            res.json({ success: true, message: 'Procedi con la registrazione completa.' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async register(req, res) {
        try {
            const { name, surname, email, password, secretWord, fingerprint } = req.body;

            if (!name || !surname || !email || !password || !secretWord || !fingerprint) {
                return res.status(400).json({ error: 'Tutti i campi obbligatori (nome, cognome, email, password, parola segreta, fingerprint)' });
            }

            const normalizedEmail = email.trim().toLowerCase();
            if (normalizedEmail !== ALLOWED_EMAIL) {
                return res.status(403).json({ error: 'Email non autorizzata.' });
            }

            const hashedPassword  = await bcrypt.hash(password, 10);
            const hashedSecretWord = await bcrypt.hash(secretWord, 10);

            const secret = speakeasy.generateSecret({
                name:   `J.A.R.V.I.S. (${normalizedEmail})`,
                length: 32
            });

            if (!global._users) global._users = {};
            global._users[normalizedEmail] = {
                name, surname,
                email: normalizedEmail,
                password: hashedPassword,
                secretWord: hashedSecretWord,
                fingerprint,
                gaSecret:      secret.base32,
                twofaEnabled:  true,
                completed:     false,
                registeredAt:  null
            };

            const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
            console.log(`📝 Registrazione iniziata: ${normalizedEmail}`);

            res.json({
                success: true,
                qrCode:  qrDataUrl,
                secret:  secret.base32,
                message: 'Scansiona il QR con Google Authenticator'
            });
        } catch (e) {
            console.error('Errore register:', e);
            res.status(500).json({ error: e.message });
        }
    }

    async verifyGoogleAuth(req, res) {
        try {
            const { email, gaCode } = req.body;
            if (!email || !gaCode) return res.status(400).json({ error: 'Email e codice GA richiesti' });

            const normalizedEmail = email.trim().toLowerCase();
            const user = global._users?.[normalizedEmail];

            if (!user) return res.status(400).json({ error: 'Utente non trovato. Registrati prima.' });
            if (user.completed) return res.status(400).json({ error: 'Utente già registrato. Procedi con il login.' });

            const verified = speakeasy.totp.verify({
                secret: user.gaSecret, encoding: 'base32',
                token:  gaCode.toString().trim(), window: 1
            });
            if (!verified) return res.status(400).json({ error: 'Codice Google Authenticator non valido' });

            user.completed    = true;
            user.registeredAt = Date.now();
            console.log(`✅ Registrazione completata: ${normalizedEmail}`);

            const token = jwt.sign(
                { email: normalizedEmail, name: user.name },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.json({ success: true, token, message: 'Benvenuto in JARVIS! 2FA attiva.' });
        } catch (e) {
            console.error('Errore verifyGoogleAuth:', e);
            res.status(500).json({ error: e.message });
        }
    }

    async registerConfirmGA(req, res) {
        return this.verifyGoogleAuth(req, res);
    }

    async login(req, res) {
        try {
            const { email, password, secretWord, fingerprint, token } = req.body;
            if (!email || !password || !secretWord || !fingerprint) {
                return res.status(400).json({ error: 'Email, password, parola segreta e fingerprint richiesti' });
            }

            const normalizedEmail = email.trim().toLowerCase();
            if (normalizedEmail !== ALLOWED_EMAIL) {
                return res.status(403).json({ error: 'Email non autorizzata.' });
            }

            const user = global._users?.[normalizedEmail];
            if (!user || !user.completed) {
                return res.status(400).json({ error: 'Utente non trovato. Devi prima registrarti.' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) return res.status(400).json({ error: 'Password errata' });

            const validSecretWord = await bcrypt.compare(secretWord, user.secretWord);
            if (!validSecretWord) return res.status(400).json({ error: 'Parola segreta errata' });

            if (user.fingerprint !== fingerprint) {
                return res.status(400).json({ error: 'Impronta digitale non riconosciuta' });
            }

            if (user.twofaEnabled && !token) {
                return res.json({ requiresTwoFactor: true });
            }

            if (user.twofaEnabled && token) {
                const verified = speakeasy.totp.verify({
                    secret: user.gaSecret, encoding: 'base32',
                    token:  token.toString().trim(), window: 1
                });
                if (!verified) return res.status(400).json({ error: 'Codice 2FA non valido' });
            }

            const jwtToken = jwt.sign(
                { email: normalizedEmail, name: user.name },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            console.log(`🔐 Login: ${normalizedEmail}`);
            res.json({ success: true, token: jwtToken });
        } catch (e) {
            console.error('Errore login:', e);
            res.status(500).json({ error: e.message });
        }
    }

    async recover(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email richiesta' });
            res.json({ success: true, message: "Contatta l'amministratore per il reset." });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async resetPassword(req, res) {
        try {
            const { email, newPassword } = req.body;
            const normalizedEmail = email.trim().toLowerCase();
            if (global._users?.[normalizedEmail]) {
                global._users[normalizedEmail].password = await bcrypt.hash(newPassword, 10);
                console.log(`✅ Password resettata: ${normalizedEmail}`);
            }
            res.json({ success: true, message: 'Password aggiornata.' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async changePassword(req, res) {
        try {
            const { email, currentPassword, newPassword } = req.body;
            const normalizedEmail = email.trim().toLowerCase();
            const user = global._users?.[normalizedEmail];
            if (user) {
                const valid = await bcrypt.compare(currentPassword, user.password);
                if (valid) {
                    user.password = await bcrypt.hash(newPassword, 10);
                    console.log(`✅ Password cambiata: ${normalizedEmail}`);
                } else {
                    return res.status(400).json({ error: 'Password attuale errata' });
                }
            }
            res.json({ success: true, message: 'Password aggiornata.' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async me(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(401).json({ error: 'No token' });

            const decoded = jwt.verify(token, JWT_SECRET);
            const user    = global._users?.[decoded.email];

            res.json({
                success: true,
                user: {
                    name:          user?.name    || 'Antonio',
                    surname:       user?.surname || 'Pepice',
                    email:         decoded.email,
                    twofa_enabled: true
                }
            });
        } catch (e) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }

    async updateProfile(req, res) {
        try {
            const { name, surname } = req.body;
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (token) {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (global._users?.[decoded.email]) {
                    global._users[decoded.email].name    = name;
                    global._users[decoded.email].surname = surname;
                }
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    githubLogin(req, res) { res.status(410).json({ error: 'Accesso GitHub rimosso.' }); }
    async githubCallback(req, res) { res.redirect('/'); }
}

module.exports = new JarviController();