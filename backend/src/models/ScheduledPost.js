//models/ScheduledPost.js
import mongoose from "mongoose";
const ScheduledPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  videoUrl: String,
  caption: String,
  scheduledTime: Date,
  status: { type: String, enum: ["PENDING", "POSTED", "FAILED"], default: "PENDING" }
});
export default mongoose.model("ScheduledPost", ScheduledPostSchema);
