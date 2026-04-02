/* ═══════════════════════════════════════════════════════════
   B.A.R.R.Y. — Configurazione v4.1
   ═══════════════════════════════════════════════════════════ */
require('dotenv').config();

module.exports = {
    // OpenRouter
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    // MODELLO CORRETTO che esiste su OpenRouter
    defaultModel: 'openai/gpt-3.5-turbo',
    
    // Limiti
    maxTokens: 4096,
    temperature: 0.7,
    
    // Sito
    siteUrl: process.env.SITE_URL || 'http://localhost:10000',
    siteName: 'B.A.R.R.Y. AI',
    
    // Modelli disponibili (TUTTI VERIFICATI su OpenRouter)
    models: {
        gpt35: 'openai/gpt-3.5-turbo',
        gpt4: 'openai/gpt-4o-mini',
        claude: 'anthropic/claude-3-haiku-20240307',
        llama: 'meta-llama/llama-3.2-3b-instruct:free',
        mistral: 'mistralai/mistral-7b-instruct:free',
        gemini: 'google/gemini-2.0-flash-lite-preview-02-05:free'
    },
    
    // Crittografia
    encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16
    }
};