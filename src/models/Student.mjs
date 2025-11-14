import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  matricula: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  apellidos: { type: String, required: true },
  carrera: { type: String, required: true },
  status: { type: String, default: "activo" },
});

const Student = mongoose.model("Student", StudentSchema);
export default Student;
