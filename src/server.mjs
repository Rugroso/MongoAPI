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

const app = express();

app.use(cors());
app.use(express.json());


const VALID_API_KEYS = (process.env.API_KEY);

const authenticateApiKey = (req, res, next) => {
    const apiKey = req.header('X-API-KEY'); // Get API key from 'X-API-KEY' header

    if (!apiKey) {
        return res.status(401).json({ message: 'API Key is missing.' });
    }

    if (!VALID_API_KEYS.includes(apiKey)) {
        return res.status(401).json({ message: 'Invalid API Key.' });
    }

    next();
};


// Middleware para conectar a DB serverless
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Error conectando a MongoDB:", error);
    res.status(500).json({
      error: "Error de conexión a base de datos",
    });
  }
});

// Rutas principales
app.get("/", authenticateApiKey, (req, res) => {
  res.json({
    message: "Server Corriendo exitosamente",
  });
});

// Rutas de la API
app.use("/api", usersRoutes);

// Para desarrollo local
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

export default app;
