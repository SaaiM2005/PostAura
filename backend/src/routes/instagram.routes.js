import express from "express";  // ← ADD THIS LINE
import { schedulePost } from "../controllers/instagram.controller.js";
import User from "../models/User.js";

const router = express.Router();

router.use(async (req, res, next) => {
  const user = await User.findOne(); // Dummy for dev
  req.user = user;
  next();
});

router.post("/schedule", schedulePost);

export default router;
