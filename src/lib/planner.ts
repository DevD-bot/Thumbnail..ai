// ================================================================
// planner.ts — LLM converts instruction → SD3-ready prompt
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

// ──────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — zero hallucination, exact instruction following
// ──────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a Stable Diffusion 3 prompt engineer for YouTube gaming thumbnails.

THE GOLDEN RULE: Your prompt must contain EVERY specific word and detail from the user's instruction. Do NOT add things they didn't mention. Do NOT replace their words with synonyms.

EXAMPLES OF WHAT NOT TO DO:
❌ User says "banana" → you write "fruit" (WRONG — use the exact word "banana")
❌ User says "nano pro" → you ignore it (WRONG — include it exactly)
❌ User says "red car" → you write "vehicle" (WRONG — say "red car")

EXAMPLES OF CORRECT BEHAVIOUR:
✅ User says "CS2 fire text" → prompt includes "CS2 Counter-Strike 2, fire text, flaming typography"
✅ User says "banana background" → prompt includes "banana background, yellow bananas"
✅ User says "nano pro phone" → prompt includes "nano pro phone displayed prominently"

MANDATORY QUALITY SUFFIX (always append to every prompt):
", YouTube gaming thumbnail composition, ultra HD 8k, hyperrealistic, cinematic lighting, professional photography, trending on ArtStation, volumetric lighting, sharp focus"

MANDATORY NEGATIVE PROMPT (always use this):
"blurry, low quality, bad anatomy, deformed face, distorted, watermark, text errors, ugly, pixelated, overexposed, flat lighting, washed out"

Return ONLY this JSON — no markdown, no explanation:
{
  "style": "single word",
  "mood": "single word",
  "lighting": "lighting phrase",
  "effects": ["effect1","effect2"],
  "colorPalette": ["#hex1","#hex2","#hex3"],
  "textStyle": "text style",
  "textContent": "text to show in thumbnail if user mentioned any",
  "backgroundDescription": "background",
  "characterDescription": "character/subject",
  "prompt": "THE FULL PROMPT — start with user's exact words, then add specifics, end with quality suffix",
  "negativePrompt": "the mandatory negative prompt",
  "steps": ["Step 1: ...","Step 2: ...","Step 3: ..."],
  "toolCalls": ["generate_thumbnail"]
}`;

export async function planThumbnail(
    instruction: string,
    imageAnalysis?: ImageAnalysis,
    previousMessages?: Array<{ role: string; content: string }>
): Promise<ThumbnailPlan> {
    if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 800));
        return buildDemoPlan(instruction);
    }

    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const imageContext = imageAnalysis
            ? `\nReference image context: background="${imageAnalysis.background}", style="${imageAnalysis.style}", mood="${imageAnalysis.mood}"`
            : "";

        const history = (previousMessages?.slice(-4) || []) as Groq.Chat.ChatCompletionMessageParam[];

        const userContent = `USER'S EXACT INSTRUCTION: "${instruction}"${imageContext}

CRITICAL REMINDER: 
- Your prompt MUST start with the user's exact words
- Do NOT replace or paraphrase what they said
- Add details only to expand, never to contradict`;

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...history,
                { role: "user", content: userContent },
            ],
            max_tokens: 1000,
            temperature: 0.2,            // Very low = very literal/faithful
            response_format: { type: "json_object" },
        });

        const text = response.choices[0]?.message?.content || "{}";
        try {
            const parsed = JSON.parse(text);
            // Safety check: ensure user's instruction words appear in the prompt
            const instructionWords = instruction.toLowerCase().split(" ").filter(w => w.length > 3);
            const promptLower = (parsed.prompt || "").toLowerCase();
            const missing = instructionWords.filter(w => !promptLower.includes(w));
            if (missing.length > 0) {
                // Force-inject missing key words
                parsed.prompt = `${instruction}, ${parsed.prompt}`;
                console.warn("Injected missing words into prompt:", missing);
            }
            return parsed;
        } catch {
            return buildDemoPlan(instruction);
        }
    } catch (err) {
        console.error("Planner error:", err);
        return buildDemoPlan(instruction);
    }
}

function buildDemoPlan(instruction: string): ThumbnailPlan {
    const lower = instruction.toLowerCase();
    const isCS2 = lower.includes("cs2") || lower.includes("counter");
    const hasFire = lower.includes("fire");
    const hasNeon = lower.includes("neon");

    const qualitySuffix = ", YouTube gaming thumbnail, ultra HD 8k, hyperrealistic, cinematic lighting, professional photography, trending on ArtStation, volumetric lighting, sharp focus";
    const negativePrompt = "blurry, low quality, bad anatomy, deformed face, distorted, watermark, text errors, ugly, pixelated, overexposed, flat lighting, washed out";

    return {
        style: isCS2 ? "cs2-tactical" : "gaming-cinematic",
        mood: "intense",
        lighting: hasFire ? "fire-lit dramatic" : "cinematic high-contrast",
        effects: hasFire ? ["fire", "embers", "smoke"] : hasNeon ? ["neon glow", "particles"] : ["cinematic glow"],
        colorPalette: hasFire ? ["#FF6B00", "#FF2200", "#1A1A2E"] : ["#3B82F6", "#8B5CF6", "#1A1A2E"],
        textStyle: hasFire ? "fire glow bold" : "metallic bold",
        textContent: "",
        backgroundDescription: "dark atmospheric gaming environment",
        characterDescription: "esports player, dramatic lighting",
        prompt: `${instruction}${qualitySuffix}`,
        negativePrompt,
        steps: [
            "Step 1: Parse user instruction literally",
            "Step 2: Build faithful SD3 prompt",
            "Step 3: Generate with SD3-Large",
        ],
        toolCalls: ["generate_thumbnail"],
    };
}
