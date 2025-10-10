//services/instagram.service.js
import axios from "axios";

export async function createMediaContainer(igUserId, accesstoken, videourl, caption) {
  try {
    const res = await axios.post(
      `https://graph.facebook.com/${process.env.FBAPIVERSION}/${igUserId}/media`,
      null,
      {
        params: {
          media_type: "REELS", // changed from VIDEO to REELS
          video_url: videourl,
          caption,
          access_token: accesstoken,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return res.data;
  } catch (err) {
    console.error("Instagram API error in createMediaContainer:", err.response?.data || err.message);
    throw err;
  }
}

export async function publishMedia(igUserId, accesstoken, creationid) {
  try {
    const res = await axios.post(
      `https://graph.facebook.com/${process.env.FBAPIVERSION}/${igUserId}/media_publish`,
      null,
      {
        params: {
          creation_id: creationid,
          access_token: accesstoken,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return res.data;
  } catch (err) {
    console.error("Instagram API error in publishMedia:", err.response?.data || err.message);
    throw err;
  }
}
