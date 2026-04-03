// routes/socialListening.routes.js
import express from "express";
import { getSocialListeningReport } from "../controllers/socialListening.controller.js";
import User from "../models/User.js";

const router = express.Router();

// Auth middleware — attach first user (same dev pattern as analytics)
router.use(async (req, res, next) => {
    try {
        const user = await User.findOne();
        req.user = user;
        next();
    } catch (err) {
        req.user = null;
        next();
    }
});

router.get("/report", getSocialListeningReport);

export default router;
