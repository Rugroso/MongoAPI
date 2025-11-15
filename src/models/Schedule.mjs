import mongoose from "mongoose";

const ScheduleSchema = new mongoose.Schema({
  alumno: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  dia: { type: String, required: true },
  profesor: { type: mongoose.Schema.Types.ObjectId, ref: "Professor", required: true },
  materia: { type: String },
  horaInicio: { type: String },
  horaFin: { type: String },
  version: { type: Number, required: true },
});

const Schedule = mongoose.model("Schedule", ScheduleSchema);
export default Schedule;
