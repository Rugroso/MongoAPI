import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.NODE_ENV === "production" 
      ? process.env.MONGO_URI_PROD 
      : process.env.MONGO_URI_LOCAL;
    
    await mongoose.connect(MONGO_URI);
    console.log(`Conectado a MongoDB (${process.env.NODE_ENV === "production" ? "PROD" : "LOCAL"})`);
    return true;
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error.message);
    return false;
  }
};

export default connectDB;
