// controllers/analytics.controller.js
import ScheduledPost from "../models/ScheduledPost.js";

/**
 * Get all scheduled posts with analytics data
 * Calculates engagement predictions based on optimal timing usage
 */
export const getScheduledPosts = async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: "Unauthorized: User not found in request" });
    }

    try {
        // Fetch all scheduled posts for the user
        const posts = await ScheduledPost.find({ userId: user.id })
            .sort({ scheduledTime: 1 }) // Sort by scheduled time ascending
            .lean();

        // Calculate engagement predictions for each post
        const postsWithAnalytics = posts.map(post => {
            const engagementPrediction = calculateEngagementPrediction(post);
            return {
                ...post,
                engagementPrediction,
            };
        });

        // Calculate overall statistics
        const stats = calculateStats(postsWithAnalytics);

        res.json({
            posts: postsWithAnalytics,
            stats,
        });
    } catch (err) {
        console.error("Error in getScheduledPosts:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
};

/**
 * Calculate engagement prediction for a post
 * Based on optimal timing usage and platform
 */
function calculateEngagementPrediction(post) {
    let baseEngagement = 100; // 100% baseline
    let multiplier = 1.0;
    let label = "Normal";
    let color = "gray";

    // Boost for using optimal timing
    if (post.usedOptimalTiming) {
        multiplier = 1.5; // 50% boost
        label = "High";
        color = "green";
    }

    // Platform-specific adjustments (Instagram typically higher engagement)
    // This is a simplified model - in production, you'd use ML/historical data
    const platformBoost = 1.0; // Can be adjusted based on platform

    const predictedEngagement = Math.round(baseEngagement * multiplier * platformBoost);
    const boost = predictedEngagement - 100;

    return {
        score: predictedEngagement,
        boost: boost > 0 ? `+${boost}%` : "0%",
        label,
        color,
    };
}

/**
 * Calculate overall statistics
 */
function calculateStats(posts) {
    const totalPosts = posts.length;
    const optimalTimingPosts = posts.filter(p => p.usedOptimalTiming).length;
    const optimalTimingPercentage = totalPosts > 0
        ? Math.round((optimalTimingPosts / totalPosts) * 100)
        : 0;

    const avgEngagement = totalPosts > 0
        ? Math.round(posts.reduce((sum, p) => sum + p.engagementPrediction.score, 0) / totalPosts)
        : 100;

    // Count posts by status
    const pendingPosts = posts.filter(p => p.status === "PENDING").length;
    const publishedPosts = posts.filter(p => p.status === "PUBLISHED").length;

    return {
        totalPosts,
        optimalTimingPosts,
        optimalTimingPercentage,
        avgEngagement,
        pendingPosts,
        publishedPosts,
    };
}
