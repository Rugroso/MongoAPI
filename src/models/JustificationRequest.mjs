import mongoose from "mongoose";

const JustificationRequestSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  alumnos: [
    {
      alumno: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
      matriculaRecibida: String,
      carreraRecibida: String,
      nombreRecibido: String,
    },
  ],
  fechaSolicitud: { type: Date, default: Date.now },
  recibidoPor: { type: String, default: "Leticia" },
});

const JustificationRequest = mongoose.model("JustificationRequest", JustificationRequestSchema);
export default JustificationRequest;
