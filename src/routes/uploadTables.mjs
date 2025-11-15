import express from "express";
import Version from "../models/Version.mjs";
import Student from "../models/Student.mjs";
import Professor from "../models/Professor.mjs";
import Schedule from "../models/Schedule.mjs";
import axios from "axios";
import { JSDOM } from "jsdom";
import { generateJustificantePDF } from "../lib/justificantePdfService.js";
import { sendJustificanteEmail } from "../lib/justificanteEmailService.js";

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

    // Descargar archivo HTML
    let response;
    try {
      response = await axios.get(fileUrl, { timeout: 10000 });
    } catch (error) {
      return res.status(400).json({ 
        error: "No se pudo descargar el archivo", 
        details: error.message 
      });
    }
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Obtener la última versión
    const lastVersion = await Version.findOne().sort({ version: -1 });
    const newVersion = lastVersion ? lastVersion.version + 1 : 1;

    // Procesar tablas
    const tables = document.querySelectorAll("table");
    let alumnos = [];
    let profesores = [];
    for (const table of tables) {
      const rows = table.querySelectorAll("tr");
      let profesor = null;
      let materia = "";
      for (const row of rows) {
        const cells = row.querySelectorAll("td, th");
        if (cells.length === 1 && row.textContent.includes("Profesor")) {
          const nombreCompleto = row.textContent.replace("Profesor:", "").trim();
          const [nombre, ...apellidos] = nombreCompleto.split(" ");
          let prof = await Professor.findOne({ nombre, apellidos: apellidos.join(" ") });
          if (!prof) {
            prof = await Professor.create({ nombre, apellidos: apellidos.join(" "), correo: "", escuela: "Ingeniería", version: newVersion });
          }
          profesor = prof;
          profesores.push(profesor);
        } else if (cells.length > 1) {
          const matricula = cells[0].textContent.trim();
          const nombre = cells[1].textContent.trim();
          const apellidos = cells[2]?.textContent.trim() || "";
          const carrera = cells[3]?.textContent.trim() || "";
          let alumno = await Student.findOne({ matricula });
          if (!alumno) {
            alumno = await Student.create({ matricula, nombre, apellidos, carrera, escuela: "Ingeniería", status: "activo", version: newVersion });
          }
          alumnos.push(alumno);
        }
      }
      for (const alumno of alumnos) {
        await Schedule.create({ alumno: alumno._id, profesor: profesor?._id, materia, dia: "", horaInicio: "", horaFin: "", version: newVersion });
      }
    }
    // Registrar nueva versión solo con los datos insertados
    await Version.create({
      version: newVersion,
      description,
      alumnos: alumnos.map(a => a._id),
      profesores: profesores.map(p => p._id),
    });

    res.json({ success: true, version: newVersion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error procesando archivo" });
  }
});

export default router;
