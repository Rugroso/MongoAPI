import express from "express";
import Student from "../models/Student.mjs";

const router = express.Router();

// GET /api/estudiantes?query=...
router.get("/estudiantes", async (req, res) => {
  const { query } = req.query;

  try {
    const q = typeof query === "string" && query.trim().length > 0 ? query.trim() : null;

    const filter = q
      ? {
          $or: [
            { nombre: { $regex: q, $options: "i" } },
            { apellidos: { $regex: q, $options: "i" } },
            { matricula: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const estudiantes = await Student.find(filter).limit(30).lean();

    return res.json({ success: true, data: estudiantes });
  } catch (error) {
    console.error("Error obteniendo estudiantes:", error);
    return res.status(500).json({ success: false, message: "Error interno" });
  }
});

export default router;
