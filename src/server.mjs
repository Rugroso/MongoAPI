import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar dotenv
dotenv.config({ path: path.join(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import connectDB from "./config/db.mjs";
import usersRoutes from "./routes/users.mjs";
import uploadTablesRoutes from "./routes/uploadTables.mjs";
import justificantesRoutes from "./routes/justificantes.mjs";

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Middleware para conectar a DB serverless (debe ir antes de las rutas)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Error conectando a MongoDB:", error);
    return res.status(500).json({
      error: "Error de conexión a base de datos",
    });
  }
});

// Configuración de API Key
const VALID_API_KEYS = process.env.API_KEY ? process.env.API_KEY.split(',') : [];

const authenticateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-KEY');

  if (!apiKey) {
    return res.status(401).json({ message: 'API Key is missing.' });
  }

  if (!VALID_API_KEYS.includes(apiKey)) {
    return res.status(401).json({ message: 'Invalid API Key.' });
  }

  next();
};

// Ruta principal (sin autenticación)
app.get("/", (req, res) => {
  res.json({
    message: "Server Corriendo exitosamente",
  });
});

// Aplicar autenticación a todas las rutas /api
app.use("/api", authenticateApiKey);

// Rutas de la API (protegidas por autenticación)
app.use("/api", usersRoutes);
app.use("/api", uploadTablesRoutes);
app.use("/api", justificantesRoutes);

// Para desarrollo local
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

export default app;
