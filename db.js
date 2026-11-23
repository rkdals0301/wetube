import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const db = mongoose.connection;

export const connectDatabase = async () => {
  await mongoose.connect(process.env.MONGO_URL);
  db.on("error", () => console.error("MongoDB connection error."));
  console.log("Connected to MongoDB.");
};
