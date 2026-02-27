// ================================================================
// memory.ts — In-memory session store
// ================================================================
import { v4 as uuidv4 } from "uuid";

export interface Message {
    id: string;
    role: "user" | "assistant" | "tool";
    content: string;
    imageUrl?: string;
    generatedImageUrl?: string;
    toolCalls?: ToolCall[];
    timestamp: number;
}

export interface ToolCall {
    name: string;
    status: "pending" | "running" | "done" | "error";
    result?: string;
}

export interface Session {
    id: string;
    title: string;
    messages: Message[];
    currentImageId?: string;
    currentImageUrl?: string;
    userPreferences: Record<string, string>;
    createdAt: number;
    updatedAt: number;
}

// In-memory store (swap with Redis in production)
const sessions = new Map<string, Session>();

export function createSession(): Session {
    const id = uuidv4();
    const session: Session = {
        id,
        title: "New Session",
        messages: [],
        userPreferences: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    sessions.set(id, session);
    return session;
}

export function getSession(id: string): Session | null {
    return sessions.get(id) || null;
}

export function getOrCreateSession(id?: string): Session {
    if (id) {
        const existing = sessions.get(id);
        if (existing) return existing;
    }
    return createSession();
}

export function updateSession(id: string, updates: Partial<Session>): Session | null {
    const session = sessions.get(id);
    if (!session) return null;
    const updated = { ...session, ...updates, updatedAt: Date.now() };
    sessions.set(id, updated);
    return updated;
}

export function addMessage(sessionId: string, message: Omit<Message, "id" | "timestamp">): Message {
    const session = getOrCreateSession(sessionId);
    const msg: Message = {
        ...message,
        id: uuidv4(),
        timestamp: Date.now(),
    };
    session.messages.push(msg);
    // Auto-title from first user message
    if (session.messages.filter((m) => m.role === "user").length === 1 && message.role === "user") {
        session.title = message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "");
        updateSession(sessionId, { title: session.title });
    }
    updateSession(sessionId, { messages: session.messages });
    return msg;
}

export function getAllSessions(): Session[] {
    return Array.from(sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}
