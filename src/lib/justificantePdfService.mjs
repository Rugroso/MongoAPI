import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import path from 'path';

/**
 * Genera un PDF de justificante para alumnos y profesores
 * @param {Object} params
 * @param {String} evento
 * @param {Array} alumnos - [{nombre, apellidos, matricula, carrera, escuela}]
 * @param {Array} profesores - [{nombre, apellidos, correo, escuela}]
 * @param {Array} fechasJustificadas
 * @param {String} directora - Nombre de la directora
 * @returns {Buffer} PDF
 */
export async function generateJustificantePDF({ evento, alumnos, profesores, fechasJustificadas, directora }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 780;

  // Header
  page.drawText('INSTITUTO DE INGENIERÍA', { x: 50, y, size: 18, font: boldFont });
  y -= 30;
  page.drawText('Justificante de Participación', { x: 50, y, size: 14, font });
  y -= 30;
  page.drawText(`Evento: ${evento}`, { x: 50, y, size: 12, font });
  y -= 20;
  page.drawText(`Fechas justificadas: ${fechasJustificadas.join(', ')}`, { x: 50, y, size: 12, font });
  y -= 30;

  // Tabla de alumnos
  page.drawText('Alumnos:', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  page.drawText('Matrícula', { x: 50, y, size: 10, font: boldFont });
  page.drawText('Nombre', { x: 120, y, size: 10, font: boldFont });
  page.drawText('Carrera', { x: 300, y, size: 10, font: boldFont });
  page.drawText('Escuela', { x: 400, y, size: 10, font: boldFont });
  y -= 15;
  for (const alumno of alumnos) {
    page.drawText(alumno.matricula, { x: 50, y, size: 9, font });
    page.drawText(`${alumno.nombre} ${alumno.apellidos}`, { x: 120, y, size: 9, font });
    page.drawText(alumno.carrera, { x: 300, y, size: 9, font });
    page.drawText(alumno.escuela || '', { x: 400, y, size: 9, font });
    y -= 13;
    if (y < 100) break; // Evitar overflow
  }
  y -= 20;

  // Profesores
  page.drawText('Profesores afectados:', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  page.drawText('Nombre', { x: 50, y, size: 10, font: boldFont });
  page.drawText('Correo', { x: 200, y, size: 10, font: boldFont });
  page.drawText('Escuela', { x: 400, y, size: 10, font: boldFont });
  y -= 15;
  for (const prof of profesores) {
    page.drawText(`${prof.nombre} ${prof.apellidos}`, { x: 50, y, size: 9, font });
    page.drawText(prof.correo, { x: 200, y, size: 9, font });
    page.drawText(prof.escuela || '', { x: 400, y, size: 9, font });
    y -= 13;
    if (y < 50) break;
  }
  y -= 30;

  // Firma directora
  page.drawText(`Firma: ${directora}`, { x: 50, y, size: 12, font: boldFont });

  // Footer
  y -= 30;
  page.drawText('Este documento fue generado automáticamente.', { x: 50, y, size: 8, font });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
