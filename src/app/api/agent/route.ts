// ================================================================
// app/api/agent/route.ts — Main AI Agent orchestrator
// ================================================================
import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/vision";
import { planThumbnail } from "@/lib/planner";
import { executeTool } from "@/lib/tools";
import { getOrCreateSession, addMessage, updateSession } from "@/lib/memory";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, imageUrl, sessionId } = body;

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Get or create session
        const session = getOrCreateSession(sessionId);

        // Add user message to memory
        addMessage(session.id, {
            role: "user",
            content: message,
            imageUrl: imageUrl || undefined,
        });

        // Pipeline tracking
        const toolCallLog: Array<{ name: string; status: string; message: string }> = [];

        // ── Step 1: Vision (if image uploaded) ──────────────────────
        let imageAnalysis = null;
        if (imageUrl) {
            toolCallLog.push({ name: "analyze_image", status: "running", message: "Analyzing uploaded image..." });
            imageAnalysis = await analyzeImage(imageUrl);
            toolCallLog[toolCallLog.length - 1].status = "done";
            toolCallLog[toolCallLog.length - 1].message = `Image analyzed: ${imageAnalysis.summary}`;
        }

        // ── Step 2: Planner (LLM brain) ─────────────────────────────
        toolCallLog.push({ name: "plan_thumbnail", status: "running", message: "Planning thumbnail design..." });
        const previousMessages = session.messages
            .slice(-6)
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content }));

        const plan = await planThumbnail(message, imageAnalysis || undefined, previousMessages);
        toolCallLog[toolCallLog.length - 1].status = "done";
        toolCallLog[toolCallLog.length - 1].message = `Plan ready: ${plan.style} style, ${plan.mood} mood`;

        // ── Step 3: Execute Tools ────────────────────────────────────
        let generatedImageUrl: string | undefined;
        let mainToolResult = null;

        for (const toolName of plan.toolCalls) {
            if (toolName === "analyze_image") continue; // already done
            if (toolName === "plan_thumbnail") continue;

            const toolEntry = { name: toolName, status: "running", message: `Running ${toolName}...` };
            toolCallLog.push(toolEntry);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await executeTool(toolName as any, {
                plan,
                imageBase64: imageUrl,
                prompt: plan.prompt,
                style: plan.style,
            });

            toolEntry.status = result.success ? "done" : "error";
            toolEntry.message = result.message;

            if (result.imageUrl && !generatedImageUrl) {
                generatedImageUrl = result.imageUrl;
                mainToolResult = result;
            }
        }

        // ── Step 4: Build assistant response ────────────────────────
        const isDemo = mainToolResult?.demo;

        const responseLines = [
            `🎨 **${plan.style.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Thumbnail** created!`,
            "",
            `**Style:** ${plan.style} | **Mood:** ${plan.mood} | **Lighting:** ${plan.lighting}`,
            plan.effects.length ? `**Effects:** ${plan.effects.join(", ")}` : "",
            plan.textContent ? `**Text:** "${plan.textContent}"` : "",
            "",
            "**Generation steps:**",
            ...plan.steps.map((s) => `• ${s}`),
            "",
            isDemo
                ? "⚡ *Running in Demo Mode — add your Groq & Stability AI keys in `.env.local` for real AI generation.*"
                : "✅ Generated with real AI models.",
        ].filter(Boolean).join("\n");

        // Add assistant message to memory
        const assistantMessage = addMessage(session.id, {
            role: "assistant",
            content: responseLines,
            generatedImageUrl,
        });

        // Update session with latest image
        if (generatedImageUrl) {
            updateSession(session.id, { currentImageUrl: generatedImageUrl });
        }

        return NextResponse.json({
            sessionId: session.id,
            message: assistantMessage,
            toolCalls: toolCallLog,
            plan,
            generatedImageUrl,
            isDemo,
        });
    } catch (error) {
        console.error("Agent error:", error);
        return NextResponse.json({ error: "Agent processing failed" }, { status: 500 });
    }
}
