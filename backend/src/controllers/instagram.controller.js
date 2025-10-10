//instagram.controller.js
import ScheduledPost from "../models/ScheduledPost.js";
import User from "../models/User.js";
import { schedulePostJob } from "../utils/scheduler.js";

export const schedulePost = async (req, res) => {
  const { filePath, caption, scheduledTime, platforms } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User not found in request" });
  }

  if (!filePath || !scheduledTime) {
    return res.status(400).json({ error: "Missing required fields: filePath or scheduledTime" });
  }

  try {
    // Assume filePath is the Cloudinary URL uploaded from frontend unsigned preset
    const videoUrl = filePath;

    const post = await ScheduledPost.create({
      userId: user.id,
      videoUrl,
      caption,
      scheduledTime,
      status: "PENDING",
    });

    console.log("ScheduledPost document created:", post);

    await schedulePostJob(post, platforms);



    res.json({ message: "Scheduled", post });
  } catch (err) {
    console.error("Error in schedulePost:", err);
    console.error("Error in schedulePost:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};
