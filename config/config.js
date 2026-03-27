require('dotenv').config();

if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ ERRORE: OPENROUTER_API_KEY non è impostata nel file .env');
  process.exit(1);
}

module.exports = {
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  siteUrl: process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
  siteName: process.env.OPENROUTER_SITE_NAME || 'Jarvis AI',
  port: process.env.PORT || 3000,
  
  // Modelli corretti per OpenRouter
  models: {
    claude3opus: 'anthropic/claude-3-opus-20240229',
    claude3sonnet: 'anthropic/claude-3-sonnet-20240229',
    claude3haiku: 'anthropic/claude-3-haiku-20240307',
    gpt4: 'openai/gpt-4-turbo-preview',
    gpt35: 'openai/gpt-3.5-turbo',
    llama3: 'meta-llama/llama-3-70b-instruct',
    mistral: 'mistralai/mistral-7b-instruct'
  },
  
  defaultModel: 'openai/gpt-3.5-turbo', // Più stabile e veloce
  maxTokens: 2000,
  temperature: 0.7
};