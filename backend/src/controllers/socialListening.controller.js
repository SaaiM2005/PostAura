// controllers/socialListening.controller.js
import {
    fetchTwitterData,
    fetchInstagramData,
    analyseWithCohere,
} from "../services/socialListening.service.js";

export const getSocialListeningReport = async (req, res) => {
    try {
        console.log("🔍 Generating Social Listening report…");

        // Fetch Twitter + Instagram in parallel (Instagram uses stored user creds)
        const [twitterResult, instagramResult] = await Promise.allSettled([
            fetchTwitterData(),
            fetchInstagramData(req.user),  // req.user has igUserId + accessToken
        ]);

        const twitter   = twitterResult.status   === "fulfilled" ? twitterResult.value   : { profile: null, mentions: [] };
        const instagram = instagramResult.status === "fulfilled" ? instagramResult.value : { connected: false, comments: [] };

        // Combined sentiment analysis — Twitter mentions + Instagram comments
        const analysis = await analyseWithCohere(
            twitter.mentions   || [],
            instagram.comments || [],
        );

        res.json({
            generatedAt: new Date().toISOString(),
            twitter:  { profile: twitter.profile || null, mentions: twitter.mentions || [] },
            instagram: {
                connected:   instagram.connected,
                username:    instagram.username  || "",
                name:        instagram.name      || "",
                bio:         instagram.bio       || "",
                followers:   instagram.followers ?? 0,
                posts:       instagram.posts     ?? 0,
                avatar:      instagram.avatar    || "",
                recentMedia: instagram.recentMedia || [],
            },
            analysis,
        });

        console.log("✅ Report generated");
    } catch (err) {
        console.error("Social Listening error:", err);
        res.status(500).json({ error: err.message || "Failed to generate report" });
    }
};
