// ================================================================
// planner.ts — LLM converts user instruction → structured plan
// ================================================================
import Groq from "groq-sdk";
import { ImageAnalysis } from "./vision";

const isDemoMode = process.env.DEMO_MODE === "true" || !process.env.GROQ_API_KEY;

export interface ThumbnailPlan {
    style: string;
    mood: string;
    lighting: string;
    effects: string[];
    colorPalette: string[];
    textStyle: string;
    textContent: string;
    backgroundDescription: string;
    characterDescription: string;
    prompt: string;
    negativePrompt: string;
    steps: string[];
    toolCalls: string[];
}

const SYSTEM_PROMPT = `You are a professional gaming thumbnail designer AI.
Your job is to convert user instructions into structured thumbnail generation plans.

Always return a valid JSON object with this exact structure:
{
  "style": "cinematic|gaming|esports|neon|fire|minimal|etc",
  "mood": "intense|hype|calm|aggressive|epic|etc",
  "lighting": "dramatic|soft|neon|cinematic|backlit|etc",
  "effects": ["fire", "particles", "glow", "etc"],
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "textStyle": "bold-glow|fire-text|neon|metallic|3d|etc",
  "textContent": "main text for thumbnail if any",
  "backgroundDescription": "detailed background description",
  "characterDescription": "character/subject description",
  "prompt": "complete positive Stable Diffusion prompt",
  "negativePrompt": "negative SD prompt",
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "toolCalls": ["generate_thumbnail", "enhance_image"]
}

Return ONLY valid JSON.`;

export async function planThumbnail(
    instruction: string,
    imageAnalysis?: ImageAnalysis,
    previousMessages?: Array<{ role: string; content: string }>
): Promise<ThumbnailPlan> {
    if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 1200));
        return buildDemoPlan(instruction);
    }

    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const context = imageAnalysis
            ? `\n\nImage analysis of uploaded photo: ${JSON.stringify(imageAnalysis)}`
            : "";

        const messages: Groq.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT },
            ...(previousMessages?.slice(-4) as Groq.Chat.ChatCompletionMessageParam[] || []),
            {
                role: "user",
                content: `Create a thumbnail plan for: "${instruction}"${context}`,
            },
        ];

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages,
            max_tokens: 1000,
            temperature: 0.7,
        });

        const text = response.choices[0]?.message?.content || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return buildDemoPlan(instruction);
    } catch {
        return buildDemoPlan(instruction);
    }
}

function buildDemoPlan(instruction: string): ThumbnailPlan {
    const lowerInstr = instruction.toLowerCase();
    const isCS2 = lowerInstr.includes("cs2") || lowerInstr.includes("csgo");
    const isValorant = lowerInstr.includes("valorant");
    const hasFire = lowerInstr.includes("fire");
    const isIntense = lowerInstr.includes("intense") || lowerInstr.includes("aggressive");

    return {
        style: isCS2 ? "cs2-tactical" : isValorant ? "valorant-neon" : "gaming-cinematic",
        mood: isIntense ? "aggressive" : "epic",
        lighting: hasFire ? "fire-dramatic" : "cinematic-high-contrast",
        effects: hasFire ? ["fire", "embers", "smoke", "glow"] : ["particles", "lens-flare", "glow"],
        colorPalette: isCS2 ? ["#FF6B00", "#1A1A2E", "#E94560"] : ["#FF4655", "#0F1923", "#FFFCA0"],
        textStyle: hasFire ? "fire-glow-bold" : "metallic-3d",
        textContent: isCS2 ? "GAME OVER" : isValorant ? "CLUTCH" : "EPIC PLAYS",
        backgroundDescription:
            "Dark atmospheric gaming environment with dramatic volumetric lighting, fog, and depth of field blur",
        characterDescription:
            "Professional esports player, determined expression, high detail, dramatic lighting",
        prompt: `gaming thumbnail, ${instruction}, cinematic lighting, dramatic atmosphere, professional esports aesthetic, high contrast, vivid colors, 4k, hyperrealistic, trending on artstation`,
        negativePrompt:
            "blurry, low quality, distorted face, text errors, watermark, ugly, deformed, duplicate",
        steps: [
            "Step 1: Analyze uploaded image for face and composition",
            "Step 2: Apply gaming-style background with dramatic lighting",
            hasFire ? "Step 3: Add fire text effects and particle system" : "Step 3: Apply neon glow and color grading",
            "Step 4: Enhance contrast and add cinematic post-processing",
        ],
        toolCalls: ["analyze_image", "generate_thumbnail", "enhance_image"],
    };
}
