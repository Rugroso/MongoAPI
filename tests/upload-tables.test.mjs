import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import uploadTablesRoutes from '../src/routes/uploadTables.mjs';
import Student from '../src/models/Student.mjs';
import Professor from '../src/models/Professor.mjs';
import Schedule from '../src/models/Schedule.mjs';
import Version from '../src/models/Version.mjs';

const app = express();
app.use(express.json());
app.use('/api', uploadTablesRoutes);

let mongoConnection;

beforeAll(async () => {
  const mongoUrl = process.env.MONGO_URI_PROD || process.env.MONGO_URI_LOCAL;
  console.log('🔍 Intentando conectar a MongoDB...');
  console.log('📍 URL de conexión:', mongoUrl?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
  console.log('🌍 Usando:', mongoUrl?.includes('mongodb+srv') ? 'MONGO_URI_PROD (Atlas)' : 'MONGO_URI_LOCAL');
  
  try {
    console.log('⏳ Conectando...');
    mongoConnection = await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Conectado a MongoDB exitosamente');
    console.log('📊 Estado de conexión:', mongoose.connection.readyState);
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:');
    console.error('   - Mensaje:', error.message);
    console.error('   - Código:', error.code);
    console.warn('⚠️  Tests se saltarán debido a la falta de conexión a MongoDB');
  }
}, 20000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close();
      console.log('✅ Conexión cerrada correctamente');
    } catch (error) {
      console.error('❌ Error al cerrar conexión:', error.message);
    }
  }
}, 10000);

beforeEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  
  // Limpiar colecciones antes de cada test
  try {
    await Student.deleteMany({});
    await Professor.deleteMany({});
    await Schedule.deleteMany({});
    await Version.deleteMany({});
  } catch (error) {
    console.warn('⚠️  Error limpiando colecciones:', error.message);
  }
});

describe('POST /api/upload-tables', () => {
  it('debe rechazar si falta fileUrl', async () => {
    const res = await request(app)
      .post('/api/upload-tables')
      .send({});
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('fileUrl requerido');
  });

  it('debe rechazar URL inválida', async () => {
    const res = await request(app)
      .post('/api/upload-tables')
      .send({ 
        fileUrl: 'not-a-valid-url',
        description: 'Test con URL inválida'
      });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('fileUrl debe ser una URL válida');
  });

  // Test con URL de producción - GitHub raw
  it('debe procesar el archivo HTML de producción desde GitHub', async () => {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  Saltando test - MongoDB no conectado');
      return;
    }

    console.log('\n🚀 Iniciando test de carga desde GitHub...');
    
    const res = await request(app)
      .post('/api/upload-tables')
      .send({ 
        fileUrl: 'https://raw.githubusercontent.com/Rugroso/MongoAPI/main/srvlistas.htm',
        description: 'Test de producción con archivo HTML real'
      });
    
    console.log('📊 Código de estado:', res.statusCode);
    console.log('📊 Respuesta del servidor:', JSON.stringify(res.body, null, 2));
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBeGreaterThan(0);
    
    // Verificar que se crearon estudiantes y profesores
    const studentCount = await Student.countDocuments({});
    const professorCount = await Professor.countDocuments({});
    const scheduleCount = await Schedule.countDocuments({});
    const versionCount = await Version.countDocuments({});
    
    console.log(`\n📈 Resultados de la carga:`);
    console.log(`   ✅ Estudiantes creados: ${studentCount}`);
    console.log(`   ✅ Profesores creados: ${professorCount}`);
    console.log(`   ✅ Horarios creados: ${scheduleCount}`);
    console.log(`   ✅ Versiones creadas: ${versionCount}`);
    
    expect(studentCount).toBeGreaterThan(0);
    expect(professorCount).toBeGreaterThan(0);
    
    // Verificar algunos estudiantes creados
    const sampleStudents = await Student.find({}).limit(3);
    console.log(`\n👨‍🎓 Muestra de estudiantes creados:`);
    sampleStudents.forEach((student, idx) => {
      console.log(`   ${idx + 1}. ${student.nombre} ${student.apellidos} - ${student.matricula}`);
    });
    
    // Verificar algunos profesores creados
    const sampleProfessors = await Professor.find({}).limit(3);
    console.log(`\n👨‍🏫 Muestra de profesores creados:`);
    sampleProfessors.forEach((prof, idx) => {
      console.log(`   ${idx + 1}. ${prof.nombre} ${prof.apellidos} - Correo: ${prof.correo || '(vacío)'}`);
    });
  }, 30000); // Timeout extendido a 30 segundos para descarga y procesamiento
});
