import { scheduleTwitterPost as schedulePost } from "../services/twitter.service.js";

export const scheduleTwitterPost = async (req, res) => {
  const { text, videoUrl, scheduleTime } = req.body;

  if (!videoUrl || !scheduleTime) {
    return res.status(400).json({ error: "Missing videoUrl or scheduleTime" });
  }

  const scheduledDate = new Date(scheduleTime);
  if (scheduledDate.getTime() < Date.now()) {
    return res.status(400).json({ error: "scheduleTime must be in the future" });
  }

  try {
    await schedulePost(text, videoUrl, scheduleTime);
    res.json({ message: "Tweet scheduled successfully" });
  } catch (error) {
    console.error("Error scheduling tweet:", error);
    res.status(500).json({ error: error.message || "Failed to schedule tweet" });
  }
};
