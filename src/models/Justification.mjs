import mongoose from "mongoose";

const JustificationSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: "JustificationRequest", required: true },
  alumnos: [
    {
      alumno: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
      profesoresAfectados: [
        {
          profesor: { type: mongoose.Schema.Types.ObjectId, ref: "Professor" },
          dias: [Date],
        },
      ],
    },
  ],
  pdfUrl: { type: String },
  aprobadoPor: { type: String },
  fechaAprobacion: { type: Date },
  correosEnviados: [
    {
      profesor: { type: mongoose.Schema.Types.ObjectId, ref: "Professor" },
      enviado: Boolean,
      fecha: Date,
    },
  ],
});

const Justification = mongoose.model("Justification", JustificationSchema);
export default Justification;
