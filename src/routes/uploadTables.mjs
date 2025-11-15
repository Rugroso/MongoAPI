import express from "express";
import Version from "../models/Version.mjs";
import Student from "../models/Student.mjs";
import Professor from "../models/Professor.mjs";
import Schedule from "../models/Schedule.mjs";

const router = express.Router();

// Endpoint para subir tablas desde datos procesados en el cliente
router.post("/upload-tables", async (req, res) => {
  try {
    const { estudiantes, profesores, horarios, description } = req.body;
    
    // Validaciones
    if (!estudiantes || !Array.isArray(estudiantes)) {
      return res.status(400).json({ error: "estudiantes es requerido y debe ser un array" });
    }
    
    if (!profesores || !Array.isArray(profesores)) {
      return res.status(400).json({ error: "profesores es requerido y debe ser un array" });
    }

    console.log('📊 Recibidos:', estudiantes.length, 'estudiantes y', profesores.length, 'profesores');

    // Obtener la última versión
    const lastVersion = await Version.findOne().sort({ version: -1 });
    const newVersion = lastVersion ? lastVersion.version + 1 : 1;

    console.log('📊 Nueva versión:', newVersion);

    // Agregar versión a los datos
    const estudiantesConVersion = estudiantes.map(e => ({ ...e, version: newVersion }));
    const profesoresConVersion = profesores.map(p => ({ ...p, version: newVersion }));

    // Insertar profesores usando bulkWrite para mejor rendimiento
    const profesoresInsertados = [];
    
    if (profesoresConVersion.length > 0) {
      console.log('💾 Insertando profesores en lotes...');
      const BATCH_SIZE = 100;
      for (let i = 0; i < profesoresConVersion.length; i += BATCH_SIZE) {
        const batch = profesoresConVersion.slice(i, i + BATCH_SIZE);
        const ops = batch.map(prof => ({
          updateOne: {
            filter: { nombre: prof.nombre, apellidos: prof.apellidos },
            update: { $setOnInsert: prof },
            upsert: true
          }
        }));
        await Professor.bulkWrite(ops);
      }
      
      // Obtener todos los profesores insertados
      const profesoresKeys = profesoresConVersion.map(p => ({ nombre: p.nombre, apellidos: p.apellidos }));
      const profs = await Professor.find({ $or: profesoresKeys });
      profesoresInsertados.push(...profs);
    }

    // Crear mapa de profesores por clave
    const profesoresById = new Map();
    profesoresInsertados.forEach(prof => {
      const key = `${prof.nombre}_${prof.apellidos}`;
      profesoresById.set(key, prof._id);
    });

    // Insertar estudiantes usando bulkWrite
    const estudiantesInsertados = [];
    
    if (estudiantesConVersion.length > 0) {
      console.log('💾 Insertando estudiantes en lotes...');
      const BATCH_SIZE = 100;
      for (let i = 0; i < estudiantesConVersion.length; i += BATCH_SIZE) {
        const batch = estudiantesConVersion.slice(i, i + BATCH_SIZE);
        const ops = batch.map(est => ({
          updateOne: {
            filter: { matricula: est.matricula },
            update: { $setOnInsert: est },
            upsert: true
          }
        }));
        await Student.bulkWrite(ops);
      }
      
      // Obtener todos los estudiantes insertados
      const matriculas = estudiantesConVersion.map(e => e.matricula);
      const ests = await Student.find({ matricula: { $in: matriculas } });
      estudiantesInsertados.push(...ests);
    }

    // Crear mapa de estudiantes por matrícula
    const estudiantesById = new Map();
    estudiantesInsertados.forEach(est => {
      estudiantesById.set(est.matricula, est._id);
    });

    // Insertar horarios si existen
    let horariosInsertados = 0;
    if (horarios && Array.isArray(horarios) && horarios.length > 0) {
      console.log('💾 Insertando horarios en lotes...');
      const scheduleOps = horarios
        .filter(h => estudiantesById.has(h.matricula) && profesoresById.has(h.profesorKey))
        .map(h => ({
          insertOne: {
            document: {
              alumno: estudiantesById.get(h.matricula),
              profesor: profesoresById.get(h.profesorKey),
              materia: h.materia || "",
              dia: "",
              horaInicio: "",
              horaFin: "",
              version: newVersion
            }
          }
        }));
      
      if (scheduleOps.length > 0) {
        const BATCH_SIZE = 500;
        for (let i = 0; i < scheduleOps.length; i += BATCH_SIZE) {
          const batch = scheduleOps.slice(i, i + BATCH_SIZE);
          await Schedule.bulkWrite(batch);
        }
        horariosInsertados = scheduleOps.length;
        console.log('✅ Horarios insertados:', horariosInsertados);
      }
    }

    // Registrar nueva versión
    await Version.create({
      version: newVersion,
      description: description || 'Carga desde cliente',
      alumnos: Array.from(estudiantesById.values()),
      profesores: Array.from(profesoresById.values()),
    });

    console.log('✅ Proceso completado exitosamente');
    res.json({ 
      success: true, 
      message: 'Datos procesados exitosamente',
      version: newVersion,
      stats: {
        estudiantes: estudiantesInsertados.length,
        profesores: profesoresInsertados.length,
        horarios: horariosInsertados
      }
    });
  } catch (err) {
    console.error('❌ Error procesando datos:', err);
    res.status(500).json({ 
      error: "Error procesando datos",
      details: err.message 
    });
  }
});

export default router;
