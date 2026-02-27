// ================================================================
// app/api/agent/route.ts — Main AI Agent orchestrator
// ================================================================
import { NextRequest, NextResponse } from "next/server";
import { analyzeImage, analyzeFace } from "@/lib/vision";
import { planThumbnail } from "@/lib/planner";
import { executeTool } from "@/lib/tools";
import { getOrCreateSession, addMessage, updateSession } from "@/lib/memory";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // imageUrl = primary/style image, additionalImageUrls = extra images (face photos etc.)
        const { message, imageUrl, additionalImageUrls, sessionId } = body;

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const session = getOrCreateSession(sessionId);
        addMessage(session.id, {
            role: "user",
            content: message,
            imageUrl: imageUrl || undefined,
        });

        const toolCallLog: Array<{ name: string; status: string; message: string }> = [];

        // ── Step 1: Detect if this is a face-swap / multi-image request ──
        const allImageUrls: string[] = [
            ...(imageUrl ? [imageUrl] : []),
            ...(additionalImageUrls || []),
        ];

        const lowerMsg = message.toLowerCase();
        const isFaceSwap =
            allImageUrls.length >= 2 &&
            (lowerMsg.includes("face") ||
                lowerMsg.includes("replace") ||
                lowerMsg.includes("put") ||
                lowerMsg.includes("add") ||
                lowerMsg.includes("person") ||
                lowerMsg.includes("me") ||
                lowerMsg.includes("selfie"));

        // ── Step 2: Vision analysis ──────────────────────────────────
        let styleImageAnalysis = null;
        let faceAnalysis = null;

        if (allImageUrls.length > 0) {
            toolCallLog.push({ name: "analyze_image", status: "running", message: "Analyzing reference image..." });
            styleImageAnalysis = await analyzeImage(allImageUrls[0]);
            toolCallLog[toolCallLog.length - 1].status = "done";
            toolCallLog[toolCallLog.length - 1].message = `Style image analyzed ✓`;
        }

        if (isFaceSwap && allImageUrls.length >= 2) {
            toolCallLog.push({ name: "analyze_face", status: "running", message: "Extracting face features from photo..." });
            faceAnalysis = await analyzeFace(allImageUrls[1]);
            toolCallLog[toolCallLog.length - 1].status = "done";
            toolCallLog[toolCallLog.length - 1].message = `Face analyzed: ${faceAnalysis.faceDescription?.slice(0, 60) || "done"} ✓`;
        }

        // ── Step 3: Build enriched instruction ──────────────────────
        let enrichedInstruction = message;
        if (isFaceSwap && faceAnalysis) {
            enrichedInstruction = `${message}

IMPORTANT — The person's face details extracted from their photo:
- Face: ${faceAnalysis.faceDescription}
- Hair: ${faceAnalysis.hairDescription}
- Skin tone: ${faceAnalysis.skinTone}
- Features: ${faceAnalysis.facialFeatures}
- Overall character: ${faceAnalysis.characterDescription}

YOU MUST include ALL these exact physical details in the generated character. The person's real face must be faithfully represented.`;
        }

        // ── Step 4: Planner ─────────────────────────────────────────
        toolCallLog.push({ name: "plan_thumbnail", status: "running", message: "Designing thumbnail plan..." });
        const previousMessages = session.messages
            .slice(-6)
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content }));

        const plan = await planThumbnail(enrichedInstruction, styleImageAnalysis || undefined, previousMessages);
        toolCallLog[toolCallLog.length - 1].status = "done";
        toolCallLog[toolCallLog.length - 1].message = `Plan ready ✓`;

        // ── Step 5: Execute tools ───────────────────────────────────
        let generatedImageUrl: string | undefined;
        let mainToolResult = null;

        for (const toolName of plan.toolCalls) {
            if (["analyze_image", "analyze_face", "plan_thumbnail"].includes(toolName)) continue;

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

        // ── Step 6: Build response ────────────────────────────────
        const isDemo = mainToolResult?.demo;
        const modelUsed = (mainToolResult as { modelUsed?: string } | null)?.modelUsed || (isDemo ? "Demo" : "SD3-Large");
        const faceSwapNote = isFaceSwap && faceAnalysis
            ? `\n**Face matched:** ${faceAnalysis.faceDescription?.slice(0, 80)}`
            : "";

        const promptPreview = plan.prompt.slice(0, 220) + (plan.prompt.length > 220 ? "..." : "");

        const responseLines = [
            `🎨 **${plan.style.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}** — generated with ${modelUsed}`,
            "",
            `**Mood:** ${plan.mood} | **Lighting:** ${plan.lighting}`,
            plan.effects.length ? `**Effects:** ${plan.effects.join(", ")}` : "",
            plan.textContent ? `**Text overlay:** "${plan.textContent}"` : "",
            faceSwapNote,
            "",
            "**Prompt sent to Stability AI:**",
            `\`${promptPreview}\``,
            "",
            isDemo
                ? "⚡ *Demo Mode — add API keys for real generation.*"
                : "✅ Generated with real AI models.",
        ].filter(Boolean).join("\n");

        const assistantMessage = addMessage(session.id, {
            role: "assistant",
            content: responseLines,
            generatedImageUrl,
        });

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
            faceAnalysis: faceAnalysis ? {
                faceDescription: faceAnalysis.faceDescription,
                hairDescription: faceAnalysis.hairDescription,
                skinTone: faceAnalysis.skinTone,
            } : null,
        });
    } catch (error) {
        console.error("Agent error:", error);
        return NextResponse.json({ error: "Agent processing failed" }, { status: 500 });
    }
}
