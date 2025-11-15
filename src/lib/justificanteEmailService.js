import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Envía el justificante PDF a los profesores y directores
 * @param {Object} params
 * @param {Buffer} pdfBuffer
 * @param {Array} toEmails - Correos de profesores
 * @param {Array} ccEmails - Correos de directores y Mara
 * @param {String} evento
 * @param {Array} alumnos
 * @param {Array} fechasJustificadas
 */
export async function sendJustificanteEmail({ pdfBuffer, toEmails, ccEmails, evento, alumnos, fechasJustificadas }) {
  const subject = `Justificante de participación - ${evento}`;
  const html = `<p>Se adjunta el justificante de participación para el evento <b>${evento}</b>.<br>
  Alumnos incluidos:<br>
  <ul>${alumnos.map(a => `<li>${a.nombre} ${a.apellidos} (${a.matricula})</li>`).join('')}</ul>
  Fechas justificadas: ${fechasJustificadas.join(', ')}
  </p>`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmails,
    cc: ccEmails,
    subject,
    html,
    attachments: [{ filename: `justificante-${evento}.pdf`, content: pdfBuffer }],
  };
  await transport.sendMail(mailOptions);
}
