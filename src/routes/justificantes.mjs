import express from "express";
import Student from "../models/Student.mjs";
import Professor from "../models/Professor.mjs";
import Schedule from "../models/Schedule.mjs";
import Version from "../models/Version.mjs";
import { generateJustificantePDF } from "../lib/justificantePdfService.mjs";
import { sendJustificanteEmail } from "../lib/justificanteEmailService.mjs";

const router = express.Router();

// Endpoint para crear y enviar justificante
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
      version: null, // No incrementa, solo registro
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
