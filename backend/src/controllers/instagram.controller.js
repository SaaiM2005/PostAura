//instagram.controller.js
import ScheduledPost from "../models/ScheduledPost.js";
import User from "../models/User.js";
import { schedulePostJob } from "../utils/scheduler.js";
import { calculateOptimalTime, getOptimalTimeReason } from "../services/optimalTiming.service.js";

export const schedulePost = async (req, res) => {
  const { filePath, caption, scheduledTime, platforms, useOptimalTiming } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User not found in request" });
  }

  if (!filePath) {
    return res.status(400).json({ error: "Missing required field: filePath" });
  }

  try {
    // This filePath is the Cloudinary URL uploaded from frontend to work on the video uRl and keep it in cloudinary 
    const videoUrl = filePath;

    // Calculate optimal time if requested, otherwise use provided time
    let finalScheduledTime;
    let optimalReason = null;

    if (useOptimalTiming) {
      finalScheduledTime = calculateOptimalTime(platforms || ['instagram']);
      optimalReason = getOptimalTimeReason(platforms?.[0] || 'instagram', finalScheduledTime);
      console.log(`Using optimal timing: ${finalScheduledTime.toISOString()} - ${optimalReason}`);
    } else {
      if (!scheduledTime) {
        return res.status(400).json({ error: "Missing required field: scheduledTime (required when not using optimal timing)" });
      }
      finalScheduledTime = scheduledTime;
    }

    const post = await ScheduledPost.create({
      userId: user.id,
      videoUrl,
      caption,
      scheduledTime: finalScheduledTime,
      status: "PENDING",
      usedOptimalTiming: useOptimalTiming || false,
    });

    console.log("ScheduledPost document created:", post);

    await schedulePostJob(post, platforms);

    res.json({
      message: "Scheduled",
      post,
      optimalTime: useOptimalTiming ? finalScheduledTime : undefined,
      optimalReason: optimalReason,
    });
  } catch (err) {
    console.error("Error in schedulePost:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};
