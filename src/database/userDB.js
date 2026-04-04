/* ═══════════════════════════════════════════════════════════
   B.A.R.R.Y. — User Database (SQLite) — PERSISTENTE
   • Memorizza tutti gli utenti registrati
   • Traccia lo stato della registrazione
   ═══════════════════════════════════════════════════════════ */
const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

class UserDatabase {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        try {
            const dataDir = path.join(__dirname, '../../data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            const dbPath = path.join(dataDir, 'users.db');
            this.db = new sqlite3.Database(dbPath);
            
            // Crea tabella utenti se non esiste
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    email           TEXT UNIQUE NOT NULL,
                    name            TEXT,
                    surname         TEXT,
                    encrypted_name   TEXT,
                    encrypted_surname TEXT,
                    encryption_salt  TEXT,
                    password_hash    TEXT,
                    secret_word_hash TEXT,
                    fingerprint_hash TEXT,
                    ga_secret        TEXT,
                    twofa_enabled    INTEGER DEFAULT 1,
                    completed        INTEGER DEFAULT 0,
                    email_verified   INTEGER DEFAULT 0,
                    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
                    registered_at    DATETIME,
                    last_login       DATETIME,
                    ip_address       TEXT,
                    user_agent       TEXT
                )
            `);
            
            // Tabella per i tentativi di login falliti
            this.db.run(`
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    email      TEXT,
                    ip_address TEXT,
                    success    INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            console.log('✅ Database utenti SQLite inizializzato');
        } catch (err) {
            console.error('❌ Errore init userDB:', err);
        }
    }

    // Salva o aggiorna un utente
    saveUser(userData) {
        return new Promise((resolve, reject) => {
            const { email, encryptedName, encryptedSurname, encryptionSalt, 
                    passwordHash, secretWordHash, fingerprintHash, gaSecret,
                    completed, emailVerified, name, surname } = userData;
            
            this.db.run(`
                INSERT OR REPLACE INTO users 
                (email, name, surname, encrypted_name, encrypted_surname, encryption_salt,
                 password_hash, secret_word_hash, fingerprint_hash, ga_secret,
                 completed, email_verified, registered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [email, name || null, surname || null, encryptedName, encryptedSurname, encryptionSalt,
                passwordHash, secretWordHash, fingerprintHash, gaSecret,
                completed ? 1 : 0, emailVerified ? 1 : 0], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Ottieni tutti gli utenti
    getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT id, email, name, surname, completed, email_verified, 
                       twofa_enabled, created_at, registered_at, last_login
                FROM users 
                ORDER BY created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // Ottieni un utente per email
    getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Aggiorna ultimo login
    updateLastLogin(email, ip, userAgent) {
        this.db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP, ip_address = ?, user_agent = ? WHERE email = ?`, 
                    [ip, userAgent, email]);
    }

    // Registra tentativo di login
    logLoginAttempt(email, ip, success) {
        this.db.run(`INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, ?)`, 
                    [email, ip, success ? 1 : 0]);
    }

    // Elimina utente
    deleteUser(email) {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM users WHERE email = ?`, [email], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = new UserDatabase();