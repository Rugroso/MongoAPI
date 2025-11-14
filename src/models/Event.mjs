import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
  nombreEvento: { type: String, required: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  diasJustificar: [{ type: Date, required: true }],
  enviadoPor: { type: String },
});

const Event = mongoose.model("Event", EventSchema);
export default Event;
