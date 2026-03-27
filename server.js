const app = require('./src/app');
const config = require('./config/config');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Jarvis AI Assistant is running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
});