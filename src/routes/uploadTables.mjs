import express from "express";
import Version from "../models/Version.mjs";
import Student from "../models/Student.mjs";
import Professor from "../models/Professor.mjs";
import Schedule from "../models/Schedule.mjs";
import axios from "axios";
import { JSDOM } from "jsdom";
import { generateJustificantePDF } from "../lib/justificantePdfService.mjs";
import { sendJustificanteEmail } from "../lib/justificanteEmailService.mjs";

const router = express.Router();

// Endpoint para subir tablas desde archivo HTML
router.post("/upload-tables", async (req, res) => {
  try {
    const { fileUrl, description } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ error: "fileUrl requerido" });
    }
    
    // Validar que sea una URL válida
    try {
      new URL(fileUrl);
    } catch (error) {
      return res.status(400).json({ error: "fileUrl debe ser una URL válida" });
    }

    // Descargar archivo HTML con timeout mayor
    let response;
    try {
      response = await axios.get(fileUrl, { 
        timeout: 30000, // 30 segundos
        maxContentLength: 10 * 1024 * 1024 // 10MB
      });
    } catch (error) {
      return res.status(400).json({ 
        error: "No se pudo descargar el archivo", 
        details: error.message 
      });
    }
    
    console.log('📄 Archivo descargado, procesando HTML...');
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Obtener la última versión
    const lastVersion = await Version.findOne().sort({ version: -1 });
    const newVersion = lastVersion ? lastVersion.version + 1 : 1;

    console.log('📊 Nueva versión:', newVersion);

    // Procesar tablas y recolectar datos
    const tables = document.querySelectorAll("table");
    const estudiantesMap = new Map();
    const profesoresMap = new Map();
    const horariosData = [];
    
    console.log('🔍 Procesando', tables.length, 'tablas...');
    
    for (const table of tables) {
      const rows = table.querySelectorAll("tr");
      let profesorActual = null;
      let materiaActual = "";
      
      for (const row of rows) {
        const cells = row.querySelectorAll("td, th");
        
        // Detectar línea de profesor
        if (cells.length === 1 && row.textContent.includes("Profesor")) {
          const nombreCompleto = row.textContent.replace("Profesor:", "").trim();
          const [nombre, ...apellidos] = nombreCompleto.split(" ");
          const key = `${nombre}_${apellidos.join(" ")}`;
          
          if (!profesoresMap.has(key)) {
            profesoresMap.set(key, {
              nombre,
              apellidos: apellidos.join(" "),
              correo: "",
              escuela: "Ingeniería",
              version: newVersion
            });
          }
          profesorActual = key;
        } 
        // Detectar línea de estudiante
        else if (cells.length > 3) {
          const matricula = cells[4]?.textContent.trim();
          const nombreCompleto = cells[5]?.textContent.trim() || "";
          
          if (matricula && nombreCompleto) {
            const [apellidosStr, nombreStr] = nombreCompleto.split(",").map(s => s.trim());
            const carrera = cells[1]?.textContent.trim() || "";
            
            if (!estudiantesMap.has(matricula)) {
              estudiantesMap.set(matricula, {
                matricula,
                nombre: nombreStr || "",
                apellidos: apellidosStr || "",
                carrera,
                escuela: "Ingeniería",
                status: "activo",
                version: newVersion
              });
            }
            
            // Guardar relación para horarios
            if (profesorActual) {
              horariosData.push({
                matricula,
                profesorKey: profesorActual,
                materia: materiaActual
              });
            }
          }
        }
      }
    }

    console.log('👥 Estudiantes únicos encontrados:', estudiantesMap.size);
    console.log('👨‍🏫 Profesores únicos encontrados:', profesoresMap.size);

    // Insertar profesores usando bulkWrite para mejor rendimiento
    const profesoresArray = Array.from(profesoresMap.values());
    const profesoresInsertados = [];
    
    if (profesoresArray.length > 0) {
      console.log('💾 Insertando profesores en lotes...');
      const BATCH_SIZE = 100;
      for (let i = 0; i < profesoresArray.length; i += BATCH_SIZE) {
        const batch = profesoresArray.slice(i, i + BATCH_SIZE);
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
      const profesoresKeys = profesoresArray.map(p => ({ nombre: p.nombre, apellidos: p.apellidos }));
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
    const estudiantesArray = Array.from(estudiantesMap.values());
    const estudiantesInsertados = [];
    
    if (estudiantesArray.length > 0) {
      console.log('💾 Insertando estudiantes en lotes...');
      const BATCH_SIZE = 100;
      for (let i = 0; i < estudiantesArray.length; i += BATCH_SIZE) {
        const batch = estudiantesArray.slice(i, i + BATCH_SIZE);
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
      const matriculas = estudiantesArray.map(e => e.matricula);
      const ests = await Student.find({ matricula: { $in: matriculas } });
      estudiantesInsertados.push(...ests);
    }

    // Crear mapa de estudiantes por matrícula
    const estudiantesById = new Map();
    estudiantesInsertados.forEach(est => {
      estudiantesById.set(est.matricula, est._id);
    });

    // Insertar horarios usando bulkWrite
    if (horariosData.length > 0) {
      console.log('💾 Insertando horarios en lotes...');
      const scheduleOps = horariosData
        .filter(h => estudiantesById.has(h.matricula) && profesoresById.has(h.profesorKey))
        .map(h => ({
          insertOne: {
            document: {
              alumno: estudiantesById.get(h.matricula),
              profesor: profesoresById.get(h.profesorKey),
              materia: h.materia,
              dia: "",
              horaInicio: "",
              horaFin: "",
              version: newVersion
            }
          }
        }));
      
      const BATCH_SIZE = 500;
      for (let i = 0; i < scheduleOps.length; i += BATCH_SIZE) {
        const batch = scheduleOps.slice(i, i + BATCH_SIZE);
        await Schedule.bulkWrite(batch);
      }
      console.log('✅ Horarios insertados:', scheduleOps.length);
    }

    // Registrar nueva versión
    await Version.create({
      version: newVersion,
      description,
      alumnos: Array.from(estudiantesById.values()),
      profesores: Array.from(profesoresById.values()),
    });

    console.log('✅ Proceso completado exitosamente');
    res.json({ 
      success: true, 
      version: newVersion,
      stats: {
        estudiantes: estudiantesInsertados.length,
        profesores: profesoresInsertados.length,
        horarios: horariosData.length
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error procesando archivo" });
  }
});

export default router;
