// controllers/socialListening.controller.js
import {
    fetchTwitterData,
    fetchInstagramData,
    analyseWithCohere,
    analyseInstagramOnly,
} from "../services/socialListening.service.js";

export const getSocialListeningReport = async (req, res) => {
    try {
        console.log("🔍 Generating Social Listening report…");

        const [twitterResult, instagramResult] = await Promise.allSettled([
            fetchTwitterData(),
            fetchInstagramData(req.user),
        ]);

        const twitterError   = twitterResult.status   === "rejected" ? twitterResult.reason?.message || "Twitter API error" : null;
        const instagramError = instagramResult.status === "rejected" ? instagramResult.reason?.message || "Instagram API error" : null;

        if (twitterError)   console.warn("⚠️  Twitter failed:", twitterError);
        if (instagramError) console.warn("⚠️  Instagram failed:", instagramError);

        const twitter   = twitterResult.status   === "fulfilled" ? twitterResult.value   : { profile: null, mentions: [] };
        const instagram = instagramResult.status === "fulfilled" ? instagramResult.value : { connected: false, comments: [], recentMedia: [] };

        const igComments    = instagram.comments || [];
        const twitterMentions = twitter.mentions || [];

        // Run IG-only analysis first (primary source when Twitter is down)
        const igAnalysis = await analyseInstagramOnly(igComments);

        // Only run combined analysis if we also have Twitter mentions
        // Add a small delay to avoid Cohere free-tier rate limits
        let analysis;
        if (twitterMentions.length > 0) {
            await new Promise(r => setTimeout(r, 1500));
            analysis = await analyseWithCohere(twitterMentions, igComments);
        } else {
            // Reuse igAnalysis as the combined result when there's no Twitter data
            analysis = {
                ...igAnalysis,
                twitterSentiment:   { positive: 0, neutral: 100, negative: 0 },
                instagramSentiment: igAnalysis.sentiment,
                sourceCounts:       { twitter: 0, instagram: igComments.length },
            };
        }

        res.json({
            generatedAt:    new Date().toISOString(),
            twitterError,
            instagramError,
            twitter: {
                profile:  twitter.profile  || null,
                mentions: twitter.mentions || [],
            },
            instagram: {
                connected:   instagram.connected   ?? false,
                username:    instagram.username    || "",
                name:        instagram.name        || "",
                bio:         instagram.bio         || "",
                followers:   instagram.followers   ?? 0,
                posts:       instagram.posts       ?? 0,
                avatar:      instagram.avatar      || "",
                recentMedia: instagram.recentMedia || [],
            },
            analysis,
            igAnalysis,   // ← dedicated Instagram-only analysis
        });

        console.log("✅ Report generated");
    } catch (err) {
        console.error("Social Listening error:", err);
        res.status(500).json({ error: err.message || "Failed to generate report" });
    }
};

