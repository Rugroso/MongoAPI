import mongoose from "mongoose";
const DirectorSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  escuela: { type: String, required: true },
});

const Director = mongoose.model("Director", DirectorSchema);
export default Director;
