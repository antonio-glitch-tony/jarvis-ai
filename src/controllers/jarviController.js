const aiService = require('../services/aiService');
const chatDB = require('../database/chatDB');

class JarviController {
  
  // Nuova chat
  async newChat(req, res) {
    try {
      const { title } = req.body;
      const conversationId = await chatDB.createConversation(title);
      res.json({ success: true, conversationId });
    } catch (error) {
      console.error('Errore newChat:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Chat con storico
  async chatWithHistory(req, res) {
    try {
      const { conversationId, message, options } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      let convId = conversationId;
      
      // Se non c'è conversationId, crea una nuova conversazione
      if (!convId) {
        const title = message.substring(0, 50);
        convId = await chatDB.createConversation(title);
        console.log('📝 Nuova conversazione creata:', convId);
      }

      // Salva il messaggio dell'utente
      await chatDB.saveMessage(convId, 'user', message);
      await chatDB.updateConversationTime(convId);
      console.log('💾 Messaggio utente salvato');

      // Recupera lo storico della conversazione
      const history = await chatDB.getMessages(convId);
      const messages = history.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log(`📨 Invio ${messages.length} messaggi a AI...`);

      // Ottieni risposta dall'AI
      const result = await aiService.sendMessage(messages, options);
      
      if (result.success) {
        // Salva la risposta dell'assistente
        await chatDB.saveMessage(convId, 'assistant', result.response);
        await chatDB.updateConversationTime(convId);
        console.log('💾 Risposta AI salvata');
        
        res.json({
          success: true,
          conversationId: convId,
          response: result.response,
          model: result.model
        });
      } else {
        console.error('❌ Errore AI:', result.error);
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('❌ Errore chatWithHistory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Recupera tutte le conversazioni
  async getConversations(req, res) {
    try {
      const conversations = await chatDB.getConversations();
      res.json({ success: true, conversations });
    } catch (error) {
      console.error('Errore getConversations:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Recupera una conversazione specifica
  async getConversation(req, res) {
    try {
      const { id } = req.params;
      const messages = await chatDB.getMessages(id);
      const conversations = await chatDB.getConversations();
      const conversation = conversations.find(c => c.id == id);
      
      res.json({ 
        success: true, 
        conversation,
        messages 
      });
    } catch (error) {
      console.error('Errore getConversation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Elimina conversazione
  async deleteConversation(req, res) {
    try {
      const { id } = req.params;
      await chatDB.deleteConversation(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Errore deleteConversation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Chat semplice (senza storico)
  async chat(req, res) {
    try {
      const { messages, options } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      const result = await aiService.sendMessage(messages, options);
      
      if (result.success) {
        res.json({
          success: true,
          response: result.response,
          model: result.model,
          usage: result.usage
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('Errore chat:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Traduzione
  async translate(req, res) {
    try {
      const { text, targetLanguage } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = await aiService.handleSpecialRequest('translate', text, { targetLanguage });
      
      if (result.success) {
        res.json({ success: true, translation: result.response });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('Errore translate:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Riassunto
  async summarize(req, res) {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = await aiService.handleSpecialRequest('summarize', text);
      
      if (result.success) {
        res.json({ success: true, summary: result.response });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('Errore summarize:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Generazione codice
  async generateCode(req, res) {
    try {
      const { prompt, language } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const result = await aiService.handleSpecialRequest('code', prompt, { language });
      
      if (result.success) {
        res.json({ success: true, code: result.response });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('Errore generateCode:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Debug codice
  async debugCode(req, res) {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const result = await aiService.handleSpecialRequest('debug', code);
      
      if (result.success) {
        res.json({ success: true, debugged: result.response });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('Errore debugCode:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Spiegazione semplice
  async explain(req, res) {
    try {
      const { concept } = req.body;
      
      if (!concept) {
        return res.status(400).json({ error: 'Concept is required' });
      }

      const result = await aiService.handleSpecialRequest('explain', concept);
      
      if (result.success) {
        res.json({ success: true, explanation: result.response });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('Errore explain:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Esercizi/Quiz
  async createExercise(req, res) {
    try {
      const { topic, type, level } = req.body;
      
      const result = await aiService.handleSpecialRequest('exercise', topic, { type, level });
      
      if (result.success) {
        res.json({ success: true, exercise: result.response });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('Errore createExercise:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Lista modelli disponibili
  async getModels(req, res) {
    try {
      const config = require('../../config/config');
      res.json({ success: true, models: config.models });
    } catch (error) {
      console.error('Errore getModels:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Cambia modello AI
  async switchModel(req, res) {
    try {
      const config = require('../../config/config');
      const { modelKey } = req.body;
      
      if (config.models[modelKey]) {
        aiService.defaultModel = config.models[modelKey];
        res.json({ 
          success: true, 
          currentModel: aiService.defaultModel,
          message: `Model switched to ${modelKey}`
        });
      } else {
        res.status(400).json({ 
          error: 'Model not found',
          availableModels: Object.keys(config.models)
        });
      }
    } catch (error) {
      console.error('Errore switchModel:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new JarviController();