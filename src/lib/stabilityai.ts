// ================================================================
// stabilityai.ts — Stability AI image generation wrapper
// ================================================================

const isDemoMode = process.env.DEMO_MODE === "true" || !process.env.STABILITY_API_KEY;

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

    const { prompt, negativePrompt } = options;

    // ── Stability AI Core (best quality, fast) ─────────────────────
    // Docs: https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1core/post
    try {
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("aspect_ratio", "16:9");          // Perfect for YouTube thumbnails
        form.append("output_format", "png");
        form.append("style_preset", "cinematic");     // Cinematic look for gaming
        if (negativePrompt) form.append("negative_prompt", negativePrompt);

        const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
                Accept: "image/*",
            },
            body: form,
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Stability AI error:", response.status, errText);
            throw new Error(`Stability AI ${response.status}: ${errText}`);
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return { imageUrl: `data:image/png;base64,${base64}` };

    } catch (error) {
        console.error("Stability AI generation failed — trying SD3:", error);

        // ── Fallback: Stable Diffusion 3 (more instruction-following) ──
        try {
            const form2 = new FormData();
            form2.append("prompt", prompt);
            form2.append("aspect_ratio", "16:9");
            form2.append("output_format", "png");
            form2.append("model", "sd3-large-turbo");
            if (negativePrompt) form2.append("negative_prompt", negativePrompt);

            const resp2 = await fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
                    Accept: "image/*",
                },
                body: form2,
            });

            if (!resp2.ok) throw new Error(`SD3 fallback ${resp2.status}`);

            const buf2 = await resp2.arrayBuffer();
            const b64 = Buffer.from(buf2).toString("base64");
            return { imageUrl: `data:image/png;base64,${b64}` };

        } catch (err2) {
            console.error("SD3 also failed:", err2);
            // Last resort: demo image
            const imageUrl = DEMO_IMAGES[demoIndex % DEMO_IMAGES.length];
            demoIndex++;
            return { imageUrl, demo: true };
        }
    }
}

export async function enhanceImage(imageBase64: string, prompt: string): Promise<GenerateResult> {
    return generateImage({
        prompt: `${prompt}, ultra HD, hyperrealistic, 8k, professional quality, cinematic lighting, award winning`,
        negativePrompt: "blurry, low quality, artifacts, watermark, text errors",
        initImageBase64: imageBase64,
        initImageStrength: 0.4,
    });
}
