import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Configuración
const SERVER_URL = process.env.VERCEL_URL || 'https://mongo-api-fawn.vercel.app';
const API_KEY = process.env.API_KEY;
const GITHUB_HTML_URL = 'https://raw.githubusercontent.com/Rugroso/MongoAPI/main/srvlistas.htm';

async function testUploadTables() {
  console.log('🧪 Test de Upload Tables con archivo de producción\n');
  console.log('=' .repeat(60));
  
  try {
    console.log('📤 Enviando petición al servidor...');
    console.log(`📍 URL del servidor: ${SERVER_URL}/api/upload-tables`);
    console.log(`📄 URL del archivo: ${GITHUB_HTML_URL}`);
    console.log(`🔑 API Key: ${API_KEY ? 'Configurada ✓' : 'No configurada ✗'}\n`);
    
    const response = await axios.post(`${SERVER_URL}/api/upload-tables`, {
      fileUrl: GITHUB_HTML_URL,
      description: 'Test de producción - Archivo HTML desde GitHub'
    }, {
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Respuesta exitosa!');
    console.log('=' .repeat(60));
    console.log('📊 Código de estado:', response.status);
    console.log('📊 Datos de respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('=' .repeat(60));
    
    if (response.data.success) {
      console.log(`\n🎉 ¡Éxito! Se creó la versión ${response.data.version}`);
    }
    
  } catch (error) {
    console.error('❌ Error en la petición:');
    console.error('=' .repeat(60));
    
    if (error.response) {
      // El servidor respondió con un código de error
      console.error('📊 Código de estado:', error.response.status);
      console.error('📊 Datos de error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error('❌ No se recibió respuesta del servidor');
      console.error('   ¿Está el servidor corriendo en', SERVER_URL, '?');
    } else {
      // Algo pasó al configurar la petición
      console.error('❌ Error:', error.message);
    }
    console.error('=' .repeat(60));
  }
}

// Ejecutar el test
testUploadTables();
