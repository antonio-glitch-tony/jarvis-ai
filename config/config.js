require('dotenv').config();

module.exports = {
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  siteUrl: process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
  siteName: process.env.OPENROUTER_SITE_NAME || 'Jarvis AI Assistant',
  port: process.env.PORT || 3000,
  
  // Modelli disponibili su OpenRouter
  models: {
    claude3opus: 'anthropic/claude-3-opus:beta',
    claude3sonnet: 'anthropic/claude-3-sonnet:beta',
    claude3haiku: 'anthropic/claude-3-haiku:beta',
    gpt4: 'openai/gpt-4-turbo',
    gpt35: 'openai/gpt-3.5-turbo',
    llama3: 'meta-llama/llama-3-70b-instruct',
    mistral: 'mistralai/mistral-7b-instruct',
    gemini: 'google/gemini-pro'
  },
  
  defaultModel: 'anthropic/claude-3-sonnet:beta',
  maxTokens: 4000,
  temperature: 0.7
};