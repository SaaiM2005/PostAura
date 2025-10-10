
//     utils/
//       twitterUtils.js

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARYCLOUDNAME,
});

export const uploadToCloudinary = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "video",
    upload_preset: process.env.CLOUDINARYUPLOADPRESET,
    folder: "postAuraVideos"
  });
  return result.secure_url;
};
