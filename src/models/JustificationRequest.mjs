import mongoose from "mongoose";

const JustificationRequestSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  alumnos: [
    {
      alumno: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
      matriculaRecibida: String,
      carreraRecibida: String,
      nombreRecibido: String,
    },
  ],
  fechaSolicitud: { type: Date, default: Date.now },
  recibidoPor: { type: String, default: "Leticia" },
  status: { 
    type: String, 
    enum: ['pendiente', 'aprobado', 'rechazado'], 
    default: 'pendiente' 
  },
  aprobadoPor: { type: String },
  fechaAprobacion: { type: Date },
});

const JustificationRequest = mongoose.model("JustificationRequest", JustificationRequestSchema);
export default JustificationRequest;
