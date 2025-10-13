import { TwitterApi, TwitterApiV2Settings } from "twitter-api-v2";
import fetch from "node-fetch";
import schedule from "node-schedule";
import { Buffer } from "buffer";
import dotenv from "dotenv";

dotenv.config();

TwitterApiV2Settings.deprecationWarnings = false;

const client = new TwitterApi({
  appKey: process.env.TWITTERCONSUMERKEY,
  appSecret: process.env.TWITTERCONSUMERSECRET,
  accessToken: process.env.TWITTERACCESSTOKEN,
  accessSecret: process.env.TWITTERACCESSTOKENSECRET,
});

const rwClient = client.readWrite;

export async function scheduleTwitterPost(text, videoUrl, scheduleTime) {
  const scheduledDate = new Date(scheduleTime);

  return new Promise((resolve, reject) => {
    schedule.scheduleJob(scheduledDate, async () => {
      try {
        console.log(`Starting scheduled tweet at ${scheduledDate.toISOString()}`);

        // Fetch video from URL and convert to buffer
        const response = await fetch(videoUrl);
        const arrayBuffer = await response.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);

        // Upload video to Twitter with updated upload options for long video
        const mediaId = await rwClient.v1.uploadMedia(videoBuffer, {
          mimeType: "video/mp4",
          longVideo: true,
        });

        // Post tweet with attached media
        await rwClient.v2.tweet({
          text,
          media: { media_ids: [mediaId] },
        });

        console.log("Tweet posted successfully");
        resolve({ success: true });
      } catch (error) {
        console.error("Error posting tweet:", error);
        reject(error);
      }
    });

    // Immediately resolve to confirm scheduling
    resolve({ message: "Tweet scheduled successfully" });
  });
}
