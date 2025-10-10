import express from "express";
import { generateCaptionController } from "../controllers/caption.controller.js";

const router = express.Router();

router.post("/generate", generateCaptionController);

export default router;
