const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class ChatDatabase {
  constructor() {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.dbPath = path.join(dataDir, 'chats.db');
    this.db = null;
    this.init();
  }

  init() {
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('❌ Errore database:', err);
      } else {
        console.log('✅ Database SQLite connesso');
        this.createTables();
      }
    });
  }

  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        role TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);
  }

  createConversation(title) {
    return new Promise((resolve, reject) => {
      const defaultTitle = title || `Chat ${new Date().toLocaleString()}`;
      this.db.run(
        'INSERT INTO conversations (title) VALUES (?)',
        [defaultTitle],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  saveMessage(conversationId, role, content) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
        [conversationId, role, content],
        function(err) {
          if (err) reject(err);
          else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  updateConversationTime(conversationId) {
    this.db.run(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );
  }

  getConversations() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM conversations ORDER BY updated_at DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  getMessages(conversationId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  deleteConversation(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM messages WHERE conversation_id = ?', [id], (err) => {
        if (err) reject(err);
        else {
          this.db.run('DELETE FROM conversations WHERE id = ?', [id], function(err) {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }
}

module.exports = new ChatDatabase();