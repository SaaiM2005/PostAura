//models/User.js
import mongoose from "mongoose";
const UserSchema = new mongoose.Schema({
  name: String,
  igUserId: String,
  accessToken: String,
});
export default mongoose.model("User", UserSchema);
