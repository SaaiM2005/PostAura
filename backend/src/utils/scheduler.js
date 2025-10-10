//utils/scheduler.js
import ScheduledPost from "../models/ScheduledPost.js";
import User from "../models/User.js";
import { createMediaContainer, publishMedia } from "../services/instagram.service.js";
import axios from "axios";

const MAX_ATTEMPTS = 60;
const POLL_INTERVAL = 5000; // 5 seconds

export function schedulePostJob(post, platforms = ["instagram"]) {
  const scheduledTime = new Date(post.scheduledTime);
  const delay = scheduledTime - new Date();
  if (delay < 0) {
    console.log("Scheduled time is in the past. Skipping post.");
    return; // Don't schedule posts in the past
  }

  setTimeout(async () => {
    try {
      const user = await User.findById(post.userId);
      if (!user) {
        post.status = "FAILED";
        await post.save();
        console.error("User not found for scheduled post:", post._id);
        return;
      }

      if (platforms.includes("instagram")) {
        try {
          console.log("Creating Instagram media container for post", post._id);
          const container = await createMediaContainer(user.igUserId, user.accessToken, post.videoUrl, post.caption);

          let attempts = 0;
          let status = "IN_PROGRESS";

          while (status === "IN_PROGRESS" && attempts < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL));

            const check = await axios.get(
              `https://graph.facebook.com/${process.env.FBAPIVERSION}/${container.id}`,
              { params: { fields: "status_code", access_token: user.accessToken } }
            );

            status = check.data.status_code;
            attempts++;
            console.log(`Checking status for container ${container.id}: ${status} (attempt ${attempts})`);
          }

          if (status !== "FINISHED") {
            throw new Error("Video processing not completed in time");
          }

          console.log("Publishing Instagram media for post", post._id);
          await publishMedia(user.igUserId, user.accessToken, container.id);

          post.status = "POSTED";
          await post.save();

          console.log("Post status updated to POSTED for", post._id);
        } catch (instagramError) {
          console.error("Instagram scheduling error for post", post._id, instagramError);
          post.status = "FAILED";
          await post.save();
        }
      }

      // Twitter scheduling is handled by separate twitter-server
    } catch (err) {
      console.error("Error in schedulePostJob for post", post._id, err);
      try {
        post.status = "FAILED";
        await post.save();
      } catch (saveError) {
        console.error("Failed to update post status to FAILED for post", post._id, saveError);
      }
    }
  }, delay);
}
