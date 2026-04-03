// components/Analytics.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Analytics.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

function Analytics() {
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BACKEND_URL}/api/analytics/scheduled-posts`, {
                withCredentials: true
            });
            setPosts(response.data.posts);
            setStats(response.data.stats);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.response?.data?.error || 'Failed to load analytics');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-container">
                <div className="error-message">
                    <h2>❌ Error</h2>
                    <p>{error}</p>
                    <button onClick={fetchAnalytics} className="retry-btn">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <h1>📊 Analytics Dashboard</h1>
                <p>Track your scheduled posts and engagement predictions</p>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📅</div>
                        <div className="stat-content">
                            <h3>{stats.totalPosts}</h3>
                            <p>Total Scheduled</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">✨</div>
                        <div className="stat-content">
                            <h3>{stats.optimalTimingPercentage}%</h3>
                            <p>Using Optimal Timing</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">📈</div>
                        <div className="stat-content">
                            <h3>{stats.avgEngagement}%</h3>
                            <p>Avg Engagement</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">⏳</div>
                        <div className="stat-content">
                            <h3>{stats.pendingPosts}</h3>
                            <p>Pending Posts</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Scheduled Posts */}
            <div className="posts-section">
                <h2>Scheduled Posts</h2>
                {posts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <h3>No Scheduled Posts</h3>
                        <p>Schedule your first post to see analytics here!</p>
                    </div>
                ) : (
                    <div className="posts-grid">
                        {posts.map((post) => (
                            <div key={post._id} className="post-card">
                                <div className="post-header">
                                    <div className={`status-badge status-${post.status.toLowerCase()}`}>
                                        {post.status}
                                    </div>
                                    <div className={`engagement-badge engagement-${post.engagementPrediction.color}`}>
                                        {post.engagementPrediction.boost}
                                    </div>
                                </div>

                                <div className="post-content">
                                    <p className="post-caption">
                                        {post.caption.length > 100
                                            ? post.caption.substring(0, 100) + '...'
                                            : post.caption}
                                    </p>
                                </div>

                                <div className="post-meta">
                                    <div className="meta-item">
                                        <span className="meta-icon">📅</span>
                                        <span>{new Date(post.scheduledTime).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-icon">⏰</span>
                                        <span>{new Date(post.scheduledTime).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                        })}</span>
                                    </div>
                                </div>

                                <div className="post-footer">
                                    {post.usedOptimalTiming && (
                                        <div className="optimal-badge">
                                            ✨ Optimal Timing
                                        </div>
                                    )}
                                    <div className={`engagement-label engagement-${post.engagementPrediction.color}`}>
                                        {post.engagementPrediction.label} Engagement
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Analytics;
