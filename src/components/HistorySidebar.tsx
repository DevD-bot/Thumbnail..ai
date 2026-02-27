"use client";
import { PlusCircle, MessageCircle, Zap } from "lucide-react";

interface SessionItem {
    id: string;
    title: string;
    messageCount: number;
    currentImageUrl?: string;
    updatedAt: number;
}

interface HistorySidebarProps {
    sessions: SessionItem[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
}

function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function HistorySidebar({ sessions, activeSessionId, onSelectSession, onNewChat }: HistorySidebarProps) {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <div className="logo-icon">🎯</div>
                    <span>Thumbnail<span>.AI</span></span>
                </div>
                <button className="new-chat-btn" onClick={onNewChat}>
                    <PlusCircle size={14} />
                    New Thumbnail
                </button>
            </div>

            <span className="sidebar-section-label">Recent Sessions</span>

            <div className="sidebar-sessions">
                {sessions.length === 0 ? (
                    <div style={{
                        padding: "20px 12px",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                        lineHeight: 1.6,
                    }}>
                        <MessageCircle size={20} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
                        No sessions yet.
                        <br />Start a new conversation!
                    </div>
                ) : (
                    sessions.map((s) => (
                        <div
                            key={s.id}
                            className={`session-item ${s.id === activeSessionId ? "active" : ""}`}
                            onClick={() => onSelectSession(s.id)}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {s.currentImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={s.currentImageUrl}
                                        alt="thumb"
                                        style={{ width: 28, height: 16, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 28, height: 16,
                                        background: "var(--bg-card)",
                                        borderRadius: 3,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 8,
                                        flexShrink: 0,
                                    }}>🎨</div>
                                )}
                                <div className="session-title">{s.title}</div>
                            </div>
                            <div className="session-meta" style={{ marginTop: 4, paddingLeft: 36 }}>
                                {s.messageCount} message{s.messageCount !== 1 ? "s" : ""} · {timeAgo(s.updatedAt)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="sidebar-footer">
                {isDemo ? (
                    <div className="demo-badge">
                        <div className="demo-dot" />
                        <div>
                            <div style={{ fontWeight: 600 }}>Demo Mode</div>
                            <div style={{ fontSize: "0.68rem", opacity: 0.8, marginTop: 1 }}>Add API keys for real AI</div>
                        </div>
                        <Zap size={12} style={{ marginLeft: "auto" }} />
                    </div>
                ) : (
                    <div className="demo-badge" style={{
                        background: "rgba(34, 197, 94, 0.1)",
                        borderColor: "rgba(34, 197, 94, 0.25)",
                        color: "var(--accent-green)",
                    }}>
                        <div className="demo-dot" style={{ background: "var(--accent-green)" }} />
                        <div>
                            <div style={{ fontWeight: 600 }}>Real AI Active</div>
                            <div style={{ fontSize: "0.68rem", opacity: 0.8, marginTop: 1 }}>Groq + Stability AI</div>
                        </div>
                        <Zap size={12} style={{ marginLeft: "auto" }} />
                    </div>
                )}
            </div>
        </div>
    );
}
