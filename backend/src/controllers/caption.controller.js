//caption.controller.js
import { generateCaption } from "../services/caption.service.js";

export const generateCaptionController = async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing videoUrl" });
  }

  try {
    const result = await generateCaption(videoUrl);
    res.json({ 
      success: true, 
      caption: result.caption,
      transcript: result.transcript 
    });
  } catch (error) {
    console.error("Error generating caption:", error);
    res.status(500).json({ 
      error: error.message || "Failed to generate caption" 
    });
  }
};
