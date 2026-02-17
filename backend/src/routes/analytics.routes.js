// routes/analytics.routes.js
import express from "express";
import { getScheduledPosts } from "../controllers/analytics.controller.js";
import User from "../models/User.js";

const router = express.Router();

// Dummy auth middleware for development
router.use(async (req, res, next) => {
    const user = await User.findOne(); // Dummy for dev
    req.user = user;
    next();
});

// Get all scheduled posts with analytics
router.get("/scheduled-posts", getScheduledPosts);

export default router;
