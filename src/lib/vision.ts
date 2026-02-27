// ================================================================
// vision.ts — Image understanding via Groq LLaVA
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
    summary:
        "A gaming-style portrait with a player in the foreground against a dark atmospheric background, suitable for a YouTube thumbnail.",
};

export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
    if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 800));
        return DEMO_ANALYSIS;
    }

    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const response = await groq.chat.completions.create({
            model: "llava-v1.5-7b-4096-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: { url: imageUrl },
                        },
                        {
                            type: "text",
                            text: `Analyze this image for gaming thumbnail creation. Return a JSON object with:
{
  "faces": number of faces visible,
  "background": "description of background",
  "style": "visual style/genre",
  "layout": "composition description",
  "colors": ["hex colors or color names"],
  "gameElements": ["list of gaming elements visible"],
  "mood": "emotional tone",
  "composition": "photographic composition notes",
  "summary": "one sentence summary for thumbnail creation"
}
Return ONLY valid JSON, no other text.`,
                        },
                    ],
                },
            ],
            max_tokens: 500,
        });

        const text = response.choices[0]?.message?.content || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : DEMO_ANALYSIS;
    } catch {
        return DEMO_ANALYSIS;
    }
}
