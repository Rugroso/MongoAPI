import express from "express";
import Student from "../models/Student.mjs";

const router = express.Router();

// GET /api/estudiantes?query=...
router.get("/estudiantes", async (req, res) => {
  const { query } = req.query;

  try {
    const q = typeof query === "string" && query.trim().length > 0 ? query.trim() : '';

    // Si no hay query, devolvemos una lista vacía (autocompletado no debe retornar todos)
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const filter = {
      $or: [
        { nombre: { $regex: q, $options: "i" } },
        { matricula: { $regex: q, $options: "i" } },
      ],
    };

    const estudiantes = await Student.find(filter).limit(10).lean();

    return res.json({ success: true, data: estudiantes });
  } catch (error) {
    console.error("Error obteniendo estudiantes:", error);
    return res.status(500).json({ success: false, message: "Error interno", details: error?.message });
  }
});

export default router;
