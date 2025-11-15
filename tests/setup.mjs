import dotenv from 'dotenv';
dotenv.config();

// Configuración global para tests
global.testConfig = {
  // Usar PROD para tests si LOCAL no funciona
  mongoUrl: process.env.MONGO_URI_PROD || process.env.MONGO_URI_LOCAL,
  apiKey: process.env.API_KEY || 'test-api-key',
};
