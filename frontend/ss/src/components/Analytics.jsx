// components/Analytics.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../styles/Analytics.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const C = { purple: '#8b5cf6', pink: '#ec4899', cyan: '#06b6d4', green: '#22c55e', amber: '#f59e0b', indigo: '#6366f1', red: '#ef4444' };

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="ac-tooltip">
            {label && <p className="ac-tooltip-label">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, margin: '2px 0' }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    );
};

const EmptyChart = ({ message = 'No data yet — schedule a post to see this chart.' }) => (
    <div className="ac-empty-chart">
        <span>📭</span>
        <p>{message}</p>
    </div>
);

function Analytics() {
    const [posts,   setPosts]   = useState([]);
    const [stats,   setStats]   = useState(null);
    const [charts,  setCharts]  = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [tab,     setTab]     = useState('overview');

    useEffect(() => { fetchAnalytics(); }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data } = await axios.get(`${BACKEND_URL}/api/analytics/scheduled-posts`, {
                withCredentials: true
            });
            setPosts(data.posts   || []);
            setStats(data.stats   || null);
            setCharts(data.charts || null);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.response?.data?.error || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="analytics-container">
            <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading analytics...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="analytics-container">
            <div className="error-message">
                <h2>❌ Error</h2>
                <p>{error}</p>
                <button onClick={fetchAnalytics} className="retry-btn">Retry</button>
            </div>
        </div>
    );

    const noData = posts.length === 0;

    // radar built from real stats — all zeros if no data
    const radarData = [
        { subject: 'Reach',       A: Math.min(100, (stats?.totalPosts || 0) * 12)          },
        { subject: 'Engagement',  A: stats?.avgEngagement || 0                              },
        { subject: 'Timing',      A: stats?.optimalTimingPercentage || 0                    },
        { subject: 'Consistency', A: Math.min(100, (stats?.totalPosts || 0) * 8)            },
        { subject: 'Growth',      A: Math.min(100, (stats?.totalPosts || 0) * 10)           },
    ];

    return (
        <div className="analytics-container">

            {/* Header */}
            <div className="analytics-header">
                <h1>📊 Analytics Dashboard</h1>
                <p>Track your scheduled posts and engagement predictions</p>
                <button onClick={fetchAnalytics} className="ac-refresh-btn">↻ Refresh</button>
            </div>

            {/* KPI Cards */}
            <div className="stats-grid">
                {[
                    { icon: '📅', value: stats?.totalPosts ?? 0,               label: 'Total Scheduled'    },
                    { icon: '✨', value: `${stats?.optimalTimingPercentage ?? 0}%`, label: 'Optimal Timing' },
                    { icon: '📈', value: `${stats?.avgEngagement ?? 0}%`,        label: 'Avg Engagement'    },
                    { icon: '⏳', value: stats?.pendingPosts ?? 0,              label: 'Pending Posts'      },
                ].map((k, i) => (
                    <div className="stat-card" key={i}>
                        <div className="stat-icon">{k.icon}</div>
                        <div className="stat-content">
                            <h3>{k.value}</h3>
                            <p>{k.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="ac-tab-bar">
                {['overview', 'schedule', 'engagement', 'posts'].map(t => (
                    <button
                        key={t}
                        className={`ac-tab ${tab === t ? 'ac-tab--active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {noData && (
                <p className="ac-demo-note">📭 No posts in the database yet. Schedule a post to see real chart data.</p>
            )}

            {/* ════ OVERVIEW ════ */}
            {tab === 'overview' && (
                <div className="ac-charts-grid">

                    <div className="ac-chart-card ac-wide">
                        <h3 className="ac-chart-title">📈 Cumulative Growth</h3>
                        {noData || !charts?.growth?.length ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={charts.growth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={C.purple} stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={C.purple} stopOpacity={0}   />
                                        </linearGradient>
                                        <linearGradient id="gOpt" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={C.pink} stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={C.pink} stopOpacity={0}   />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                                    <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }} />
                                    <Area type="monotone" dataKey="total"   name="Total Posts"   stroke={C.purple} fill="url(#gTotal)" strokeWidth={2} dot={false} />
                                    <Area type="monotone" dataKey="optimal" name="Optimal Posts"  stroke={C.pink}   fill="url(#gOpt)"   strokeWidth={2} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="ac-chart-card">
                        <h3 className="ac-chart-title">🟣 Post Status Split</h3>
                        {noData || !charts?.statusSplit?.length ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={charts.statusSplit} cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}>
                                        {charts.statusSplit.map((_, i) => (
                                            <Cell key={i} fill={[C.amber, C.green, C.red][i] || C.purple} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="ac-chart-card">
                        <h3 className="ac-chart-title">🕸 Performance Radar</h3>
                        {noData ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Score" dataKey="A" stroke={C.cyan} fill={C.cyan} fillOpacity={0.22} strokeWidth={2} />
                                    <Tooltip content={<ChartTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                </div>
            )}

            {/* ════ SCHEDULE ════ */}
            {tab === 'schedule' && (
                <div className="ac-charts-grid">

                    <div className="ac-chart-card ac-wide">
                        <h3 className="ac-chart-title">📅 Posts per Day of Week</h3>
                        {noData ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={charts?.byDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }} />
                                    <Bar dataKey="posts"   name="Total Posts"    fill={C.purple} radius={[6,6,0,0]} />
                                    <Bar dataKey="optimal" name="Optimal Timing"  fill={C.pink}   radius={[6,6,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="ac-chart-card ac-wide">
                        <h3 className="ac-chart-title">⏰ Posting Hours Histogram</h3>
                        <p className="ac-chart-sub">Number of posts scheduled per hour of day</p>
                        {noData ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={210}>
                                <BarChart data={charts?.hourHistogram} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} interval={3} />
                                    <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Posts" radius={[4,4,0,0]}>
                                        {(charts?.hourHistogram || []).map((_, i) => (
                                            <Cell key={i} fill={`hsl(${255 + i * 5}, 75%, 62%)`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                </div>
            )}

            {/* ════ ENGAGEMENT ════ */}
            {tab === 'engagement' && (
                <div className="ac-charts-grid">

                    <div className="ac-chart-card">
                        <h3 className="ac-chart-title">🎯 Engagement Distribution</h3>
                        {noData || !charts?.engDist?.length ? <EmptyChart /> : (
                            <>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={charts.engDist} cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={90} paddingAngle={5}
                                            dataKey="value" animationBegin={0} animationDuration={700}>
                                            {charts.engDist.map((_, i) => (
                                                <Cell key={i} fill={[C.green, C.purple][i] || C.amber} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="ac-legend">
                                    {charts.engDist.map((e, i) => (
                                        <div key={i} className="ac-legend-item">
                                            <span className="ac-legend-dot" style={{ background: [C.green, C.purple][i] }} />
                                            <span>{e.name}</span>
                                            <strong>{e.value}</strong>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="ac-chart-card">
                        <h3 className="ac-chart-title">✨ Optimal vs Manual</h3>
                        {noData ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={charts?.optimalSplit} cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={90} paddingAngle={4}
                                        dataKey="value" animationBegin={0} animationDuration={700}>
                                        <Cell fill={C.pink}   />
                                        <Cell fill={C.indigo} />
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="ac-chart-card ac-wide">
                        <h3 className="ac-chart-title">📊 Post Volume by Day</h3>
                        {noData ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={210}>
                                <BarChart data={charts?.byDay} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }} />
                                    <Bar dataKey="optimal" name="Optimal Posts" fill={C.green}  radius={[6,6,0,0]} />
                                    <Bar dataKey="posts"   name="Total Posts"   fill={C.purple} radius={[6,6,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                </div>
            )}

            {/* ════ POSTS ════ */}
            {tab === 'posts' && (
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
                                    <div className="ac-mini-bar">
                                        <div className="ac-mini-fill" style={{
                                            width: post.engagementPrediction.color === 'green' ? '80%' : '35%',
                                            background: post.engagementPrediction.color === 'green' ? C.green : C.purple,
                                        }} />
                                    </div>
                                    <div className="post-meta">
                                        <div className="meta-item">
                                            <span className="meta-icon">📅</span>
                                            <span>{new Date(post.scheduledTime).toLocaleDateString('en-US', {
                                                weekday: 'short', month: 'short', day: 'numeric'
                                            })}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-icon">⏰</span>
                                            <span>{new Date(post.scheduledTime).toLocaleTimeString('en-US', {
                                                hour: 'numeric', minute: '2-digit', hour12: true
                                            })}</span>
                                        </div>
                                    </div>
                                    <div className="post-footer">
                                        {post.usedOptimalTiming && (
                                            <div className="optimal-badge">✨ Optimal Timing</div>
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
            )}

        </div>
    );
}

export default Analytics;
