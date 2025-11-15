import express from "express";
import Student from "../models/Student.mjs";

const router = express.Router();

// GET /api/students
router.get("/students", async (req, res) => {
  try {
    const estudiantes = await Student.find({}).lean();
    return res.json({ success: true, data: estudiantes });
  } catch (error) {
    console.error("Error obteniendo estudiantes:", error);
    return res.status(500).json({ success: false, message: "Error interno", details: error?.message });
  }
});

export default router;
