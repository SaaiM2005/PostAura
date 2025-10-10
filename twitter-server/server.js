
//server.js 
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { TwitterApi, TwitterApiV2Settings } from "twitter-api-v2";
import fetch from "node-fetch";
import schedule from "node-schedule";
import { Buffer } from "buffer";

dotenv.config();

TwitterApiV2Settings.deprecationWarnings = false;
 
const app = express();
app.use(express.json());
app.use(cors());

const client = new TwitterApi({
  appKey: process.env.TWITTERCONSUMERKEY,
  appSecret: process.env.TWITTERCONSUMERSECRET,
  accessToken: process.env.TWITTERACCESSTOKEN,
  accessSecret: process.env.TWITTERACCESSTOKENSECRET,
});

const rwClient = client.readWrite;

app.post("/schedule-tweet", async (req, res) => {
  const { text, videoUrl, scheduleTime } = req.body;
  if (!videoUrl || !scheduleTime) {
    return res.status(400).json({ error: "Missing videoUrl or scheduleTime" });
  }
  const scheduledDate = new Date(scheduleTime);
  if (scheduledDate.getTime() < Date.now()) {
    return res.status(400).json({ error: "scheduleTime must be in the future" });
  }

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
    } catch (error) {
      console.error("Error posting tweet:", error);
    }
  });

  res.json({ message: "Tweet scheduled successfully" });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Twitter backend running on port ${PORT}`));
