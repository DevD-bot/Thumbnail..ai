// ================================================================
// vision.ts — Multi-image understanding via Groq LLaVA
// ================================================================
import Groq from "groq-sdk";

const isDemoMode = process.env.DEMO_MODE === "true" || !process.env.GROQ_API_KEY;

export interface ImageAnalysis {
    faces: number;
    background: string;
    style: string;
    layout: string;
    colors: string[];
    gameElements: string[];
    mood: string;
    composition: string;
    summary: string;
    characterDescription: string;
    // Face details for transplanting into another image
    faceDescription?: string;
    hairDescription?: string;
    skinTone?: string;
    facialFeatures?: string;
}

const DEMO_ANALYSIS: ImageAnalysis = {
    faces: 1,
    background: "dark gaming environment with subtle bokeh",
    style: "gaming / esports",
    layout: "portrait orientation, subject centered",
    colors: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
    gameElements: ["player character", "weapon", "gaming overlay elements"],
    mood: "intense, competitive, focused",
    composition: "rule of thirds, strong foreground subject",
    summary: "A gaming-style portrait with a player in the foreground against a dark atmospheric background.",
    characterDescription: "young gamer with intense expression, wearing gaming gear",
    faceDescription: "young adult male, dark hair, focused expression",
    hairDescription: "dark short hair",
    skinTone: "medium",
    facialFeatures: "strong jawline, focused eyes",
};

// Analyse a SINGLE image — used for the CS2/background style image
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
    if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 600));
        return DEMO_ANALYSIS;
    }
    return callLLaVA(imageUrl, `Analyze this gaming thumbnail image in detail. Return JSON:
{
  "faces": number,
  "background": "background description",
  "style": "visual style",
  "layout": "composition description",
  "colors": ["hex or color names"],
  "gameElements": ["list of game elements"],
  "mood": "emotional tone",
  "composition": "photography notes",
  "summary": "one sentence summary",
  "characterDescription": "full character description",
  "faceDescription": "face details",
  "hairDescription": "hair details",
  "skinTone": "skin tone",
  "facialFeatures": "notable facial features"
}
Return ONLY valid JSON.`);
}

// Analyse a FACE/person image for face transplant
export async function analyzeFace(imageUrl: string): Promise<ImageAnalysis> {
    if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 400));
        return {
            ...DEMO_ANALYSIS,
            faceDescription: "young South Asian male, approx 22 years old, dark messy hair, slight beard stubble, wearing black over-ear headphones, smiling expression, grey t-shirt, warm skin tone",
            hairDescription: "dark black messy/tousled hair, medium length",
            skinTone: "warm medium brown",
            facialFeatures: "rounded face, dark eyes, slight beard, bright smile, prominent cheekbones",
        };
    }
    return callLLaVA(imageUrl, `Analyze this person's face and appearance in extreme detail for use in AI image generation. Return JSON:
{
  "faces": 1,
  "background": "background",
  "style": "photo style",
  "layout": "composition",
  "colors": ["skin tone hex"],
  "gameElements": [],
  "mood": "expression mood",
  "composition": "portrait type",
  "summary": "one sentence",
  "characterDescription": "VERY detailed character description including age, ethnicity, build",
  "faceDescription": "EXTREMELY detailed face: age estimate, face shape, eye color, nose shape, lip shape, any beard/stubble, expression",
  "hairDescription": "exact hair color, texture, length, style",
  "skinTone": "exact skin tone description",
  "facialFeatures": "all notable features: eyebrows, cheekbones, jawline, any accessories like glasses/headphones"
}
Return ONLY valid JSON.`);
}

async function callLLaVA(imageUrl: string, prompt: string): Promise<ImageAnalysis> {
    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const response = await groq.chat.completions.create({
            model: "llama-3.2-11b-vision-preview",
            messages: [{
                role: "user",
                content: [
                    { type: "image_url", image_url: { url: imageUrl } },
                    { type: "text", text: prompt },
                ],
            }],
            max_tokens: 800,
            temperature: 0.1,
        });
        const text = response.choices[0]?.message?.content || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : DEMO_ANALYSIS;
    } catch (err) {
        console.error("Vision error:", err);
        return DEMO_ANALYSIS;
    }
}
