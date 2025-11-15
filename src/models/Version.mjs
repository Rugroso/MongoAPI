import mongoose from "mongoose";

const VersionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  description: { type: String }, // opcional, para detalles
  evento: { type: String },
  fechasJustificadas: [{ type: String }],
  alumnos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  profesores: [{ type: mongoose.Schema.Types.ObjectId, ref: "Professor" }],
  enviadoPor: { type: String }, // usuario que envió
  aprobadoPor: { type: String }, // usuario que aprobó
  fechaAprobacion: { type: Date },
});

const Version = mongoose.model("Version", VersionSchema);
export default Version;