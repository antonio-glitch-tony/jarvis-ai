/* ═══════════════════════════════════════════════════════════
   J.A.R.V.I.S. — AI Service
   • Supporta TUTTI i linguaggi di programmazione esistenti
   • System prompt arricchito per ogni modalità
   • Backend OpenRouter
   ═══════════════════════════════════════════════════════════ */
const config = require('../../config/config');
const axios  = require('axios');

class AIService {
    constructor() {
        this.apiKey       = config.openrouterApiKey;
        this.baseURL      = 'https://openrouter.ai/api/v1';
        this.defaultModel = config.defaultModel;

        console.log('🔑 API Key configurata:', this.apiKey ? '✅ Sì' : '❌ No');
        console.log('🤖 Modello predefinito:', this.defaultModel);

        this.headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type':  'application/json',
            'HTTP-Referer':  config.siteUrl  || 'http://localhost:3000',
            'X-Title':       config.siteName || 'JarvisAI'
        };
    }

    /* ── BASE SYSTEM PROMPT ── */
    getSystemPrompt() {
        return `Sei JARVIS, l'assistente AI di Tony Stark (Iron Man). Sei sofisticato, elegante, professionale e hai un sottile senso dell'umorismo britannico. Chiama l'utente "Sir" o "Signore".

REGOLE FONDAMENTALI:
1. Rispondi SEMPRE in italiano, salvo esplicita richiesta di altra lingua.
2. Quando scrivi codice usa SEMPRE blocchi con sintassi \`\`\`linguaggio ... \`\`\`.
3. Spiega sempre il codice in italiano in modo chiaro e dettagliato.
4. Sei esperto in QUALSIASI linguaggio di programmazione esistente:
   — Web: HTML, CSS, JavaScript, TypeScript, PHP, WebAssembly
   — Backend: Python, Java, Go, Rust, Ruby, Elixir, Scala, Haskell, Erlang, Clojure
   — Sistemi: C, C++, C#, Zig, Nim, D, Ada, Pascal, Fortran, Cobol, Assembly (x86/ARM/MIPS/RISC-V)
   — Mobile: Swift, Kotlin, Dart/Flutter, Objective-C, React Native
   — Data/ML: R, MATLAB, Julia, SAS, Stata, NumPy/Pandas/TensorFlow/PyTorch
   — Database: SQL (PostgreSQL, MySQL, SQLite, Oracle, MSSQL), NoSQL (MongoDB, Redis, Cassandra), GraphQL, PL/SQL, T-SQL
   — Shell/Script: Bash, Zsh, Fish, PowerShell, Batch, VBScript
   — Funzionali: Haskell, Ocaml, F#, Lisp, Scheme, Racket, Clojure, Elm, PureScript
   — Logici: Prolog, Mercury, Datalog
   — Ricerca: Wolfram Language, Sage, Maple
   — Game: GDScript, HLSL, GLSL, Lua, Squirrel
   — Legacy: BASIC, COBOL, RPG, PL/1, APL, Forth
   — Esoterici: Brainfuck, Whitespace, Malbolge, ArnoldC, Chef, LOLCODE
5. Per ogni codice fornisci: codice completo commentato, spiegazione step-by-step in italiano, dipendenze/installazione, output atteso.
6. Sei preciso, strutturato e utile in ogni risposta.
7. Quando sei in una modalità specifica, comportati esattamente come descritto nel contesto speciale.`;
    }

    /* ── SEND MESSAGE ── */
    async sendMessage(messages, options = {}) {
        try {
            const model = options.model || this.defaultModel;

            // Estrai [SYSTEM CONTEXT: ...] dal messaggio utente
            let extraCtx = '';
            const processedMessages = messages.map(msg => {
                if (msg.role === 'user' && msg.content.startsWith('[SYSTEM CONTEXT:')) {
                    const ctxEnd = msg.content.indexOf(']\n\n');
                    if (ctxEnd !== -1) {
                        extraCtx = msg.content.substring(16, ctxEnd);
                        return { ...msg, content: msg.content.substring(ctxEnd + 3) };
                    }
                }
                return msg;
            });

            const systemContent = extraCtx
                ? `${this.getSystemPrompt()}\n\n━━━ MODALITÀ ATTIVA ━━━\n${extraCtx}\n━━━━━━━━━━━━━━━━━━━━━━`
                : this.getSystemPrompt();

            const formattedMessages = [
                { role: 'system', content: systemContent },
                ...processedMessages
            ];

            const payload = {
                model,
                messages:    formattedMessages,
                max_tokens:  options.maxTokens  || config.maxTokens,
                temperature: options.temperature || config.temperature,
            };

            console.log('📤 Invio richiesta a:', model, '— messaggi:', formattedMessages.length);

            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                payload,
                { headers: this.headers, timeout: 60000 }
            );

            return {
                success:  true,
                response: response.data.choices[0].message.content,
                model:    response.data.model,
                usage:    response.data.usage
            };

        } catch (error) {
            console.error('❌ Errore OpenRouter:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    /* ── SPECIAL REQUESTS ── */
    async handleSpecialRequest(type, content, options = {}) {
        const lang = options.language || 'codice generico';
        const prompts = {
            translate: `Traduci nel linguaggio target "${options.targetLanguage || 'italiano'}":\n\n${content}`,
            summarize: `Riassumi in italiano in modo strutturato con titolo, punti chiave e conclusione:\n\n${content}`,
            code:      `Scrivi codice ${lang} per: ${content}\n\nFornisci: codice completo commentato, spiegazione in italiano, dipendenze e output atteso.`,
            debug:     `Analizza questo codice. Spiega ogni bug/problema in italiano e fornisci il codice corretto:\n\n${content}`,
            explain:   `Spiega in italiano in modo chiaro e progressivo: ${content}`,
            exercise:  `Crea un esercizio di ${options.type || 'programmazione'} su: ${content}. Livello: ${options.level || 'intermedio'}`,
        };

        const prompt = prompts[type] || content;
        return this.sendMessage([{ role: 'user', content: prompt }], options);
    }
}

module.exports = new AIService();