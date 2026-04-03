// controllers/analytics.controller.js
import ScheduledPost from "../models/ScheduledPost.js";

/**
 * Get all scheduled posts with analytics data
 */
export const getScheduledPosts = async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: "Unauthorized: User not found in request" });
    }

    try {
        const posts = await ScheduledPost.find({ userId: user.id })
            .sort({ scheduledTime: 1 })
            .lean();

        const postsWithAnalytics = posts.map(post => ({
            ...post,
            engagementPrediction: calculateEngagementPrediction(post),
        }));

        const stats  = calculateStats(postsWithAnalytics);
        const charts = calculateCharts(postsWithAnalytics);

        res.json({ posts: postsWithAnalytics, stats, charts });
    } catch (err) {
        console.error("Error in getScheduledPosts:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
};

/** Engagement prediction per post */
function calculateEngagementPrediction(post) {
    const multiplier = post.usedOptimalTiming ? 1.5 : 1.0;
    const label      = post.usedOptimalTiming ? "High" : "Normal";
    const color      = post.usedOptimalTiming ? "green" : "gray";
    const predictedEngagement = Math.round(100 * multiplier);
    const boost = predictedEngagement - 100;
    return {
        score: predictedEngagement,
        boost: boost > 0 ? `+${boost}%` : "0%",
        label,
        color,
    };
}

/** Overall KPI stats */
function calculateStats(posts) {
    const totalPosts = posts.length;
    const optimalTimingPosts = posts.filter(p => p.usedOptimalTiming).length;
    const optimalTimingPercentage = totalPosts > 0
        ? Math.round((optimalTimingPosts / totalPosts) * 100) : 0;
    const avgEngagement = totalPosts > 0
        ? Math.round(posts.reduce((s, p) => s + p.engagementPrediction.score, 0) / totalPosts)
        : 0;
    const pendingPosts   = posts.filter(p => p.status === "PENDING").length;
    const publishedPosts = posts.filter(p => p.status === "POSTED").length;
    const failedPosts    = posts.filter(p => p.status === "FAILED").length;

    return { totalPosts, optimalTimingPosts, optimalTimingPercentage, avgEngagement, pendingPosts, publishedPosts, failedPosts };
}

/** Pre-aggregated chart datasets derived from real DB posts */
function calculateCharts(posts) {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Posts per day of week
    const dayMap = {};
    DAYS.forEach(d => (dayMap[d] = { day: d, posts: 0, optimal: 0 }));
    posts.forEach(p => {
        const d = DAYS[new Date(p.scheduledTime).getDay()];
        dayMap[d].posts++;
        if (p.usedOptimalTiming) dayMap[d].optimal++;
    });
    const byDay = DAYS.map(d => dayMap[d]);

    // Hour-of-day histogram (0–23)
    const hourHistogram = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: 0 }));
    posts.forEach(p => { hourHistogram[new Date(p.scheduledTime).getHours()].count++; });

    // Post status split
    const statusSplit = [
        { name: 'Pending', value: posts.filter(p => p.status === 'PENDING').length },
        { name: 'Posted',  value: posts.filter(p => p.status === 'POSTED').length  },
        { name: 'Failed',  value: posts.filter(p => p.status === 'FAILED').length  },
    ].filter(s => s.value > 0);

    // Optimal vs manual timing
    const optimalSplit = [
        { name: 'Optimal', value: posts.filter(p => p.usedOptimalTiming).length   },
        { name: 'Manual',  value: posts.filter(p => !p.usedOptimalTiming).length  },
    ];

    // Engagement distribution
    const engDist = [
        { name: 'High',   value: posts.filter(p => p.engagementPrediction.label === 'High').length   },
        { name: 'Normal', value: posts.filter(p => p.engagementPrediction.label === 'Normal').length },
    ].filter(e => e.value > 0);

    // Cumulative growth over time
    const growth = posts.map((p, i) => ({
        name:    new Date(p.scheduledTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total:   i + 1,
        optimal: posts.slice(0, i + 1).filter(x => x.usedOptimalTiming).length,
    }));

    return { byDay, hourHistogram, statusSplit, optimalSplit, engDist, growth };
}
