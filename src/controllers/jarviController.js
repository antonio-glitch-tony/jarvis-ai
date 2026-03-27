const aiService = require('../services/aiService');

class JarviController {
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
      res.status(500).json({ error: error.message });
    }
  }

  async translate(req, res) {
    try {
      const { text, targetLanguage, options } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = await aiService.handleSpecialRequest('translate', text, { 
        targetLanguage, 
        ...options 
      });
      
      if (result.success) {
        res.json({ 
          success: true, 
          translation: result.response,
          model: result.model 
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async summarize(req, res) {
    try {
      const { text, options } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = await aiService.handleSpecialRequest('summarize', text, options);
      
      if (result.success) {
        res.json({ 
          success: true, 
          summary: result.response,
          model: result.model 
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async generateCode(req, res) {
    try {
      const { prompt, language, options } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const result = await aiService.handleSpecialRequest('code', prompt, { 
        language, 
        ...options 
      });
      
      if (result.success) {
        res.json({ 
          success: true, 
          code: result.response,
          model: result.model 
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async debugCode(req, res) {
    try {
      const { code, options } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const result = await aiService.handleSpecialRequest('debug', code, options);
      
      if (result.success) {
        res.json({ 
          success: true, 
          debugged: result.response,
          model: result.model 
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async explain(req, res) {
    try {
      const { concept, options } = req.body;
      
      if (!concept) {
        return res.status(400).json({ error: 'Concept is required' });
      }

      const result = await aiService.handleSpecialRequest('explain', concept, options);
      
      if (result.success) {
        res.json({ 
          success: true, 
          explanation: result.response,
          model: result.model 
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createExercise(req, res) {
    try {
      const { topic, type, level, format, options } = req.body;
      
      const result = await aiService.handleSpecialRequest('exercise', topic, {
        type,
        level,
        format,
        ...options
      });
      
      if (result.success) {
        res.json({ 
          success: true, 
          exercise: result.response,
          model: result.model 
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getModels(req, res) {
    try {
      const result = await aiService.getAvailableModels();
      
      if (result.success) {
        res.json({
          success: true,
          models: result.models,
          shortcuts: config.models
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async switchModel(req, res) {
    try {
      const { modelKey } = req.body;
      
      if (!modelKey) {
        return res.status(400).json({ error: 'Model key is required' });
      }

      const result = await aiService.switchModel(modelKey);
      
      if (result.success) {
        res.json({
          success: true,
          currentModel: result.currentModel,
          message: `Model switched to ${result.currentModel}`
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new JarviController();