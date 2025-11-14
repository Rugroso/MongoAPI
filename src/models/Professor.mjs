import mongoose from "mongoose";

const ProfessorSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellidos: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  escuela: { type: String, required: true },
});

const Professor = mongoose.model("Professor", ProfessorSchema);
export default Professor;
