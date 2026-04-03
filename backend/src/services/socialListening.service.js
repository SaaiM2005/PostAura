// services/socialListening.service.js
import { TwitterApi, TwitterApiV2Settings } from "twitter-api-v2";
import { CohereClient } from "cohere-ai";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

TwitterApiV2Settings.deprecationWarnings = false;

const twitterClient = new TwitterApi({
    appKey: process.env.TWITTERCONSUMERKEY,
    appSecret: process.env.TWITTERCONSUMERSECRET,
    accessToken: process.env.TWITTERACCESSTOKEN,
    accessSecret: process.env.TWITTERACCESSTOKENSECRET,
});
const rwClient = twitterClient.readWrite;
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

/* ── Twitter profile + mentions ───────────────────── */
export async function fetchTwitterData() {
    try {
        const me = await rwClient.v2.me({
            "user.fields": ["public_metrics", "description", "profile_image_url", "username"],
        });
        const profile = {
            id: me.data.id,
            name: me.data.name,
            username: me.data.username,
            description: me.data.description || "",
            followers: me.data.public_metrics?.followers_count ?? 0,
            following: me.data.public_metrics?.following_count ?? 0,
            tweets: me.data.public_metrics?.tweet_count ?? 0,
            avatar: me.data.profile_image_url || "",
        };

        let mentions = [];
        try {
            const mentionsRes = await rwClient.v2.userMentionTimeline(me.data.id, {
                max_results: 20,
                "tweet.fields": ["created_at", "public_metrics", "author_id", "text"],
                "user.fields": ["username", "name"],
                expansions: ["author_id"],
            });
            const users = {};
            (mentionsRes.data?.includes?.users || []).forEach(u => { users[u.id] = { username: u.username, name: u.name }; });
            mentions = (mentionsRes.data?.data || []).map(t => ({
                id: t.id,
                text: t.text,
                createdAt: t.created_at,
                likes: t.public_metrics?.like_count ?? 0,
                retweets: t.public_metrics?.retweet_count ?? 0,
                author: users[t.author_id] || { username: "unknown", name: "Unknown" },
                url: `https://x.com/${users[t.author_id]?.username || "i"}/status/${t.id}`,
            }));
        } catch (e) {
            console.warn("Mentions fetch failed:", e.message);
        }

        return { profile, mentions };
    } catch (err) {
        console.error("Twitter fetch error:", err.message);
        throw new Error("Twitter: " + err.message);
    }
}

/* ── Instagram via stored user accessToken ─────────── */
export async function fetchInstagramData(user) {
    // user is the MongoDB User document — has igUserId and accessToken
    if (!user?.igUserId || !user?.accessToken) {
        return { connected: false, followers: 0, posts: 0, bio: "", username: "", name: "", recentMedia: [] };
    }

    const igId = user.igUserId;
    const token = user.accessToken;
    const v = process.env.FBAPIVERSION || "v23.0";

    try {
        // Profile fields
        const profileRes = await axios.get(
            `https://graph.facebook.com/${v}/${igId}`,
            {
                params: {
                    fields: "followers_count,media_count,biography,name,username,profile_picture_url",
                    access_token: token,
                },
            }
        );
        const p = profileRes.data;

        // Last 10 media items with engagement data
        let recentMedia = [];
        try {
            const mediaRes = await axios.get(
                `https://graph.facebook.com/${v}/${igId}/media`,
                {
                    params: {
                        fields: "id,caption,like_count,comments_count,timestamp,media_type,thumbnail_url,media_url",
                        limit: 10,
                        access_token: token,
                    },
                }
            );
            recentMedia = (mediaRes.data?.data || []).map(m => ({
                id: m.id,
                caption: m.caption || "",
                likes: m.like_count ?? 0,
                comments: m.comments_count ?? 0,
                timestamp: m.timestamp,
                type: m.media_type,
                thumbnailUrl: m.thumbnail_url || m.media_url || "",
            }));
        } catch (e) {
            console.warn("IG media fetch failed:", e.message);
        }

        // Comments on recent posts (for sentiment input) — up to 10 posts × 20 comments
        let comments = [];
        try {
            const commentFetches = recentMedia.slice(0, 10).map(media =>
                axios.get(
                    `https://graph.facebook.com/${v}/${media.id}/comments`,
                    {
                        params: {
                            fields: "text,timestamp,username",
                            limit: 20,
                            access_token: token,
                        },
                    }
                ).then(res =>
                    (res.data?.data || []).map(x => ({
                        text: x.text,
                        timestamp: x.timestamp,
                        username: x.username || "user",
                        postId: media.id,
                        postCaption: media.caption?.slice(0, 80) || "",
                        url: `https://www.instagram.com/p/${media.id}/`,
                    }))
                ).catch(() => [])
            );
            const results = await Promise.all(commentFetches);
            comments = results.flat();
            console.log(`📸 Fetched ${comments.length} Instagram comments from ${recentMedia.slice(0, 10).length} posts`);
        } catch (e) {
            console.warn("IG comments fetch failed:", e.message);
        }

        return {
            connected: true,
            username: p.username || "",
            name: p.name || "",
            bio: p.biography || "",
            followers: p.followers_count ?? 0,
            posts: p.media_count ?? 0,
            avatar: p.profile_picture_url || "",
            recentMedia,
            comments,
        };
    } catch (err) {
        console.error("Instagram fetch error:", err.response?.data || err.message);
        return { connected: false, followers: 0, posts: 0, bio: "", username: "", name: "", recentMedia: [], comments: [] };
    }
}

/* ── Cohere sentiment + citations ─────────────────── */
export async function analyseWithCohere(twitterMentions, igComments) {
    const tweetItems = twitterMentions.map((m, i) => ({
        id: `tweet_${i}`,
        text: `[Twitter mention] @${m.author.username}: ${m.text}`,
        src: { ...m, platform: "twitter" },
    }));

    const igItems = igComments.map((c, i) => ({
        id: `igcomment_${i}`,
        text: `[Instagram comment on post "${c.postCaption || 'post'}"] @${c.username}: ${c.text}`,
        src: { ...c, platform: "instagram" },
    }));

    const allItems = [...tweetItems, ...igItems];

    console.log(`🤖 Cohere analysing ${tweetItems.length} tweets + ${igItems.length} IG comments`);

    if (!allItems.length) {
        return {
            narrative: "No audience interactions found yet. Once people mention or comment, AI insights will appear here.",
            tone: "Neutral",
            sentiment: { positive: 0, neutral: 100, negative: 0 },
            twitterSentiment: { positive: 0, neutral: 100, negative: 0 },
            instagramSentiment: { positive: 0, neutral: 100, negative: 0 },
            topics: [],
            citations: [],
            sourceCounts: { twitter: 0, instagram: 0 },
        };
    }

    const documents = allItems.map(item => ({ id: item.id, text: item.text }));

    const prompt = `You are a senior social media analytics expert. You have been given two sets of audience interactions:
1. Twitter mentions — tweets where users @mention or reference this account
2. Instagram post comments — comments left by followers on the account's posts

Analyse ALL interactions carefully. Return a JSON object with EXACTLY these keys (no extra keys, no markdown):

{
  "narrative": "A 3-sentence paragraph describing overall audience perception across both platforms. Use citation markers like [tweet_0] or [igcomment_2] inline for specific claims.",
  "tone": "One word: Enthusiastic | Critical | Supportive | Mixed | Curious | Polarised | Appreciative",
  "sentiment": { "positive": <int>, "neutral": <int>, "negative": <int> },
  "twitterSentiment": { "positive": <int>, "neutral": <int>, "negative": <int> },
  "instagramSentiment": { "positive": <int>, "neutral": <int>, "negative": <int> },
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}

Rules:
- Each sentiment object's three values MUST sum to exactly 100
- If only one platform has data, set the other platform's sentiment to { positive: 0, neutral: 100, negative: 0 }
- topics should be short noun phrases the audience discusses (2-4 words each)
- Return ONLY valid JSON, no markdown fences or extra text`;

    try {
        const response = await cohere.chat({
            model: "command-r-08-2024",
            message: prompt,
            documents,
        });

        let parsed;
        try {
            parsed = JSON.parse(response.text.replace(/```json\n?|```/g, "").trim());
        } catch {
            // If JSON parse fails, use defaults but keep the narrative text
            parsed = {
                narrative: response.text.slice(0, 500),
                tone: "Mixed",
                sentiment: { positive: 40, neutral: 40, negative: 20 },
                twitterSentiment: { positive: 40, neutral: 40, negative: 20 },
                instagramSentiment: { positive: 40, neutral: 40, negative: 20 },
                topics: [],
            };
        }

        // Map Cohere citations back to original source objects
        const citations = (response.citations || []).map(c => ({
            text: c.text,
            sources: (c.documentIds || []).map(docId => {
                const item = allItems.find(x => x.id === docId);
                return item ? item.src : null;
            }).filter(Boolean),
        })).filter(c => c.sources.length > 0);

        return {
            narrative: parsed.narrative || "",
            tone: parsed.tone || "Mixed",
            sentiment: parsed.sentiment || { positive: 33, neutral: 34, negative: 33 },
            twitterSentiment: parsed.twitterSentiment || { positive: 0, neutral: 100, negative: 0 },
            instagramSentiment: parsed.instagramSentiment || { positive: 0, neutral: 100, negative: 0 },
            topics: parsed.topics || [],
            citations,
            sourceCounts: { twitter: tweetItems.length, instagram: igItems.length },
        };
    } catch (err) {
        console.error("Cohere error:", err.message);
        return {
            narrative: "Sentiment analysis temporarily unavailable.",
            tone: "Unknown",
            sentiment: { positive: 0, neutral: 100, negative: 0 },
            twitterSentiment: { positive: 0, neutral: 100, negative: 0 },
            instagramSentiment: { positive: 0, neutral: 100, negative: 0 },
            topics: [],
            citations: [],
            sourceCounts: { twitter: tweetItems.length, instagram: igItems.length },
        };
    }
}

/* ── Instagram-only dedicated sentiment analysis ── */
export async function analyseInstagramOnly(igComments) {
    if (!igComments.length) {
        return {
            narrative: "No Instagram comments found yet. When followers comment on your posts, sentiment will appear here.",
            tone: "Neutral",
            sentiment: { positive: 0, neutral: 100, negative: 0 },
            topics: [],
            citations: [],
            totalComments: 0,
        };
    }

    const documents = igComments.map((c, i) => ({
        id: `ig_${i}`,
        text: `[Post: "${c.postCaption || 'untitled'}"] @${c.username}: ${c.text}`,
    }));

    const prompt = `You are an Instagram audience analyst. Analyse ONLY these Instagram post comments and return a JSON object with EXACTLY these keys (no markdown, no extra text):

{
  "narrative": "2-3 sentences describing what Instagram followers think about this account and its content. Use [ig_N] citation markers for specific comments.",
  "tone": "One word: Enthusiastic | Appreciative | Critical | Supportive | Mixed | Curious | Polarised",
  "sentiment": { "positive": <int>, "neutral": <int>, "negative": <int> },
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}

Rules:
- sentiment values must sum to exactly 100
- topics are short noun phrases the followers discuss (e.g. "video quality", "posting schedule", "content style")
- Return ONLY raw JSON, nothing else`;

    try {
        const response = await cohere.chat({
            model: "command-r-08-2024",
            message: prompt,
            documents,
        });

        let parsed;
        try {
            parsed = JSON.parse(response.text.replace(/```json\n?|```/g, "").trim());
        } catch {
            parsed = {
                narrative: response.text.slice(0, 500),
                tone: "Mixed",
                sentiment: { positive: 40, neutral: 40, negative: 20 },
                topics: [],
            };
        }

        const citations = (response.citations || []).map(c => ({
            text: c.text,
            sources: (c.documentIds || []).map(docId => {
                const idx = parseInt(docId.replace("ig_", ""), 10);
                const src = igComments[idx];
                return src ? { ...src, platform: "instagram" } : null;
            }).filter(Boolean),
        })).filter(c => c.sources.length > 0);

        console.log(`📸 IG-only: ${parsed.tone}, ${parsed.sentiment?.positive}% positive from ${igComments.length} comments`);
        return {
            narrative: parsed.narrative || "",
            tone: parsed.tone || "Mixed",
            sentiment: parsed.sentiment || { positive: 33, neutral: 34, negative: 33 },
            topics: parsed.topics || [],
            citations,
            totalComments: igComments.length,
        };
    } catch (err) {
        console.error("Instagram Cohere error:", err?.message, err?.response?.data || err?.statusCode || "");

        return {
            narrative: "Instagram sentiment analysis temporarily unavailable.",
            tone: "Unknown",
            sentiment: { positive: 0, neutral: 100, negative: 0 },
            topics: [],
            citations: [],
            totalComments: igComments.length,
        };
    }
}

