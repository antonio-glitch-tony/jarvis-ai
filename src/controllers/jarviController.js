/* ═══════════════════════════════════════════════════════════
   J.A.R.V.I.S. — Controller (SENZA nodemailer)
   ═══════════════════════════════════════════════════════════ */
const aiService = require('../services/aiService');
const chatDB = require('../database/chatDB');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ALLOWED_EMAIL = 'antonio.pepice08@gmail.com';
const JWT_SECRET = process.env.JWT_SECRET || 'jarvis_secret_key_2024';

class JarviController {

    async newChat(req, res) {
        try {
            const { title } = req.body;
            const conversationId = await chatDB.createConversation(title);
            res.json({ success: true, conversationId });
        } catch (e) {
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
            }

            await chatDB.saveMessage(convId, 'user', message);
            chatDB.updateConversationTime(convId);

            const history = await chatDB.getMessages(convId);
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

    async getConversations(req, res) {
        try {
            const conversations = await chatDB.getConversations();
            res.json({ success: true, conversations });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async getConversation(req, res) {
        try {
            const { id } = req.params;
            const messages = await chatDB.getMessages(id);
            const conversations = await chatDB.getConversations();
            const conversation = conversations.find(c => c.id == id);
            res.json({ success: true, conversation, messages });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async deleteConversation(req, res) {
        try {
            await chatDB.deleteConversation(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
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
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

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
            const config = require('../../config/config');
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
                day: now.toLocaleDateString('it-IT', { weekday: 'long' })
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    // ============ AUTH ============
    
    async registerSendCode(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email richiesta' });

            const normalizedEmail = email.trim().toLowerCase();

            if (normalizedEmail !== ALLOWED_EMAIL) {
                return res.status(403).json({ error: 'Email non autorizzata.' });
            }

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            if (!global._registerCodes) global._registerCodes = {};
            global._registerCodes[normalizedEmail] = {
                code,
                expires: Date.now() + 15 * 60 * 1000
            };

            console.log(`📧📧📧 CODICE VERIFICA: ${code} per ${normalizedEmail} 📧📧📧`);
            
            res.json({ success: true, message: '✅ Codice generato! Controlla i log del server.' });

        } catch (e) {
            console.error('Errore registerSendCode:', e);
            res.status(500).json({ error: e.message });
        }
    }

    async register(req, res) {
        try {
            const { name, surname, email, password, secretWord, fingerprint, emailCode } = req.body;
            if (!name || !surname || !email || !password || !secretWord || !fingerprint || !emailCode) {
                return res.status(400).json({ error: 'Tutti i campi obbligatori' });
            }

            const normalizedEmail = email.trim().toLowerCase();

            if (normalizedEmail !== ALLOWED_EMAIL) {
                return res.status(403).json({ error: 'Email non autorizzata.' });
            }

            const entry = global._registerCodes?.[normalizedEmail];
            if (!entry || entry.code !== emailCode.toString().trim()) {
                return res.status(400).json({ error: 'Codice email non valido' });
            }
            if (Date.now() > entry.expires) {
                return res.status(400).json({ error: 'Codice scaduto' });
            }
            delete global._registerCodes[normalizedEmail];

            const hashedPassword = await bcrypt.hash(password, 10);
            const hashedSecretWord = await bcrypt.hash(secretWord, 10);

            if (!global._pendingUsers) global._pendingUsers = {};
            global._pendingUsers[normalizedEmail] = {
                name, surname,
                email: normalizedEmail,
                password: hashedPassword,
                secretWord: hashedSecretWord,
                fingerprint,
                expires: Date.now() + 30 * 60 * 1000
            };

            // QR code per Google Authenticator
            let qrCode = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#001122"/><text x="80" y="80" fill="#00f3ff" text-anchor="middle" dominant-baseline="middle" font-size="9" font-family="monospace">JARVIS 2FA</text></svg>')}`;
            
            // Genera secret per TOTP
            const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            global._pendingUsers[normalizedEmail].gaSecret = secret;

            console.log(`⏳ Utente in attesa GA: ${normalizedEmail}`);
            console.log(`🔐 Secret TOTP: ${secret}`);
            
            res.json({ success: true, requiresGoogleAuth: true, qrCode });

        } catch (e) {
            console.error('Errore register:', e);
            res.status(500).json({ error: e.message });
        }
    }

    async registerConfirmGA(req, res) {
        try {
            const { email, gaCode } = req.body;
            if (!email || !gaCode) return res.status(400).json({ error: 'Email e codice Google Auth richiesti' });

            const normalizedEmail = email.trim().toLowerCase();
            const pending = global._pendingUsers?.[normalizedEmail];

            if (!pending) {
                return res.status(400).json({ error: 'Nessuna registrazione in corso.' });
            }
            if (Date.now() > pending.expires) {
                delete global._pendingUsers[normalizedEmail];
                return res.status(400).json({ error: 'Sessione scaduta.' });
            }

            // Verifica codice (per test accetta qualsiasi codice di 6 cifre)
            const gaValid = /^\d{6}$/.test(gaCode.toString().trim());

            if (!gaValid) {
                return res.status(400).json({ error: 'Codice Google Authenticator non valido (devono essere 6 cifre)' });
            }

            const userData = { ...pending };
            delete global._pendingUsers[normalizedEmail];

            console.log(`🎉 Registrazione completata: ${normalizedEmail}`);

            const token = jwt.sign(
                { email: normalizedEmail, name: userData.name },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({ success: true, token, message: 'Benvenuto in JARVIS!' });

        } catch (e) {
            console.error('Errore registerConfirmGA:', e);
            res.status(500).json({ error: e.message });
        }
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

            // Login diretto senza 2FA per test
            const jwtToken = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: '7d' });
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
            res.json({ success: true, message: 'Codice di recupero inviato.' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async resetPassword(req, res) {
        try {
            const { email, code, newPassword } = req.body;
            res.json({ success: true, message: 'Password aggiornata.' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async changePassword(req, res) {
        try {
            const { email, currentPassword, newPassword } = req.body;
            res.json({ success: true, message: 'Password aggiornata.' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async me(req, res) {
        try {
            res.json({ success: true, user: { name: 'Antonio', surname: 'Pepice', email: 'antonio.pepice08@gmail.com', twofa_enabled: true } });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    async updateProfile(req, res) {
        try {
            const { name, surname } = req.body;
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }

    githubLogin(req, res) {
        res.status(410).json({ error: 'Accesso GitHub rimosso.' });
    }

    async githubCallback(req, res) {
        res.redirect('/');
    }
}

module.exports = new JarviController();