// ================================================================
// planner.ts — LLM converts user instruction → structured SD prompt
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
// SYSTEM PROMPT — heavily engineered for SD gaming thumbnails
// ──────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Stable Diffusion prompt engineer who specialises in YouTube gaming thumbnails.

Your ONLY job is to read the user's instruction word-for-word and convert every detail into the best possible Stable Diffusion prompt.

RULES YOU MUST FOLLOW:
1. READ THE USER'S INSTRUCTION CAREFULLY. Never ignore any detail they mention.
2. If they say "CS2" → include: cs2 counter-strike, tactical shooter, desert eagle, AK-47, utility usage, competitive map, realistic game environment
3. If they say "fire" → include: blazing fire, flame particles, embers, heat shimmer, smoky fire effect, fiery glow
4. If they say "intense" → include: dramatic lighting, high contrast shadows, cinematic color grade, intense atmospheric haze
5. If they say "Valorant" → include: valorant agent, neon colors, stylized art, radiant energy
6. If they say "neon" → include: neon lights, electric glow, cyberpunk aesthetic, bioluminescent
7. Always add these quality boosters: ultra HD, 8k resolution, hyperrealistic, professional photography, trending on ArtStation, unreal engine 5 render, award winning digital art, volumetric lighting, depth of field
8. The PROMPT must be 80-150 words. Short prompts result in bad images.
9. The NEGATIVE PROMPT must always include: blurry, low quality, bad anatomy, deformed face, distorted, watermark, text errors, ugly, pixelated, low resolution, amateur, boring, flat lighting, washed out colors, overexposed, underexposed

Return ONLY this exact JSON structure, nothing else:
{
  "style": "one word style label",
  "mood": "one word mood",
  "lighting": "one phrase lighting description",
  "effects": ["effect1", "effect2", "effect3"],
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "textStyle": "text style description",
  "textContent": "text that should appear in thumbnail",
  "backgroundDescription": "detailed background",
  "characterDescription": "detailed character/subject",
  "prompt": "FULL STABLE DIFFUSION PROMPT HERE — must be 80-150 words with all quality boosters",
  "negativePrompt": "full negative prompt",
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "toolCalls": ["generate_thumbnail"]
}`;

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

        // Build rich context from image analysis
        const imageContext = imageAnalysis
            ? `\n\nUploaded image analysis:
- Subject: ${imageAnalysis.characterDescription || imageAnalysis.summary}
- Background: ${imageAnalysis.background}
- Mood: ${imageAnalysis.mood}
- Colors: ${imageAnalysis.colors?.join(", ")}
- Style: ${imageAnalysis.style}
Use these details to inform the thumbnail — match the person's appearance and environment.`
            : "";

        // Include last 4 messages for conversation context
        const history = (previousMessages?.slice(-4) || []) as Groq.Chat.ChatCompletionMessageParam[];

        const messages: Groq.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
            {
                role: "user",
                content: `USER INSTRUCTION: "${instruction}"${imageContext}

CRITICAL: Your prompt must faithfully execute EVERY detail the user mentioned. Do not add things they didn't ask for. Do not ignore anything they said.`,
            },
        ];

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages,
            max_tokens: 1200,
            temperature: 0.4, // Lower = more faithful to instruction
            response_format: { type: "json_object" },
        });

        const text = response.choices[0]?.message?.content || "{}";
        try {
            return JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : buildDemoPlan(instruction);
        }
    } catch (err) {
        console.error("Planner error:", err);
        return buildDemoPlan(instruction);
    }
}

// ── Demo fallback ─────────────────────────────────────────────────
function buildDemoPlan(instruction: string): ThumbnailPlan {
    const lower = instruction.toLowerCase();
    const isCS2 = lower.includes("cs2") || lower.includes("csgo") || lower.includes("counter");
    const isValorant = lower.includes("valorant");
    const hasFire = lower.includes("fire");
    const hasNeon = lower.includes("neon");
    const isIntense = lower.includes("intense") || lower.includes("aggressive") || lower.includes("epic");

    const basePrompt = `YouTube gaming thumbnail, ${instruction}, ultra HD 8k resolution, hyperrealistic, professional photography, cinematic color grade, dramatic volumetric lighting, depth of field, trending on ArtStation, unreal engine 5 render, award winning digital art`;

    return {
        style: isCS2 ? "cs2-tactical" : isValorant ? "valorant-neon" : "gaming-cinematic",
        mood: isIntense ? "aggressive" : "epic",
        lighting: hasFire ? "dramatic fire-lit, flickering flame light, warm orange key light" : "cinematic high contrast, rim light, deep shadows",
        effects: hasFire
            ? ["blazing fire", "flame particles", "embers", "heat shimmer", "smoke"]
            : hasNeon
                ? ["neon glow", "electric sparks", "light streaks", "bloom effect"]
                : ["particle burst", "lens flare", "cinematic glow", "atmospheric haze"],
        colorPalette: hasFire ? ["#FF6B00", "#FF2200", "#1A1A2E"] : hasNeon ? ["#BF00FF", "#00FFFF", "#0F1923"] : ["#E94560", "#1A1A2E", "#3B82F6"],
        textStyle: hasFire ? "fire-glow bold 3D typography" : "metallic chrome bold 3D",
        textContent: isCS2 ? "GAME OVER" : isValorant ? "ACE!" : "EPIC PLAYS",
        backgroundDescription: `Dark atmospheric ${isCS2 ? "CS2 competitive map environment, dust and smoke" : "gaming environment"}, dramatic depth of field blur`,
        characterDescription: "Professional esports player, determined expression, ultra-detailed, perfect face",
        prompt: `${basePrompt}, ${hasFire ? "raging fire, blazing flames, ember particles, fire light casting, heat shimmer" : "neon lights, particle effects"}, dark background with dramatic lighting, professional YouTube thumbnail composition`,
        negativePrompt: "blurry, low quality, bad anatomy, deformed face, distorted face, extra limbs, text errors, watermark, ugly, pixelated, low resolution, amateur photography, flat lighting, washed out colors, overexposed, underexposed, cartoon, anime (unless requested)",
        steps: [
            `Step 1: Parse instruction — "${instruction.slice(0, 60)}"`,
            "Step 2: Build high-detail SD prompt with quality boosters",
            "Step 3: Generate with Stability AI Core",
            "Step 4: Apply cinematic post-processing",
        ],
        toolCalls: ["generate_thumbnail"],
    };
}
