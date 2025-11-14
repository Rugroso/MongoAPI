import express from "express";
import User from "../models/User.mjs";

const router = express.Router();

// POST /api/users - Crear o actualizar usuario
router.post("/users", async (req, res) => {
  try {
    const { firebaseUid, email, displayName } = req.body;

    // Validaciones
    if (!firebaseUid || !email || !displayName) {
      return res.status(400).json({
        error: "Faltan campos requeridos: firebaseUid, email, displayName",
      });
    }

    // Buscar si el usuario ya existe
    let user = await User.findOne({ firebaseUid });

    if (user) {
      // Actualizar usuario existente
      user.email = email;
      user.displayName = displayName;
      await user.save();

      return res.status(200).json({
        message: "Usuario actualizado exitosamente",
        user,
      });
    }

    // Crear nuevo usuario
    user = new User({
      firebaseUid,
      email,
      displayName,
    });

    await user.save();

    res.status(201).json({
      message: "Usuario creado exitosamente",
      user,
    });
  } catch (error) {
    console.error("Error al guardar usuario:", error);

    // Error de duplicado
    if (error.code === 11000) {
      return res.status(409).json({
        error: "El email ya está registrado",
      });
    }

    res.status(500).json({
      error: "Error al guardar usuario en la base de datos",
      details: error.message,
    });
  }
});

// GET /api/users/:firebaseUid - Obtener usuario por Firebase UID
router.get("/users/:firebaseUid", async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        error: "Usuario no encontrado",
      });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({
      error: "Error al obtener usuario",
      details: error.message,
    });
  }
});



    
export default router;