// services/socialListening.service.js
import { TwitterApi, TwitterApiV2Settings } from "twitter-api-v2";
import { CohereClient } from "cohere-ai";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

TwitterApiV2Settings.deprecationWarnings = false;

const twitterClient = new TwitterApi({
    appKey:       process.env.TWITTERCONSUMERKEY,
    appSecret:    process.env.TWITTERCONSUMERSECRET,
    accessToken:  process.env.TWITTERACCESSTOKEN,
    accessSecret: process.env.TWITTERACCESSTOKENSECRET,
});
const rwClient = twitterClient.readWrite;
const cohere   = new CohereClient({ token: process.env.COHERE_API_KEY });

/* ── Twitter profile + mentions ───────────────────── */
export async function fetchTwitterData() {
    try {
        const me = await rwClient.v2.me({
            "user.fields": ["public_metrics", "description", "profile_image_url", "username"],
        });
        const profile = {
            id:          me.data.id,
            name:        me.data.name,
            username:    me.data.username,
            description: me.data.description || "",
            followers:   me.data.public_metrics?.followers_count  ?? 0,
            following:   me.data.public_metrics?.following_count  ?? 0,
            tweets:      me.data.public_metrics?.tweet_count      ?? 0,
            avatar:      me.data.profile_image_url || "",
        };

        let mentions = [];
        try {
            const mentionsRes = await rwClient.v2.userMentionTimeline(me.data.id, {
                max_results: 20,
                "tweet.fields": ["created_at", "public_metrics", "author_id", "text"],
                "user.fields":  ["username", "name"],
                expansions:     ["author_id"],
            });
            const users = {};
            (mentionsRes.data?.includes?.users || []).forEach(u => { users[u.id] = { username: u.username, name: u.name }; });
            mentions = (mentionsRes.data?.data || []).map(t => ({
                id:        t.id,
                text:      t.text,
                createdAt: t.created_at,
                likes:     t.public_metrics?.like_count    ?? 0,
                retweets:  t.public_metrics?.retweet_count ?? 0,
                author:    users[t.author_id] || { username: "unknown", name: "Unknown" },
                url:       `https://x.com/${users[t.author_id]?.username || "i"}/status/${t.id}`,
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

    const igId  = user.igUserId;
    const token = user.accessToken;
    const v     = process.env.FBAPIVERSION || "v23.0";

    try {
        // Profile fields
        const profileRes = await axios.get(
            `https://graph.facebook.com/${v}/${igId}`,
            {
                params: {
                    fields:       "followers_count,media_count,biography,name,username,profile_picture_url",
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
                        fields:       "id,caption,like_count,comments_count,timestamp,media_type,thumbnail_url,media_url",
                        limit:        10,
                        access_token: token,
                    },
                }
            );
            recentMedia = (mediaRes.data?.data || []).map(m => ({
                id:            m.id,
                caption:       m.caption || "",
                likes:         m.like_count        ?? 0,
                comments:      m.comments_count    ?? 0,
                timestamp:     m.timestamp,
                type:          m.media_type,
                thumbnailUrl:  m.thumbnail_url || m.media_url || "",
            }));
        } catch (e) {
            console.warn("IG media fetch failed:", e.message);
        }

        // Comments on recent posts (for sentiment input)
        let comments = [];
        try {
            for (const media of recentMedia.slice(0, 5)) {
                const commentsRes = await axios.get(
                    `https://graph.facebook.com/${v}/${media.id}/comments`,
                    {
                        params: {
                            fields:       "text,timestamp,username",
                            limit:        10,
                            access_token: token,
                        },
                    }
                );
                const c = (commentsRes.data?.data || []).map(x => ({
                    text:      x.text,
                    timestamp: x.timestamp,
                    username:  x.username || "user",
                    postId:    media.id,
                    url:       `https://www.instagram.com/p/${media.id}/`,
                }));
                comments.push(...c);
            }
        } catch (e) {
            console.warn("IG comments fetch failed:", e.message);
        }

        return {
            connected:    true,
            username:     p.username     || "",
            name:         p.name         || "",
            bio:          p.biography    || "",
            followers:    p.followers_count  ?? 0,
            posts:        p.media_count      ?? 0,
            avatar:       p.profile_picture_url || "",
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
    const allItems = [
        ...twitterMentions.map((m, i) => ({
            id:   `tweet_${i}`,
            text: `@${m.author.username} on Twitter: ${m.text}`,
            src:  { ...m, platform: "twitter" },
        })),
        ...igComments.map((c, i) => ({
            id:   `igcomment_${i}`,
            text: `@${c.username} on Instagram: ${c.text}`,
            src:  { ...c, platform: "instagram" },
        })),
    ];

    if (!allItems.length) {
        return {
            narrative: "No audience interactions found yet. Once people mention or comment, AI insights will appear here.",
            tone:      "Neutral",
            sentiment: { positive: 0, neutral: 100, negative: 0 },
            topics:    [],
            citations: [],
        };
    }

    const documents = allItems.map(item => ({ id: item.id, text: item.text }));

    const prompt = `You are a social media analyst. Based on the provided audience interactions (tweets and Instagram comments), produce a JSON report with these exact keys:
- "narrative": a 3-sentence summary of what the audience says about this person/brand. Use inline citation markers like [tweet_0] or [igcomment_0] when referencing specific posts.
- "tone": single word tone descriptor (Enthusiastic, Critical, Supportive, Mixed, Curious, etc.)
- "sentiment": object with keys "positive", "neutral", "negative" as integers summing to 100
- "topics": array of up to 5 short topic strings being discussed

Return ONLY valid JSON, no markdown code fences.`;

    try {
        const response = await cohere.chat({
            model:     "command-r-08-2024",
            message:   prompt,
            documents,
        });

        let parsed;
        try {
            parsed = JSON.parse(response.text.replace(/```json|```/g, "").trim());
        } catch {
            parsed = {
                narrative: response.text,
                tone:      "Mixed",
                sentiment: { positive: 40, neutral: 40, negative: 20 },
                topics:    [],
            };
        }

        // Map Cohere citations → original source objects
        const citations = (response.citations || []).map(c => ({
            text:    c.text,
            sources: (c.documentIds || []).map(docId => {
                const item = allItems.find(x => x.id === docId);
                return item ? item.src : null;
            }).filter(Boolean),
        }));

        return {
            narrative: parsed.narrative  || "",
            tone:      parsed.tone       || "Mixed",
            sentiment: parsed.sentiment  || { positive: 33, neutral: 34, negative: 33 },
            topics:    parsed.topics     || [],
            citations,
        };
    } catch (err) {
        console.error("Cohere error:", err.message);
        return {
            narrative: "Sentiment analysis temporarily unavailable.",
            tone:      "Unknown",
            sentiment: { positive: 0, neutral: 100, negative: 0 },
            topics:    [],
            citations: [],
        };
    }
}
