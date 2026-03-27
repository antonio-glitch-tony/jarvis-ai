const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class ChatDatabase {
  constructor() {
    this.db = null;
    this.isAvailable = false;
    this.dbPath = null;
    this.init();
  }

  init() {
    try {
      const dataDir = path.join(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('📁 Cartella data creata:', dataDir);
      }
      
      this.dbPath = path.join(dataDir, 'chats.db');
      
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Errore connessione database:', err.message);
          this.isAvailable = false;
        } else {
          console.log('✅ Database SQLite connesso:', this.dbPath);
          this.isAvailable = true;
          this.createTables();
        }
      });
    } catch (err) {
      console.error('❌ Database non disponibile:', err.message);
      this.isAvailable = false;
    }
  }

  createTables() {
    if (!this.isAvailable || !this.db) return;
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Errore creazione tabella conversations:', err.message);
    });

    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        role TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Errore creazione tabella messages:', err.message);
    });
  }

  createConversation(title) {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable || !this.db) {
        console.warn('⚠️ Database non disponibile, creo conversazione temporanea');
        resolve(Date.now()); // ID temporaneo
        return;
      }
      
      const defaultTitle = title || `Chat ${new Date().toLocaleString()}`;
      this.db.run(
        'INSERT INTO conversations (title) VALUES (?)',
        [defaultTitle],
        function(err) {
          if (err) {
            console.error('Errore createConversation:', err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  saveMessage(conversationId, role, content) {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable || !this.db) {
        console.warn('⚠️ Database non disponibile, messaggio non salvato');
        resolve(Date.now());
        return;
      }
      
      this.db.run(
        'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
        [conversationId, role, content],
        function(err) {
          if (err) {
            console.error('Errore saveMessage:', err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  updateConversationTime(conversationId) {
    if (!this.isAvailable || !this.db) return;
    this.db.run(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );
  }

  getConversations() {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable || !this.db) {
        console.warn('⚠️ Database non disponibile, restituisco lista vuota');
        resolve([]);
        return;
      }
      
      this.db.all(
        'SELECT * FROM conversations ORDER BY updated_at DESC',
        (err, rows) => {
          if (err) {
            console.error('Errore getConversations:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  getMessages(conversationId) {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable || !this.db) {
        console.warn('⚠️ Database non disponibile, restituisco messaggi vuoti');
        resolve([]);
        return;
      }
      
      this.db.all(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId],
        (err, rows) => {
          if (err) {
            console.error('Errore getMessages:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  deleteConversation(id) {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable || !this.db) {
        console.warn('⚠️ Database non disponibile, impossibile eliminare');
        resolve();
        return;
      }
      
      this.db.run('DELETE FROM messages WHERE conversation_id = ?', [id], (err) => {
        if (err) {
          console.error('Errore delete messages:', err);
          reject(err);
        } else {
          this.db.run('DELETE FROM conversations WHERE id = ?', [id], function(err) {
            if (err) {
              console.error('Errore delete conversation:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });
  }
}

module.exports = new ChatDatabase();