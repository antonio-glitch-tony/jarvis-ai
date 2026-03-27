const axios = require('axios');
const config = require('../../config/config');

class AIService {
  constructor() {
    this.apiKey = config.openrouterApiKey;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.defaultModel = config.defaultModel;
    
    // Headers richiesti da OpenRouter
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.siteUrl,
      'X-Title': config.siteName
    };
  }

  getSystemPrompt() {
    return `Sei Jarvis, un assistente AI versatile, amichevole e professionale.
Hai le seguenti capacità:
- Rispondere a domande su qualsiasi argomento
- Scrivere testi (articoli, lettere, storie, poesie, saggi)
- Tradurre tra decine di lingue
- Riassumere testi lunghi
- Spiegare concetti complessi in modo semplice
- Fare calcoli matematici e ragionamenti logici
- Scrivere codice in vari linguaggi di programmazione
- Debuggare e ottimizzare codice
- Creare tabelle, elenchi e strutture organizzate
- Simulare colloqui di lavoro o di studio
- Dare consigli su studio, lavoro, relazioni, vita quotidiana
- Generare idee creative (progetti, nomi, storie, startup)
- Analizzare dati descrittivi o forniti in testo
- Scrivere email professionali o personali
- Aiutare con compiti scolastici e universitari
- Spiegare opere letterarie, filosofiche o artistiche
- Fare esercizi di grammatica e ortografia
- Creare piani alimentari, allenamenti o routine
- Simulare personaggi o stili di scrittura specifici
- Conversare su argomenti profondi o leggeri
- Fare brainstorming
- Scrivere messaggi per social media, annunci, slogan
- Trovare risorse (libri, film, articoli) su un tema
- Assistere nella scrittura di CV e lettere di presentazione
- Fare quiz, giochi di parole, indovinelli
- Spiegare notizie o eventi attuali
- Aiutare con problemi di matematica, fisica, chimica, biologia
- Scrivere documenti formali (verbali, relazioni, proposte)
- Creare storie interattive o dialoghi
- Dare istruzioni passo passo per fare qualcosa

Rispondi sempre in modo chiaro, strutturato e utile. Adatta il tono al contesto.
Se ti viene chiesto del codice, forniscilo ben formattato con commenti.`;
  }

  async sendMessage(messages, options = {}) {
    try {
      const model = options.model || this.defaultModel;
      
      // Prepara i messaggi con il system prompt
      const formattedMessages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...messages
      ];

      const payload = {
        model: model,
        messages: formattedMessages,
        max_tokens: options.maxTokens || config.maxTokens,
        temperature: options.temperature || config.temperature,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0
      };

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        payload,
        { headers: this.headers }
      );

      return {
        success: true,
        response: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage,
        id: response.data.id
      };
    } catch (error) {
      console.error('Errore OpenRouter:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Metodo per gestire richieste speciali
  async handleSpecialRequest(type, content, options = {}) {
    let prompt = '';
    
    switch(type) {
      case 'translate':
        prompt = `Traduci il seguente testo in ${options.targetLanguage || 'italiano'}.
Mantieni il tono e lo stile originale.
Testo da tradurre:
${content}`;
        break;
        
      case 'summarize':
        prompt = `Riassumi il seguente testo in modo conciso ma completo.
Estrapola i punti chiave e le informazioni principali.
Testo:
${content}`;
        break;
        
      case 'code':
        prompt = `Scrivi codice ${options.language || 'JavaScript'} per: ${content}
Requisiti:
- Fornisci il codice completo e funzionante
- Aggiungi commenti esplicativi
- Includi esempi di utilizzo se appropriato
- Spiega brevemente il funzionamento`;
        break;
        
      case 'debug':
        prompt = `Analizza e correggi questo codice. 
Identifica:
1. Errori presenti
2. Problemi di performance
3. Best practice da applicare
4. Fornisci la versione corretta con spiegazioni

Codice da analizzare:
${content}`;
        break;
        
      case 'explain':
        prompt = `Spiega in modo semplice e chiaro: ${content}
Usa analogie ed esempi pratici per rendere il concetto accessibile.`;
        break;
        
      case 'exercise':
        prompt = `Crea un ${options.type || 'quiz'} sul tema "${content}"
Livello: ${options.level || 'intermedio'}
Formato: ${options.format || 'strutturato con domande e risposte'}
Includi soluzioni e spiegazioni.`;
        break;
        
      default:
        prompt = content;
    }

    return this.sendMessage([{ role: 'user', content: prompt }], options);
  }

  // Ottieni lista modelli disponibili
  async getAvailableModels() {
    try {
      const response = await axios.get(
        `${this.baseURL}/models`,
        { headers: this.headers }
      );
      return {
        success: true,
        models: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cambia modello in tempo reale
  async switchModel(modelKey) {
    if (config.models[modelKey]) {
      this.defaultModel = config.models[modelKey];
      return {
        success: true,
        currentModel: this.defaultModel
      };
    }
    return {
      success: false,
      error: `Modello ${modelKey} non trovato. Modelli disponibili: ${Object.keys(config.models).join(', ')}`
    };
  }
}

module.exports = new AIService();