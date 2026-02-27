"use client";
import { useState, useEffect, useCallback } from "react";
import ChatInterface from "@/components/ChatInterface";
import PreviewPanel from "@/components/PreviewPanel";
import HistorySidebar from "@/components/HistorySidebar";

interface Plan {
  style?: string;
  mood?: string;
  lighting?: string;
  effects?: string[];
  colorPalette?: string[];
  textContent?: string;
}

interface SessionSummary {
  id: string;
  title: string;
  messageCount: number;
  currentImageUrl?: string;
  updatedAt: number;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewPlan, setPreviewPlan] = useState<Plan | null>(null);
  const [chatKey, setChatKey] = useState(0); // force remount on new chat

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    const interval = setInterval(refreshSessions, 5000);
    return () => clearInterval(interval);
  }, [refreshSessions]);

  const handleSessionCreated = (id: string) => {
    setSessionId(id);
    refreshSessions();
  };

  const handleImageGenerated = (url: string, plan?: Plan) => {
    setPreviewImage(url);
    if (plan) setPreviewPlan(plan);
    refreshSessions();
  };

  const handleNewChat = () => {
    setSessionId(null);
    setPreviewImage(null);
    setPreviewPlan(null);
    setChatKey((k) => k + 1);
  };

  const handleSelectSession = async (id: string) => {
    setSessionId(id);
    setChatKey((k) => k + 1);
    try {
      const res = await fetch(`/api/history?sessionId=${id}`);
      const data = await res.json();
      if (data.session?.currentImageUrl) {
        setPreviewImage(data.session.currentImageUrl);
      }
    } catch {
      // silently fail
    }
  };

  return (
    <div className="app-layout">
      <HistorySidebar
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />

      <div className="main-area">
        <ChatInterface
          key={chatKey}
          sessionId={sessionId}
          onSessionCreated={handleSessionCreated}
          onImageGenerated={handleImageGenerated}
        />
        <PreviewPanel imageUrl={previewImage} plan={previewPlan} />
      </div>
    </div>
  );
}
