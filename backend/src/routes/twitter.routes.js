import express from "express";
import { scheduleTwitterPost } from "../controllers/twitter.controller.js";

const router = express.Router();

router.post("/schedule-tweet", scheduleTwitterPost);

export default router;
