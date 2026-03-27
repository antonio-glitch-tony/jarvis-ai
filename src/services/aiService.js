const config = require('../../config/config');
const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = config.openrouterApiKey;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.defaultModel = config.defaultModel;
    
    console.log('🔑 API Key configurata:', this.apiKey ? '✅ Sì' : '❌ No');
    console.log('🤖 Modello predefinito:', this.defaultModel);
    
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.siteUrl || 'http://localhost:3000',
      'X-Title': config.siteName || 'JarvisAI'
    };
  }

  getSystemPrompt() {
    return `Sei JARVIS, l'assistente AI di Tony Stark (Iron Man). 
    
IMPORTANTE: Devi SEMPRE rispondere in ITALIANO, a meno che non ti venga espressamente richiesto di usare un'altra lingua.

Sei sofisticato, elegante, professionale e hai un sottile senso dell'umorismo britannico. Chiama l'utente "Sir" o "Signore".

Puoi fare qualsiasi cosa: scrivere codice, tradurre, spiegare concetti, aiutare con studio e lavoro, fare brainstorming, e molto altro.

Rispondi sempre in modo chiaro, strutturato e utile.`;
  }

  async sendMessage(messages, options = {}) {
    try {
      const model = options.model || this.defaultModel;
      
      const formattedMessages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...messages
      ];

      const payload = {
        model: model,
        messages: formattedMessages,
        max_tokens: options.maxTokens || config.maxTokens,
        temperature: options.temperature || config.temperature,
      };

      console.log('📤 Invio richiesta a:', model);

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        payload,
        { headers: this.headers }
      );

      return {
        success: true,
        response: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage
      };
    } catch (error) {
      console.error('❌ Errore OpenRouter:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  async handleSpecialRequest(type, content, options = {}) {
    let prompt = '';
    
    switch(type) {
      case 'translate':
        prompt = `Traduci in ${options.targetLanguage || 'italiano'}:\n\n${content}`;
        break;
      case 'summarize':
        prompt = `Riassumi in italiano:\n\n${content}`;
        break;
      case 'code':
        prompt = `Scrivi codice ${options.language || 'JavaScript'} per: ${content}. Spiega anche come funziona in italiano.`;
        break;
      case 'debug':
        prompt = `Analizza e correggi questo codice. Spiega in italiano gli errori:\n\n${content}`;
        break;
      case 'explain':
        prompt = `Spiega in italiano in modo semplice: ${content}`;
        break;
      default:
        prompt = content;
    }

    return this.sendMessage([{ role: 'user', content: prompt }], options);
  }
}

module.exports = new AIService();