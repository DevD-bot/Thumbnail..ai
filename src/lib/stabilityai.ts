// ================================================================
// stabilityai.ts — Stability AI image generation wrapper
// ================================================================

const isDemoMode = process.env.DEMO_MODE === "true" || !process.env.STABILITY_API_KEY;

// High-quality demo images from Picsum (gaming-themed placeholders)
const DEMO_IMAGES = [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280&h=720&fit=crop",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1280&h=720&fit=crop",
    "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1280&h=720&fit=crop",
    "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1280&h=720&fit=crop",
];

let demoIndex = 0;

export interface GenerateOptions {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfgScale?: number;
    style?: string;
    initImageBase64?: string;
    initImageStrength?: number;
}

export interface GenerateResult {
    imageUrl: string;
    seed?: number;
    demo?: boolean;
}

export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
    if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 2000));
        const imageUrl = DEMO_IMAGES[demoIndex % DEMO_IMAGES.length];
        demoIndex++;
        return { imageUrl, demo: true };
    }

    const { prompt, negativePrompt, width = 1280, height = 720, steps = 30, cfgScale = 7, initImageBase64 } = options;

    try {
        // Use Stability AI REST API (Core endpoint)
        const formData = new FormData();
        formData.append("prompt", prompt);
        if (negativePrompt) formData.append("negative_prompt", negativePrompt);
        formData.append("output_format", "webp");
        formData.append("aspect_ratio", "16:9");

        const endpoint = initImageBase64
            ? "https://api.stability.ai/v2beta/stable-image/generate/sd3"
            : "https://api.stability.ai/v2beta/stable-image/generate/core";

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
                Accept: "image/*",
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Stability AI error: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const imageUrl = `data:image/webp;base64,${base64}`;

        return { imageUrl };
    } catch (error) {
        console.error("Stability AI error:", error);
        // Fallback to demo on error
        const imageUrl = DEMO_IMAGES[demoIndex % DEMO_IMAGES.length];
        demoIndex++;
        return { imageUrl, demo: true };
    }
}

export async function enhanceImage(imageBase64: string, prompt: string): Promise<GenerateResult> {
    return generateImage({
        prompt: `${prompt}, highly detailed, 4k, professional, enhanced`,
        negativePrompt: "blurry, low quality, artifacts",
        initImageBase64: imageBase64,
        initImageStrength: 0.4,
    });
}
