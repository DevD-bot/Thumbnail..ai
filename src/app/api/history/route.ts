// ================================================================
// app/api/history/route.ts — Session history
// ================================================================
import { NextRequest, NextResponse } from "next/server";
import { getAllSessions, getSession } from "@/lib/memory";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
        const session = getSession(sessionId);
        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        return NextResponse.json({ session });
    }

    const sessions = getAllSessions().map((s) => ({
        id: s.id,
        title: s.title,
        messageCount: s.messages.length,
        currentImageUrl: s.currentImageUrl,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
    }));

    return NextResponse.json({ sessions });
}
