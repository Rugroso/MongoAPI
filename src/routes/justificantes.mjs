import express from "express";
import Student from "../models/Student.mjs";
import Professor from "../models/Professor.mjs";
import Schedule from "../models/Schedule.mjs";
import Version from "../models/Version.mjs";
import Event from "../models/Event.mjs";
import JustificationRequest from "../models/JustificationRequest.mjs";
import { generateJustificantePDF } from "../lib/justificantePdfService.mjs";
import { sendJustificanteEmail } from "../lib/justificanteEmailService.mjs";

const router = express.Router();

// GET /api/justificantes - Listar todos los justificantes
router.get("/justificantes", async (req, res) => {
  try {
    const { userId, userEmail } = req.query;

    // Obtener todos los justificantes con sus eventos
    const justificantes = await JustificationRequest.find()
      .populate('event')
      .populate('alumnos.alumno')
      .sort({ fechaSolicitud: -1 });

    // Formatear respuesta para el frontend
    const formattedData = justificantes.map(j => ({
      _id: j._id,
      eventName: j.event?.nombreEvento || 'Sin nombre',
      requester: j.recibidoPor || 'Desconocido',
      status: j.status || 'pendiente',
      createdAt: j.fechaSolicitud,
      justifiedDates: j.event?.diasJustificar?.map(d => d.toISOString().split('T')[0]) || [],
      students: j.alumnos?.map(a => ({
        matricula: a.matriculaRecibida || a.alumno?.matricula,
        nombre: a.nombreRecibido || a.alumno?.nombre,
        carrera: a.carreraRecibida || a.alumno?.carrera
      })) || [],
      approvedBy: j.aprobadoPor,
      approvedAt: j.fechaAprobacion
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (err) {
    console.error('Error al obtener justificantes:', err);
    res.status(500).json({
      success: false,
      error: "Error al obtener justificantes"
    });
  }
});

// POST /api/justificantes - Crear un nuevo justificante
router.post("/justificantes", async (req, res) => {
  try {
    const {
      requester,
      eventName,
      justifiedDates,
      studentsText,
      userId,
      userEmail
    } = req.body;

    // Validaciones
    if (!requester || !eventName || !justifiedDates || !studentsText) {
      return res.status(400).json({
        success: false,
        error: "Faltan datos requeridos"
      });
    }

    if (!Array.isArray(justifiedDates) || justifiedDates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "justifiedDates debe ser un array no vacío"
      });
    }

    // Validar formato de fechas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const invalidDates = justifiedDates.filter(fecha => !dateRegex.test(fecha));
    if (invalidDates.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Formato de fecha inválido. Use YYYY-MM-DD"
      });
    }

    // Parsear estudiantes del texto
    const studentLines = studentsText.split('\n').filter(line => line.trim());
    const parsedStudents = [];
    
    for (const line of studentLines) {
      // Formato esperado: "Juan Pérez – 12345 – Ingeniería"
      const parts = line.split('–').map(p => p.trim());
      if (parts.length >= 3) {
        const nombre = parts[0];
        const matricula = parts[1];
        const carrera = parts[2];
        
        // Buscar estudiante en la BD
        let alumno = await Student.findOne({ matricula });
        
        parsedStudents.push({
          alumno: alumno?._id,
          matriculaRecibida: matricula,
          carreraRecibida: carrera,
          nombreRecibido: nombre
        });
      }
    }

    if (parsedStudents.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No se pudo parsear ningún estudiante. Verifica el formato."
      });
    }

    // Convertir fechas a Date objects
    const diasJustificar = justifiedDates.map(d => new Date(d));

    // Crear evento
    const event = await Event.create({
      nombreEvento: eventName,
      fechaInicio: diasJustificar[0],
      fechaFin: diasJustificar[diasJustificar.length - 1],
      diasJustificar,
      enviadoPor: userEmail || userId
    });

    // Crear solicitud de justificante
    const justificationRequest = await JustificationRequest.create({
      event: event._id,
      alumnos: parsedStudents,
      fechaSolicitud: new Date(),
      recibidoPor: requester,
      status: 'pendiente'
    });

    res.json({
      success: true,
      data: {
        _id: justificationRequest._id,
        eventId: event._id
      }
    });
  } catch (err) {
    console.error('Error al crear justificante:', err);
    res.status(500).json({
      success: false,
      error: "Error al crear justificante: " + err.message
    });
  }
});

// PATCH /api/justificantes - Aprobar o rechazar justificante
router.patch("/justificantes", async (req, res) => {
  try {
    const { id, status, approvedBy } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        error: "Faltan datos requeridos (id, status)"
      });
    }

    if (!['aprobado', 'rechazado'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status debe ser 'aprobado' o 'rechazado'"
      });
    }

    // Actualizar justificante
    const justificante = await JustificationRequest.findByIdAndUpdate(
      id,
      {
        status,
        aprobadoPor: approvedBy,
        fechaAprobacion: new Date()
      },
      { new: true }
    ).populate('event').populate('alumnos.alumno');

    if (!justificante) {
      return res.status(404).json({
        success: false,
        error: "Justificante no encontrado"
      });
    }

    // Si fue aprobado, generar PDF y enviar emails
    if (status === 'aprobado') {
      try {
        // Recopilar todos los alumnos
        const alumnos = [];
        for (const alumnoData of justificante.alumnos) {
          if (alumnoData.alumno) {
            alumnos.push(alumnoData.alumno);
          }
        }

        // Obtener profesores afectados por las fechas y alumnos
        const fechas = justificante.event.diasJustificar.map(d => d.toISOString().split('T')[0]);
        const alumnoIds = alumnos.map(a => a._id);
        
        const schedules = await Schedule.find({
          alumno: { $in: alumnoIds },
          dia: { $in: fechas }
        }).populate("profesor");

        const profesoresMap = new Map();
        schedules.forEach(s => {
          if (s.profesor && s.profesor._id) {
            profesoresMap.set(s.profesor._id.toString(), s.profesor);
          }
        });
        
        const profesores = Array.from(profesoresMap.values());
        const profesoresCorreos = profesores.map(p => p.correo).filter(Boolean);
        
        // Determinar directores según escuela
        const directoresCorreos = [];
        profesores.forEach(p => {
          if (p.escuela === "Humanidades" && !directoresCorreos.includes("carlos.gonzalez@instituto.edu")) {
            directoresCorreos.push("carlos.gonzalez@instituto.edu");
          }
          if (p.escuela === "Administración" && !directoresCorreos.includes("director.admin@instituto.edu")) {
            directoresCorreos.push("director.admin@instituto.edu");
          }
        });
        if (!directoresCorreos.includes("mara.rodriguez@college.edu")) {
          directoresCorreos.push("mara.rodriguez@college.edu");
        }

        // Generar PDF
        const pdfBuffer = await generateJustificantePDF({
          evento: justificante.event.nombreEvento,
          alumnos,
          profesores,
          fechasJustificadas: fechas,
          directora: "Directora Institucional"
        });

        // Enviar correos
        if (profesoresCorreos.length > 0 || directoresCorreos.length > 0) {
          await sendJustificanteEmail({
            pdfBuffer,
            toEmails: profesoresCorreos,
            ccEmails: directoresCorreos,
            evento: justificante.event.nombreEvento,
            alumnos,
            fechasJustificadas: fechas,
          });
        }

        // Registrar versión
        await Version.create({
          version: null,
          evento: justificante.event.nombreEvento,
          fechasJustificadas: fechas,
          alumnos: alumnoIds,
          profesores: profesores.map(p => p._id),
          aprobadoPor: approvedBy,
          fechaAprobacion: new Date(),
        });
      } catch (emailError) {
        console.error('Error al enviar emails:', emailError);
        // No fallar la aprobación si hay error en emails
      }
    }

    res.json({
      success: true,
      data: {
        _id: justificante._id,
        status: justificante.status
      }
    });
  } catch (err) {
    console.error('Error al actualizar justificante:', err);
    res.status(500).json({
      success: false,
      error: "Error al actualizar justificante: " + err.message
    });
  }
});

// Endpoint legacy para compatibilidad (puede ser eliminado después)
router.post("/create-justificante", async (req, res) => {
  try {
    const { matricula, fechas, evento, directora, aprobador } = req.body;
    
    // Validaciones
    if (!matricula || !fechas || !evento) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }
    
    if (!Array.isArray(fechas) || fechas.length === 0) {
      return res.status(400).json({ error: "fechas debe ser un array no vacío" });
    }
    
    // Validar formato de fechas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const invalidDates = fechas.filter(fecha => !dateRegex.test(fecha));
    if (invalidDates.length > 0) {
      return res.status(400).json({ error: "Formato de fecha inválido. Use YYYY-MM-DD" });
    }

    // Buscar alumno
    const alumno = await Student.findOne({ matricula });
    if (!alumno) return res.status(404).json({ error: "Alumno no encontrado" });

    // Buscar horarios y profesores para las fechas
    const schedules = await Schedule.find({ alumno: alumno._id, dia: { $in: fechas } }).populate("profesor");
    const profesores = schedules.map(s => s.profesor);
    const profesoresCorreos = profesores.map(p => p.correo).filter(Boolean);
    const directoresCorreos = [];
    // Reglas de directores
    profesores.forEach(p => {
      if (p.escuela === "Humanidades") directoresCorreos.push("carlos.gonzalez@instituto.edu");
      if (p.escuela === "Administración") directoresCorreos.push("director.admin@instituto.edu");
    });
    directoresCorreos.push("mara.rodriguez@college.edu");

    // Generar PDF
    const pdfBuffer = await generateJustificantePDF({
      evento,
      alumnos: [alumno],
      profesores,
      fechasJustificadas: fechas,
      directora: directora || "Directora Institucional"
    });

    // Enviar correo
    await sendJustificanteEmail({
      pdfBuffer,
      toEmails: profesoresCorreos,
      ccEmails: directoresCorreos,
      evento,
      alumnos: [alumno],
      fechasJustificadas: fechas,
    });

    // Registrar versión de justificante
    await Version.create({
      version: null,
      evento,
      fechasJustificadas: fechas,
      alumnos: [alumno._id],
      profesores: profesores.map(p => p._id),
      aprobadoPor: aprobador,
      fechaAprobacion: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generando justificante" });
  }
});

export default router;
