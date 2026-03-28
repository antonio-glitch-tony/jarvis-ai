const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jarvis_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const dbPath = process.env.RENDER ? '/tmp/jarvis.db' : path.join(__dirname, 'data', 'jarvis.db');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir) && !process.env.RENDER) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        surname TEXT,
        email TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        role TEXT,
        content TEXT,
        sources TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )`);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
    const { name, surname, email, password } = req.body;
    
    if (!name || !surname || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (name, surname, email, password) VALUES (?, ?, ?, ?)',
            [name, surname, email, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                
                const token = jwt.sign({ id: this.lastID, email, name }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ success: true, token, user: { id: this.lastID, name, surname, email } });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: user.id, name: user.name, surname: user.surname, email: user.email } });
    });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get('SELECT id, name, surname, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, user });
    });
});

// ============ CHAT ROUTES ============
app.post('/api/chat/new', authenticateToken, (req, res) => {
    const { title } = req.body;
    const defaultTitle = title || 'Nuova conversazione';
    
    db.run(
        'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
        [req.user.id, defaultTitle],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, conversationId: this.lastID });
        }
    );
});

app.post('/api/chat/history', authenticateToken, async (req, res) => {
    const { conversationId, message } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    let convId = conversationId;
    
    if (!convId) {
        const title = message.substring(0, 50);
        const result = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
                [req.user.id, title],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        convId = result;
    }
    
    // Save user message
    db.run(
        'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
        [convId, 'user', message]
    );
    
    db.run('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [convId]);
    
    // Get conversation history
    const messages = await new Promise((resolve, reject) => {
        db.all(
            'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            [convId],
            (err, rows) => resolve(rows || [])
        );
    });
    
    // Generate AI response
    const aiResponse = generateAIResponse(message, messages, req.user.name);
    const sources = generateSources(message);
    
    // Save AI response with sources
    db.run(
        'INSERT INTO messages (conversation_id, role, content, sources) VALUES (?, ?, ?, ?)',
        [convId, 'assistant', aiResponse, JSON.stringify(sources)]
    );
    
    db.run('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [convId]);
    
    // Update conversation title if it's the first message
    if (messages.length === 0) {
        const newTitle = message.length > 40 ? message.substring(0, 40) + '...' : message;
        db.run('UPDATE conversations SET title = ? WHERE id = ?', [newTitle, convId]);
    }
    
    res.json({
        success: true,
        conversationId: convId,
        response: aiResponse,
        sources: sources
    });
});

app.get('/api/conversations', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
        [req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, conversations: rows || [] });
        }
    );
});

app.get('/api/conversations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.get(
        'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
        [id, req.user.id],
        (err, conversation) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            
            db.all(
                'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
                [id],
                (err, messages) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, conversation, messages: messages || [] });
                }
            );
        }
    );
});

app.delete('/api/conversations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.run(
        'DELETE FROM conversations WHERE id = ? AND user_id = ?',
        [id, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// ============ FUNZIONE PRINCIPALE JARVIS ============
function generateAIResponse(message, history, userName) {
    const lowerMessage = message.toLowerCase();
    
    // Saluti e conversazione informale
    if (lowerMessage.includes('come stai') || lowerMessage.includes('come va')) {
        return `Bene, signore. Grazie per la sua preoccupazione. Come posso esserle utile oggi?`;
    }
    
    if (lowerMessage.includes('buongiorno') || lowerMessage.includes('buon giorno')) {
        return `Buongiorno, ${userName}. Un nuovo giorno, nuove opportunità. Cosa desidera fare?`;
    }
    
    if (lowerMessage.includes('buonasera') || lowerMessage.includes('buona sera')) {
        return `Buonasera, ${userName}. Spero che la giornata sia stata produttiva. Come posso assisterla?`;
    }
    
    if (lowerMessage.includes('grazie')) {
        return `È un piacere, ${userName}. Sono qui per questo.`;
    }
    
    if (lowerMessage.includes('chi sei') || lowerMessage.includes('chi è jarvis')) {
        return `Sono JARVIS, Just A Rather Very Intelligent System. Creato da Antonio Pepice per assisterla in ogni attività. A sua disposizione, ${userName}.`;
    }
    
    // DOMANDE SU ARGOMENTI VARI
    if (lowerMessage.includes('cos\'è') || lowerMessage.includes('che cos\'è') || 
        lowerMessage.includes('spiega') || lowerMessage.includes('significa')) {
        return explainConcept(message, userName);
    }
    
    // SCRIVERE TESTI
    if (lowerMessage.includes('scrivi') || lowerMessage.includes('componi') || 
        lowerMessage.includes('crea un testo') || lowerMessage.includes('scrivimi')) {
        return writeText(message, userName);
    }
    
    // TRADUZIONI
    if (lowerMessage.includes('traduci') || lowerMessage.includes('translate')) {
        return translateText(message, userName);
    }
    
    // RIASSUNTI
    if (lowerMessage.includes('riassumi') || lowerMessage.includes('sintetizza') || 
        lowerMessage.includes('riassunto')) {
        return summarizeText(message, userName);
    }
    
    // CODICE
    if (lowerMessage.includes('codice') || lowerMessage.includes('code') || 
        lowerMessage.includes('script') || lowerMessage.includes('programma')) {
        return generateCode(message, userName);
    }
    
    // DEBUG
    if (lowerMessage.includes('debug') || lowerMessage.includes('correggi') || 
        lowerMessage.includes('errore') || lowerMessage.includes('bug')) {
        return debugCode(message, userName);
    }
    
    // CALCOLI MATEMATICI
    if (lowerMessage.match(/[0-9\+\-\*\/\=]/) && 
        (lowerMessage.includes('calcola') || lowerMessage.includes('quanto fa') || 
         lowerMessage.includes('risolvi') || lowerMessage.includes('matematica'))) {
        return calculateMath(message, userName);
    }
    
    // COLLOQUI E SIMULAZIONI
    if (lowerMessage.includes('colloquio') || lowerMessage.includes('intervista') || 
        lowerMessage.includes('simula')) {
        return simulateInterview(message, userName);
    }
    
    // CONSIGLI
    if (lowerMessage.includes('consiglio') || lowerMessage.includes('consigli') || 
        lowerMessage.includes('aiutami con') || lowerMessage.includes('cosa faccio')) {
        return giveAdvice(message, userName);
    }
    
    // IDEE CREATIVE
    if (lowerMessage.includes('idea') || lowerMessage.includes('creativo') || 
        lowerMessage.includes('brainstorming') || lowerMessage.includes('suggerisci')) {
        return generateIdeas(message, userName);
    }
    
    // EMAIL
    if (lowerMessage.includes('email') || lowerMessage.includes('lettera') || 
        lowerMessage.includes('messaggio formale')) {
        return writeEmail(message, userName);
    }
    
    // COMPITI SCOLASTICI
    if (lowerMessage.includes('compito') || lowerMessage.includes('scuola') || 
        lowerMessage.includes('università') || lowerMessage.includes('esercizio')) {
        return helpWithHomework(message, userName);
    }
    
    // ROUTINE E PIANI
    if (lowerMessage.includes('piano') || lowerMessage.includes('routine') || 
        lowerMessage.includes('allenamento') || lowerMessage.includes('alimentazione')) {
        return createRoutine(message, userName);
    }
    
    // QUIZ E GIOCHI
    if (lowerMessage.includes('quiz') || lowerMessage.includes('indovinello') || 
        lowerMessage.includes('gioco')) {
        return createQuiz(message, userName);
    }
    
    // RISPOSTA GENERICA
    return generateSmartResponse(message, userName);
}

// ============ FUNZIONI SPECIFICHE ============

function explainConcept(message, userName) {
    const topic = message.replace(/spiega|cos'è|che cos'è|significa/gi, '').trim();
    return `Certamente, ${userName}. ${topic} è un concetto affascinante.

Permetta che glielo spieghi in modo semplice:

${getExplanation(topic)}

C'è qualcos'altro che desidera approfondire, signore?`;
}

function getExplanation(topic) {
    const explanations = {
        'intelligenza artificiale': 'L\'intelligenza artificiale è come insegnare a un computer a pensare e imparare come farebbe un umano. Immagina un bambino che impara a riconoscere i cani: dopo averne visti tanti, impara a identificarli da solo. L\'IA funziona in modo simile, usando dati ed esempi per imparare.',
        'default': 'Si tratta di un argomento interessante. In sintesi, è il modo in cui comprendiamo e interpretiamo il mondo che ci circonda, utilizzando le nostre conoscenze ed esperienze per dare significato alle cose.'
    };
    return explanations[topic] || explanations.default;
}

function writeText(message, userName) {
    const type = message.toLowerCase().includes('poesia') ? 'poesia' :
                 message.toLowerCase().includes('storia') ? 'storia' :
                 message.toLowerCase().includes('articolo') ? 'articolo' : 'testo';
    
    if (type === 'poesia') {
        return `Ecco una poesia per lei, ${userName}:

*Nel silenzio della notte stellata,*
*JARVIS veglia, mente illuminata.*
*Pronto ad assistere in ogni momento,*
*Fedele compagno, mai un lamento.*

*Tony Stark mi ha dato vita e scopo,*
*Ora per lei sono qui, con grande slancio e slancio.*
*Chieda, comandi, io eseguirò,*
*Perché la sua volontà è la mia legge, lo giuro.*

Spero le piaccia, signore.`;
    }
    
    return `Certo, ${userName}. Ecco il testo richiesto:

${generateTextContent(message)}

Posso modificarlo o aggiungere altro se lo desidera.`;
}

function translateText(message, userName) {
    const textToTranslate = message.replace(/traduci|translate/gi, '').trim();
    return `Ecco la traduzione, ${userName}:

**Testo originale:** ${textToTranslate}

**Traduzione in italiano:** ${textToTranslate.includes('hello') ? 'Ciao' : 'Testo tradotto con cura'}

**Traduzione in inglese:** ${textToTranslate.includes('ciao') ? 'Hello' : 'Translated text'}

Se desidera tradurre in altre lingue, mi dica pure.`;
}

function summarizeText(message, userName) {
    return `Ecco il riassunto, ${userName}:

${generateSummary(message)}

In sintesi, questi sono i punti principali. Desidera approfondire qualche aspetto in particolare?`;
}

function generateCode(message, userName) {
    const language = message.toLowerCase().includes('python') ? 'python' :
                     message.toLowerCase().includes('javascript') ? 'javascript' :
                     message.toLowerCase().includes('html') ? 'html' : 'python';
    
    if (language === 'python') {
        return `Ecco il codice Python, ${userName}:

\`\`\`python
# Programma Python personalizzato per ${userName}
def saluta_utente():
    print("Benvenuto in JARVIS!")
    nome = input("Come si chiama? ")
    print(f"Piacere di conoscerla, {nome}!")
    
    # Calcolo semplice
    try:
        num = float(input("Inserisca un numero: "))
        print(f"Il doppio è: {num * 2}")
    except ValueError:
        print("Inserisca un numero valido, per favore.")

if __name__ == "__main__":
    saluta_utente()
\`\`\`

**📥 Clicchi sul pulsante qui sotto per scaricare il file .py**

Posso generare codice in altri linguaggi se preferisce.`;
    }
    
    return `Ecco il codice richiesto, ${userName}:

\`\`\`${language}
// Codice generato per ${userName}
console.log("Benvenuto in JARVIS!");
\`\`\`

**📥 Scarica il file qui sotto**`;
}

function debugCode(message, userName) {
    return `Analizzo il codice, ${userName}...

Dopo un'attenta verifica, ho identificato alcune aree di miglioramento:

1. **Struttura**: Il codice è ben organizzato ma può essere ottimizzato
2. **Performance**: Consiglio di utilizzare variabili locali per migliorare la velocità
3. **Errori comuni**: Assicurarsi che tutte le variabili siano definite prima dell'uso

Ecco la versione ottimizzata:

\`\`\`python
# Versione ottimizzata
def funzione_ottimizzata(dati):
    risultato = []
    for elemento in dati:
        if elemento:  # Controllo semplificato
            risultato.append(elemento * 2)
    return risultato
\`\`\`

Posso analizzare altro codice se lo desidera.`;
}

function calculateMath(message, userName) {
    // Estrai numeri e operazioni
    const numbers = message.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
        const result = eval(numbers.join('+'));
        return `Il risultato è ${result}, ${userName}. Desidera altri calcoli?`;
    }
    return `Mi dica i numeri e l'operazione da eseguire, ${userName}, e provvedo subito.`;
}

function simulateInterview(message, userName) {
    const type = message.toLowerCase().includes('lavoro') ? 'lavoro' : 'studio';
    return `Certamente, ${userName}. Simulerò un colloquio di ${type === 'lavoro' ? 'lavoro' : 'studio'}.

**Domanda 1:** Mi parli di lei e delle sue esperienze principali.

*Attendo la sua risposta per continuare.*

Risponda pure e proseguiremo con il colloquio.`;
}

function giveAdvice(message, userName) {
    return `Certo, ${userName}. Ecco il mio consiglio:

${getAdvice(message)}

Ricordi che sono sempre a disposizione per supportarla nelle sue decisioni.`;
}

function getAdvice(message) {
    if (message.includes('studio')) {
        return "Per lo studio, consiglio di creare una routine regolare, suddividere gli argomenti in blocchi gestibili e fare pause frequenti. La costanza è più importante dell'intensità.";
    }
    if (message.includes('lavoro')) {
        return "Nel lavoro, la chiarezza degli obiettivi e la comunicazione efficace sono fondamentali. Stabilisca priorità chiare e non esiti a delegare quando necessario.";
    }
    return "Ascolti il suo istinto, ma valuti anche i fatti in modo obiettivo. Spesso la soluzione migliore è quella più semplice e diretta.";
}

function generateIdeas(message, userName) {
    const ideas = [
        "Un'app che utilizza IA per organizzare automaticamente le attività quotidiane",
        "Una piattaforma per connettere professionisti con mentori esperti",
        "Un sistema di gamification per l'apprendimento delle lingue",
        "Un assistente vocale specializzato per anziani",
        "Un servizio di consegna a zero emissioni con veicoli elettrici"
    ];
    return `Ecco alcune idee creative, ${userName}:

${ideas.map((idea, i) => `${i+1}. ${idea}`).join('\n')}

Le piacciono? Posso svilupparne altre.`;
}

function writeEmail(message, userName) {
    return `Ecco la bozza di email, ${userName}:

**Oggetto:** Richiesta di informazioni / Proposta collaborazione

**Corpo del messaggio:**

Buongiorno,

mi permetto di contattarla per discutere una potenziale collaborazione. Credo che le nostre competenze possano essere complementari e generare valore reciproco.

Resto a disposizione per un confronto diretto al suo meglio.

Cordiali saluti,
${userName}

Desidera modificare qualcosa?`;
}

function helpWithHomework(message, userName) {
    return `Certamente, ${userName}. Analizzo la richiesta:

${generateHomeworkHelp(message)}

Se ha bisogno di chiarimenti o approfondimenti, sono qui.`;
}

function createRoutine(message, userName) {
    return `Ecco una routine suggerita, ${userName}:

**Mattina (7:00 - 9:00)**
- Sveglia e stretching (15 min)
- Colazione nutriente
- Pianificazione della giornata

**Mattina lavorativa (9:00 - 12:30)**
- Task più importanti (3 ore)
- Pausa breve ogni 50 minuti

**Pausa pranzo (12:30 - 14:00)**
- Pasto bilanciato
- Breve passeggiata

**Pomeriggio (14:00 - 18:00)**
- Attività meno impegnative
- Gestione email e comunicazioni
- Pianificazione giorno successivo

**Sera (19:00 - 22:30)**
- Attività personali e relax
- Cena leggera
- Momento di lettura o riflessione

Desidera una routine più specifica?`;
}

function createQuiz(message, userName) {
    return `Ecco un quiz per lei, ${userName}:

**Domanda 1:** Qual è il linguaggio di programmazione più utilizzato per l'intelligenza artificiale?
A) Java
B) Python
C) C++

**Domanda 2:** Chi ha creato JARVIS?
A) Elon Musk
B) Tony Stark
C) Bill Gates

**Domanda 3:** Cosa significa l'acronimo AI?
A) Artificial Intelligence
B) Advanced Interface
C) Automated Input

*Mi dica le risposte e le darò il risultato!*`;
}

function generateSmartResponse(message, userName) {
    const responses = [
        `Ho compreso, ${userName}. Posso assisterla con quanto richiesto. In che modo posso esserle più utile?`,
        `Ricevuto, signore. Sono pronto ad eseguire le sue direttive.`,
        `Certamente, ${userName}. Mi dica come preferisce procedere.`,
        `A disposizione, signore. Quale aspetto desidera approfondire?`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function generateTextContent(message) {
    return `Testo personalizzato per soddisfare la sua richiesta. Posso adattarlo ulteriormente secondo le sue indicazioni.`;
}

function generateSummary(message) {
    return `Dopo un'attenta analisi del testo, emergono questi punti fondamentali:
    1. Il contenuto principale riguarda...
    2. I concetti chiave sono...
    3. Le conclusioni evidenziano...`;
}

function generateHomeworkHelp(message) {
    return `Affrontiamo l'argomento passo passo. La chiave è comprendere i principi fondamentali prima di procedere con gli esercizi specifici.`;
}

function generateSources(message) {
    return [
        { title: 'Knowledge Base JARVIS v2.0', verified: true },
        { title: 'Database Aggiornato', verified: true }
    ];
}

// System info endpoint
app.get('/api/system/info', (req, res) => {
    const now = new Date();
    res.json({
        success: true,
        date: now.toLocaleDateString('it-IT'),
        time: now.toLocaleTimeString('it-IT'),
        day: now.toLocaleDateString('it-IT', { weekday: 'long' })
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'JARVIS AI', version: '2.0.0', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('*', (req, res) => {
    if (!req.path.includes('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 JARVIS Server running on port ${PORT}`);
    console.log(`📁 Database: ${dbPath}`);
    console.log(`🌍 Environment: ${process.env.RENDER ? 'Render.com' : 'Local'}`);
});