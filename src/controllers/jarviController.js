const aiService = require('../services/aiService');
const chatDB = require('../database/chatDB');

class JarviController {
  
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

  async chatWithHistory(req, res) {
    try {
      const { conversationId, message, options } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      let convId = conversationId;
      
      if (!convId) {
        const title = message.substring(0, 50);
        convId = await chatDB.createConversation(title);
        console.log('📝 Nuova conversazione creata:', convId);
      }

      await chatDB.saveMessage(convId, 'user', message);
      chatDB.updateConversationTime(convId);
      console.log('💾 Messaggio utente salvato');

      const history = await chatDB.getMessages(convId);
      const messages = history.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log(`📨 Invio ${messages.length} messaggi a AI...`);

      const result = await aiService.sendMessage(messages, options);
      
      if (result.success) {
        await chatDB.saveMessage(convId, 'assistant', result.response);
        chatDB.updateConversationTime(convId);
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

  async getConversations(req, res) {
    try {
      const conversations = await chatDB.getConversations();
      res.json({ success: true, conversations });
    } catch (error) {
      console.error('Errore getConversations:', error);
      res.status(500).json({ error: error.message });
    }
  }

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

  async translate(req, res) {
    try {
      const { text, targetLanguage } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required' });
      const result = await aiService.handleSpecialRequest('translate', text, { targetLanguage });
      if (result.success) res.json({ success: true, translation: result.response });
      else res.status(500).json({ error: result.error });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async summarize(req, res) {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required' });
      const result = await aiService.handleSpecialRequest('summarize', text);
      if (result.success) res.json({ success: true, summary: result.response });
      else res.status(500).json({ error: result.error });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async generateCode(req, res) {
    try {
      const { prompt, language } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
      const result = await aiService.handleSpecialRequest('code', prompt, { language });
      if (result.success) res.json({ success: true, code: result.response });
      else res.status(500).json({ error: result.error });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async debugCode(req, res) {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Code is required' });
      const result = await aiService.handleSpecialRequest('debug', code);
      if (result.success) res.json({ success: true, debugged: result.response });
      else res.status(500).json({ error: result.error });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async explain(req, res) {
    try {
      const { concept } = req.body;
      if (!concept) return res.status(400).json({ error: 'Concept is required' });
      const result = await aiService.handleSpecialRequest('explain', concept);
      if (result.success) res.json({ success: true, explanation: result.response });
      else res.status(500).json({ error: result.error });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createExercise(req, res) {
    try {
      const { topic, type, level } = req.body;
      const result = await aiService.handleSpecialRequest('exercise', topic, { type, level });
      if (result.success) res.json({ success: true, exercise: result.response });
      else res.status(500).json({ error: result.error });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getModels(req, res) {
    try {
      const config = require('../../config/config');
      res.json({ success: true, models: config.models });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

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
      res.status(500).json({ error: error.message });
    }
  }

  // AGGIUNGI QUESTO METODO
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
    } catch (error) {
      console.error('Errore getSystemInfo:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new JarviController();