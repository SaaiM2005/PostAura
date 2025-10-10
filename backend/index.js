// //index.js 
// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import mongoose from "mongoose";
// import instagramRoutes from "./src/routes/instagram.routes.js";

// dotenv.config();

// const app = express();
// app.use(express.json({ limit: "50mb" }));
// app.use(cookieParser());
// app.use(cors({ origin: process.env.FRONTENDROOTURL, credentials: true }));

// mongoose.connect(process.env.MONGOURI).then(
//   () => console.log("Connected to MongoDB"),
//   err => console.error("MongoDB connection error:", err)
// );

// app.use("/api/instagram", instagramRoutes);

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Instagram backend running on port ${PORT}`));

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import instagramRoutes from "./src/routes/instagram.routes.js";
import captionRoutes from "./src/routes/caption.routes.js";  // NEW

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTENDROOTURL, credentials: true }));

mongoose.connect(process.env.MONGOURI).then(
  () => console.log("Connected to MongoDB"),
  err => console.error("MongoDB connection error:", err)
);

app.use("/api/instagram", instagramRoutes);
app.use("/api/caption", captionRoutes);  // NEW

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Instagram backend running on port ${PORT}`));
