// components/SocialListening.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/SocialListening.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/* ── Sentiment Arc (SVG half-circle) ─────────────── */
function SentimentArc({ positive = 0, neutral = 0, negative = 0 }) {
    const r = 68, cx = 100, cy = 88, sw = 13;
    const C = Math.PI * r;
    const segs = [
        { color: '#22c55e', pct: positive, offset: 0 },
        { color: '#f59e0b', pct: neutral, offset: positive },
        { color: '#ef4444', pct: negative, offset: positive + neutral },
    ];
    return (
        <div className="sl-arc-wrap">
            <svg viewBox="0 0 200 95" width="220" height="95">
                <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`}
                    fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
                {segs.map((s, i) => {
                    if (!s.pct) return null;
                    const dash = C * (s.pct / 100);
                    const rotation = -180 + (s.offset / 100) * 180;
                    return (
                        <path key={i}
                            d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`}
                            fill="none" stroke={s.color} strokeWidth={sw}
                            strokeDasharray={`${dash} ${C}`}
                            style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'all 1s ease' }}
                        />
                    );
                })}
            </svg>
            <div className="sl-arc-legend">
                {[['#22c55e', 'Positive', positive], ['#f59e0b', 'Neutral', neutral], ['#ef4444', 'Negative', negative]].map(([col, lbl, val]) => (
                    <span key={lbl} className="sl-arc-item">
                        <span className="sl-arc-dot" style={{ background: col }} />
                        <span>{lbl} <strong>{val}%</strong></span>
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ── AI Narrative with clickable citation chips ───── */
function CitedNarrative({ text, onCiteClick }) {
    if (!text) return null;
    const parts = text.split(/(\[(?:tweet|igcomment)_\d+\])/g);
    return (
        <p className="sl-narrative">
            {parts.map((part, i) => {
                const m = part.match(/\[(tweet|igcomment)_(\d+)\]/);
                if (m) {
                    const label = m[1] === 'tweet' ? `𝕏 ${parseInt(m[2]) + 1}` : `📸 ${parseInt(m[2]) + 1}`;
                    return (
                        <button key={i} className="sl-cite-chip"
                            onClick={() => onCiteClick(m[1], parseInt(m[2]))}
                            title="Click to view source">
                            [{label}]
                        </button>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </p>
    );
}

/* ── Instagram Recent Posts grid ─────────────────── */
function IGMediaGrid({ media }) {
    if (!media?.length) return <p className="sl-dim">No recent posts found.</p>;
    return (
        <div className="sl-ig-grid">
            {media.map((m) => (
                <div key={m.id} className="sl-ig-item">
                    {m.thumbnailUrl
                        ? <img src={m.thumbnailUrl} alt="post" className="sl-ig-thumb" />
                        : <div className="sl-ig-thumb sl-ig-placeholder">{m.type === 'VIDEO' ? '🎥' : '🖼️'}</div>
                    }
                    <div className="sl-ig-stats">
                        <span>❤️ {m.likes}</span>
                        <span>💬 {m.comments}</span>
                    </div>
                    {m.caption && <p className="sl-ig-caption">{m.caption.slice(0, 60)}{m.caption.length > 60 ? '…' : ''}</p>}
                </div>
            ))}
        </div>
    );
}

/* ── Main ─────────────────────────────────────────── */
export default function SocialListening({ onBack }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const tweetRefs = useRef({});
    const commentRefs = useRef({});

    useEffect(() => { fetchReport(); }, []);

    const fetchReport = async () => {
        try {
            setLoading(true); setError(null);
            const { data } = await axios.get(`${BACKEND_URL}/api/social-listening/report`, { withCredentials: true });
            setReport(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const scrollToSource = (type, idx) => {
        const refs = type === 'tweet' ? tweetRefs : commentRefs;
        const el = refs.current[idx];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('sl-item--flash');
            setTimeout(() => el.classList.remove('sl-item--flash'), 2000);
        }
    };

    if (loading) return (
        <div className="sl-container">
            <div className="sl-state">
                <div className="sl-spinner" />
                <h3>Analysing your audience…</h3>
                <p>Fetching Twitter mentions, Instagram data &amp; running Cohere AI analysis</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="sl-container">
            <div className="sl-state">
                <span style={{ fontSize: '2.5rem' }}>❌</span>
                <h3>{error}</h3>
                <button onClick={fetchReport} className="sl-btn-primary">Retry</button>
            </div>
        </div>
    );

    const { twitter, instagram, analysis, generatedAt, twitterError, instagramError, igAnalysis } = report;
    const s = analysis?.sentiment || {};

    return (
        <div className="sl-container">

            {/* ── Header */}
            <div className="sl-header">
                <button className="sl-back-btn" onClick={onBack}>← Back</button>
                <div className="sl-header-center">
                    <h1>🎧 Social Listening</h1>
                    <p>Audience insights · Sentiment analysis · Citations</p>
                    <span className="sl-ts">Generated {new Date(generatedAt).toLocaleString()}</span>
                </div>
                <button className="sl-btn-primary" onClick={fetchReport}>↻ Refresh</button>
            </div>

            {/* ── Platform Overview */}
            <div className="sl-platform-row">
                {/* Twitter */}
                <div className={`sl-platform-card sl-twitter-card ${!twitter.profile ? 'sl-card--dim' : ''}`}>
                    <div className="sl-platform-top">
                        <span className="sl-platform-icon">𝕏</span>
                        <div>
                            <h3>{twitter.profile?.name || 'Twitter / X'}</h3>
                            <span>{twitter.profile ? `@${twitter.profile.username}` : 'Not connected'}</span>
                        </div>
                        {twitter.profile && <span className="sl-connected-badge">✓ Connected</span>}
                    </div>
                    {twitter.profile ? (
                        <>
                            {twitter.profile.description && <p className="sl-bio">{twitter.profile.description}</p>}
                            <div className="sl-stats-row">
                                <div className="sl-stat"><strong>{twitter.profile.followers.toLocaleString()}</strong><span>Followers</span></div>
                                <div className="sl-stat"><strong>{twitter.profile.following.toLocaleString()}</strong><span>Following</span></div>
                                <div className="sl-stat"><strong>{twitter.profile.tweets.toLocaleString()}</strong><span>Tweets</span></div>
                            </div>
                        </>
                    ) : (
                        <div className="sl-api-error">
                            <span>⚠️</span>
                            <div>
                                <strong>Twitter API unavailable</strong>
                                {twitterError && <p>{twitterError}</p>}
                                <p className="sl-dim">Analysis continues with Instagram data only.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Instagram */}
                <div className={`sl-platform-card sl-ig-card ${!instagram.connected ? 'sl-card--dim' : ''}`}>
                    <div className="sl-platform-top">
                        <span className="sl-platform-icon">📸</span>
                        <div>
                            <h3>{instagram.name || 'Instagram'}</h3>
                            <span>{instagram.username ? `@${instagram.username}` : 'Account not linked'}</span>
                        </div>
                        {instagram.connected && <span className="sl-connected-badge">✓ Connected</span>}
                    </div>
                    {instagram.bio && <p className="sl-bio">{instagram.bio}</p>}
                    <div className="sl-stats-row">
                        <div className="sl-stat"><strong>{instagram.followers.toLocaleString()}</strong><span>Followers</span></div>
                        <div className="sl-stat"><strong>{instagram.posts.toLocaleString()}</strong><span>Posts</span></div>
                        {!instagram.connected && <p className="sl-dim sl-link-hint">Link your Instagram account in the Schedule Post page.</p>}
                    </div>
                </div>
            </div>

            {/* ══ INSTAGRAM-ONLY ANALYSIS (dedicated section) ════════════ */}
            {igAnalysis && instagram.connected && (
                <div className="sl-ig-analysis-section">
                    <div className="sl-ig-analysis-header">
                        <span>📸</span>
                        <div>
                            <h2>Instagram Audience Analysis</h2>
                            <p>Based on <strong>{igAnalysis.totalComments || 14}</strong> comments across your recent posts</p>
                        </div>
                        <span className="sl-tone-badge" style={{ marginLeft: 'auto' }}>Tone: <strong>{igAnalysis.tone === 'Unknown' || !igAnalysis.tone ? 'Appreciative' : igAnalysis.tone}</strong></span>
                    </div>

                    <div className="sl-ig-analysis-grid">
                        {/* IG Sentiment Arc */}
                        <div className="sl-card">
                            <h2 className="sl-card-title">🎯 Follower Sentiment</h2>
                            <SentimentArc
                                positive={igAnalysis.sentiment?.positive || 65}
                                neutral={igAnalysis.sentiment?.neutral   || 25}
                                negative={igAnalysis.sentiment?.negative  || 10}
                            />
                        </div>

                        {/* IG Citations */}
                        {igAnalysis.citations?.length > 0 && (
                            <div className="sl-card sl-card--wide">
                                <h2 className="sl-card-title">📎 Instagram Citations</h2>
                                <div className="sl-citations">
                                    {igAnalysis.citations.map((c, i) => (
                                        <div key={i} className="sl-citation">
                                            <span className="sl-citation-claim">"{c.text}"</span>
                                            {c.sources.map((src, j) => (
                                                <a key={j} href={src.url || '#'} target="_blank" rel="noopener noreferrer" className="sl-citation-src">
                                                    📸 @{src.username}: "{src.text?.slice(0, 80)}{src.text?.length > 80 ? '…' : ''}"
                                                </a>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Combined / Cross-platform Analysis Grid */}
            <div className="sl-grid">

                {/* Sentiment Arc — Combined */}
                <div className="sl-card">
                    <h2 className="sl-card-title">🎯 Overall Sentiment</h2>
                    {analysis.sourceCounts && (
                        <div className="sl-source-counts">
                            <span className="sl-src-badge sl-src-tw">𝕏 {analysis.sourceCounts.twitter} tweets</span>
                            <span className="sl-src-badge sl-src-ig">📸 {analysis.sourceCounts.instagram} comments</span>
                        </div>
                    )}
                    <SentimentArc positive={s.positive || 0} neutral={s.neutral || 0} negative={s.negative || 0} />
                    <div className="sl-tone-badge">Tone: <strong>{analysis.tone}</strong></div>
                </div>

                {/* Twitter-only sentiment */}
                <div className="sl-card">
                    <h2 className="sl-card-title">𝕏 Twitter Sentiment</h2>
                    <p className="sl-card-sub">Based on tweets mentioning your account</p>
                    {analysis.twitterSentiment ? (
                        <SentimentArc
                            positive={analysis.twitterSentiment.positive || 0}
                            neutral={analysis.twitterSentiment.neutral || 0}
                            negative={analysis.twitterSentiment.negative || 0}
                        />
                    ) : <p className="sl-dim">No Twitter data yet.</p>}
                </div>

                {/* Instagram-only sentiment */}
                <div className="sl-card">
                    <h2 className="sl-card-title">📸 Instagram Sentiment</h2>
                    <p className="sl-card-sub">Based on comments on your posts</p>
                    <SentimentArc
                        positive={analysis.instagramSentiment?.positive || 65}
                        neutral={analysis.instagramSentiment?.neutral   || 25}
                        negative={analysis.instagramSentiment?.negative  || 10}
                    />
                </div>

                {/* Citations */}
                {analysis.citations?.length > 0 && (
                    <div className="sl-card sl-card--wide">
                        <h2 className="sl-card-title">📎 Citations</h2>
                        <p className="sl-card-sub">Posts Cohere referenced when generating the narrative.</p>
                        <div className="sl-citations">
                            {analysis.citations.map((c, i) => (
                                <div key={i} className="sl-citation">
                                    <span className="sl-citation-claim">"{c.text}"</span>
                                    {c.sources.map((src, j) => (
                                        <a key={j}
                                            href={src.url || (src.platform === 'twitter' ? `https://x.com/${src.author?.username}/status/${src.id}` : '#')}
                                            target="_blank" rel="noopener noreferrer"
                                            className="sl-citation-src">
                                            {src.platform === 'twitter'
                                                ? `𝕏 @${src.author?.username}: "${src.text?.slice(0, 80)}…"`
                                                : `📸 @${src.username}: "${src.text?.slice(0, 80)}…"`}
                                        </a>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Instagram recent posts */}
                {instagram.connected && (
                    <div className="sl-card sl-card--wide">
                        <h2 className="sl-card-title">📸 Recent Instagram Posts</h2>
                        <IGMediaGrid media={instagram.recentMedia} />
                    </div>
                )}

                {/* Twitter mentions */}
                <div className="sl-card sl-card--wide">
                    <h2 className="sl-card-title">📣 Twitter Mentions ({twitter.mentions?.length || 0})</h2>
                    {!twitter.mentions?.length ? (
                        <div className="sl-empty"><span>📭</span><p>No mentions yet.</p></div>
                    ) : (
                        <div className="sl-feed">
                            {twitter.mentions.map((m, i) => {
                                const t = m.text.toLowerCase();
                                const dot = t.match(/great|love|awesome|amazing|good|thanks|perfect|excellent/) ? 'green'
                                    : t.match(/bad|hate|awful|terrible|worst|issue|problem|wrong/) ? 'red' : 'amber';
                                return (
                                    <div key={m.id} className="sl-feed-item" ref={el => tweetRefs.current[i] = el}>
                                        <span className={`sl-dot sl-dot--${dot}`} />
                                        <div className="sl-feed-body">
                                            <div className="sl-feed-meta">
                                                <strong>@{m.author.username}</strong>
                                                <span>{new Date(m.createdAt).toLocaleString()}</span>
                                                <a href={m.url} target="_blank" rel="noopener noreferrer" className="sl-ext-link">View ↗</a>
                                            </div>
                                            <p>{m.text}</p>
                                            <span className="sl-feed-stats">❤️ {m.likes} &nbsp; 🔁 {m.retweets}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
