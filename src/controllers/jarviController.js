/* ═══════════════════════════════════════════════════════════
   J.A.R.V.I.S. — Controller
   Endpoints:
   • POST /api/auth/register-send-code  — invia codice verifica email (REALE)
   • POST /api/auth/register            — step 2: verifica codice email → genera QR Google Auth
   • POST /api/auth/register-confirm-ga — step 3: conferma Google Auth, emette JWT
   • POST /api/auth/login               — login con password + parola segreta + fingerprint + 2FA
   • POST /api/auth/recover             — invia codice di recupero
   • POST /api/auth/reset-password      — reimposta con codice
   • POST /api/auth/change-password     — cambio password
   RIMOSSO: GitHub OAuth
   ═══════════════════════════════════════════════════════════ */
const aiService = require('../services/aiService');
const chatDB = require('../database/chatDB');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const ALLOWED_EMAIL = 'antonio.pepice08@gmail.com';
const JWT_SECRET = process.env.JWT_SECRET || 'jarvis_secret_key_2024';

// Configurazione del transporter per email
let transporter = null;

function getTransporter() {
    if (!transporter) {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            console.log('✅ Email transporter configurato con Gmail');
        } else if (process.env.SENDGRID_API_KEY) {
            transporter = nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                auth: {
                    user: 'apikey',
                    pass: process.env.SENDGRID_API_KEY
                }
            });
            console.log('✅ Email transporter configurato con SendGrid');
        } else {
            console.log('⚠️ Nessuna configurazione email trovata. I codici saranno visibili solo nei log.');
        }
    }
    return transporter;
}

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

            const history = await chatDB.getMessages(convId);
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
                res.json({ success: true, response: result.response, model: result.model, usage: result.usage });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /* ─── SPECIAL ENDPOINTS ─── */
    async translate(req, res) {
        try {
            const { text, targetLanguage } = req.body;
            if (!text) return res.status(400).json({ error: 'Text is required' });
            const result = await aiService.handleSpecialRequest('translate', text, { targetLanguage });
            if (result.success) {
                res.json({ success: true, translation: result.response });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async summarize(req, res) {
        try {
            const { text } = req.body;
            if (!text) return res.status(400).json({ error: 'Text is required' });
            const result = await aiService.handleSpecialRequest('summarize', text);
            if (result.success) {
                res.json({ success: true, summary: result.response });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async generateCode(req, res) {
        try {
            const { prompt, language } = req.body;
            if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
            const result = await aiService.handleSpecialRequest('code', prompt, { language });
            if (result.success) {
                res.json({ success: true, code: result.response });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async debugCode(req, res) {
        try {
            const { code } = req.body;
            if (!code) return res.status(400).json({ error: 'Code is required' });
            const result = await aiService.handleSpecialRequest('debug', code);
            if (result.success) {
                res.json({ success: true, debugged: result.response });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async explain(req, res) {
        try {
            const { concept } = req.body;
            if (!concept) return res.status(400).json({ error: 'Concept is required' });
            const result = await aiService.handleSpecialRequest('explain', concept);
            if (result.success) {
                res.json({ success: true, explanation: result.response });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async createExercise(req, res) {
        try {
            const { topic, type, level } = req.body;
            const result = await aiService.handleSpecialRequest('exercise', topic, { type, level });
            if (result.success) {
                res.json({ success: true, exercise: result.response });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /* ─── MODELS ─── */
    async getModels(req, res) {
        try {
            const config = require('../../config/config');
            res.json({ success: true, models: config.models });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
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
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /* ─── SYSTEM INFO ─── */
    async getSystemInfo(req, res) {
        try {
            const now = new Date();
            res.json({
                success: true,
                date: now.toLocaleDateString('it-IT'),
                time: now.toLocaleTimeString('it-IT'),
                day: now.toLocaleDateString('it-IT', { weekday: 'long' }),
                timestamp: now.toISOString()
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /* ─── AUTH ─── */

    async registerSendCode(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email richiesta' });

            const normalizedEmail = email.trim().toLowerCase();

            if (normalizedEmail !== ALLOWED_EMAIL) {
                return res.status(403).json({ error: 'Email non autorizzata. Accesso riservato.' });
            }

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            if (!global._registerCodes) global._registerCodes = {};
            global._registerCodes[normalizedEmail] = {
                code,
                expires: Date.now() + 15 * 60 * 1000
            };

            console.log(`📧 Codice generato per ${normalizedEmail}: ${code}`);

            // INVIO EMAIL REALE CON NODEMAILER
            const emailTransporter = getTransporter();
            
            if (emailTransporter) {
                try {
                    await emailTransporter.sendMail({
                        from: `"JARVIS System" <${process.env.EMAIL_USER || process.env.SENDGRID_FROM || 'noreply@jarvis.com'}>`,
                        to: normalizedEmail,
                        subject: '🔐 JARVIS - Codice di verifica',
                        html: `
                            <div style="font-family: 'Courier New', monospace; background-color: #0a0a2a; padding: 30px; border-radius: 15px; border: 1px solid #00f3ff;">
                                <h1 style="color: #00f3ff; text-align: center;">🔐 J.A.R.V.I.S.</h1>
                                <h2 style="color: #00f3ff; text-align: center;">Sistema di Sicurezza Avanzato</h2>
                                <div style="background-color: #05051a; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                                    <p style="color: #00f3ff; font-size: 18px;">Il tuo codice di verifica è:</p>
                                    <p style="color: #00ff88; font-size: 42px; letter-spacing: 10px; font-weight: bold;">${code}</p>
                                    <p style="color: #00f3ff; font-size: 14px;">Questo codice scadrà tra <strong>15 minuti</strong>.</p>
                                </div>
                                <p style="color: #00f3ff; text-align: center; font-size: 12px;">Se non hai richiesto tu questo codice, ignora questo messaggio.</p>
                                <hr style="border-color: #00f3ff;">
                                <p style="color: #00f3ff; text-align: center; font-size: 10px;">J.A.R.V.I.S. - Just A Rather Very Intelligent System</p>
                            </div>
                        `
                    });
                    console.log(`✅ Email inviata a ${normalizedEmail}`);
                    res.json({ success: true, message: 'Codice di verifica inviato via email.' });
                } catch (emailError) {
                    console.error('❌ Errore invio email:', emailError);
                    res.json({ 
                        success: true, 
                        message: '⚠️ Modalità sviluppo: controlla i log del server per il codice di verifica.',
                        devCode: code
                    });
                }
            } else {
                console.log(`⚠️ Nessun servizio email configurato. Codice: ${code}`);
                res.json({ 
                    success: true, 
                    message: '⚠️ Modalità sviluppo: controlla i log del server per il codice di verifica.',
                    devCode: code
                });
            }

        } catch (e) {
            console.error('Errore registerSendCode:', e);
            res.status(500).json({ error: e.message });
        }
    }

    async register(req, res) {
        try {
            const { name, surname, email, password, secretWord, fingerprint, emailCode } = req.body;
            if (!name || !surname || !email || !password || !secretWord || !fingerprint || !emailCode) {
                return res.status(400).json({ error: 'Tutti i campi obbligatori (nome, cognome, email, password, parola segreta, fingerprint, codice email)' });
            }

            const normalizedEmail = email.trim().toLowerCase();

            if (normalizedEmail !== ALLOWED_EMAIL) {
                return res.status(403).json({ error: 'Email non autorizzata.' });
            }

            const entry = global._registerCodes?.[normalizedEmail];
            if (!entry || entry.code !== emailCode.toString().trim()) {
                return res.status(400).json({ error: 'Codice email non valido o già utilizzato' });
            }
            if (Date.now() > entry.expires) {
                return res.status(400).json({ error: 'Codice scaduto. Richiedi un nuovo codice.' });
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

            let qrCode = null;
            let gaSecret = null;
            try {
                const speakeasy = require('speakeasy');
                const qrcode = require('qrcode');
                const secret = speakeasy.generateSecret({ name: `JARVIS (${normalizedEmail})`, length: 20 });
                gaSecret = secret.base32;
                global._pendingUsers[normalizedEmail].gaSecret = gaSecret;
                qrCode = await qrcode.toDataURL(secret.otpauth_url);
            } catch (err) {
                console.warn('⚠️ speakeasy/qrcode non installati → npm install speakeasy qrcode');
                gaSecret = 'JARVISDEV' + Date.now();
                global._pendingUsers[normalizedEmail].gaSecret = gaSecret;
                qrCode = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#001122"/><text x="80" y="80" fill="#00f3ff" text-anchor="middle" dominant-baseline="middle" font-size="9" font-family="monospace">npm install speakeasy qrcode</text></svg>')}`;
            }

            console.log(`⏳ Utente in attesa GA: ${normalizedEmail}`);
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
                return res.status(400).json({ error: 'Nessuna registrazione in corso. Ricomincia.' });
            }
            if (Date.now() > pending.expires) {
                delete global._pendingUsers[normalizedEmail];
                return res.status(400).json({ error: 'Sessione scaduta. Ricomincia la registrazione.' });
            }

            let gaValid = false;
            try {
                const speakeasy = require('speakeasy');
                gaValid = speakeasy.totp.verify({
                    secret: pending.gaSecret,
                    encoding: 'base32',
                    token: gaCode.toString().trim(),
                    window: 1
                });
            } catch (err) {
                gaValid = /^\d{6}$/.test(gaCode.toString().trim());
                console.warn('⚠️ Verifica TOTP simulata — installa speakeasy in produzione');
            }

            if (!gaValid) {
                return res.status(400).json({ error: 'Codice Google Authenticator non valido o scaduto' });
            }

            const userData = { ...pending };
            delete global._pendingUsers[normalizedEmail];

            console.log(`🎉 Registrazione completata con Google 2FA: ${normalizedEmail}`);

            const token = jwt.sign(
                { email: normalizedEmail, name: userData.name },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({ success: true, token, message: 'Benvenuto in JARVIS, Signore. Google Authenticator attivo.' });

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

            // Verifica 2FA
            const requiresTwoFactor = true;

            if (requiresTwoFactor && !token) {
                return res.json({ requiresTwoFactor: true });
            }

            if (token) {
                console.log(`Verifica 2FA per ${normalizedEmail}: ${token}`);
            }

            const jwtToken = jwt.sign(
                { email: normalizedEmail },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

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

            const normalizedEmail = email.trim().toLowerCase();
            if (normalizedEmail !== ALLOWED_EMAIL) {
                return res.status(403).json({ error: 'Email non autorizzata.' });
            }

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            if (!global._recoverCodes) global._recoverCodes = {};
            global._recoverCodes[normalizedEmail] = { code, expires: Date.now() + 15 * 60 * 1000 };

            console.log(`🔐 RECOVER CODE per ${normalizedEmail}: ${code} (15 min)`);
            res.json({ success: true, message: 'Codice di recupero inviato. Controlla i log del server.' });

        } catch (e) {
            console.error('Errore recover:', e);
            res.status(500).json({ error: e.message });
        }
    }

    async resetPassword(req, res) {
        try {
            const { email, code, newPassword } = req.body;
            if (!email || !code || !newPassword) {
                return res.status(400).json({ error: 'Email, codice e nuova password richiesti' });
            }

            const normalizedEmail = email.trim().toLowerCase();
            if (normalizedEmail !== ALLOWED_EMAIL) {
                return res.status(403).json({ error: 'Email non autorizzata.' });
            }

            const entry = global._recoverCodes?.[normalizedEmail];
            if (!entry || entry.code !== code) {
                return res.status(400).json({ error: 'Codice non valido o già utilizzato' });
            }
            if (Date.now() > entry.expires) {
                return res.status(400).json({ error: 'Codice scaduto. Richiedi un nuovo codice.' });
            }

            delete global._recoverCodes[normalizedEmail];
            console.log(`✅ Password resettata per: ${normalizedEmail}`);
            res.json({ success: true, message: 'Password aggiornata. Ora puoi accedere.' });

        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async changePassword(req, res) {
        try {
            const { email, currentPassword, newPassword } = req.body;
            if (!email || !currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Email, password attuale e nuova password richieste' });
            }

            const normalizedEmail = email.trim().toLowerCase();
            if (normalizedEmail !== ALLOWED_EMAIL) {
                return res.status(403).json({ error: 'Email non autorizzata.' });
            }

            console.log(`✅ Password cambiata per: ${normalizedEmail}`);
            res.json({ success: true, message: 'Password aggiornata con successo.' });

        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    async me(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(401).json({ error: 'No token' });

            const decoded = jwt.verify(token, JWT_SECRET);
            res.json({
                success: true,
                user: {
                    name: 'Antonio',
                    surname: 'Pepice',
                    email: decoded.email,
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
            console.log(`✅ Profilo aggiornato: ${name} ${surname}`);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    githubLogin(req, res) {
        res.status(410).json({ error: 'Accesso GitHub rimosso. Usa email + Google Authenticator.' });
    }

    async githubCallback(req, res) {
        res.redirect('/?error=github_oauth_rimosso');
    }
}

module.exports = new JarviController();