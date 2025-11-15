import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  matricula: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  apellidos: { type: String, required: true },
  carrera: { type: String, required: true },
  escuela: { type: String },
  status: { type: String, default: "activo" },
  historialCarreras: [{
    carrera: String,
    escuela: String,
    fechaCambio: Date
  }],
  version: { type: Number, required: false, default: 1 },
});

const Student = mongoose.model("Student", StudentSchema);
export default Student;
