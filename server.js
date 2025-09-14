// import express from "express";
// import cors from "cors";
// import bodyParser from "body-parser";
// import dotenv from "dotenv";

// dotenv.config();
// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// // Routes
// import authRoutes from "./routes/auth.js";
// app.use("/api/auth", authRoutes);

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);

// For local development only
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export for Vercel
export default app;