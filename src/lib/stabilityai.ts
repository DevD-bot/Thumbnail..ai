// ================================================================
// stabilityai.ts — Stability AI wrapper, SD3-Large primary
// ================================================================
const DEMO_IMAGES = [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280&h=720&fit=crop",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1280&h=720&fit=crop",
    "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1280&h=720&fit=crop",
];
let demoIndex = 0;

export interface GenerateOptions {
    prompt: string;
    negativePrompt?: string;
    initImageBase64?: string;
}

export interface GenerateResult {
    imageUrl: string;
    demo?: boolean;
    modelUsed?: string;
}

export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
    // Read env fresh every call — never use module-level cache
    const isDemoMode = process.env.DEMO_MODE === "true" || !process.env.STABILITY_API_KEY;

    if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 2000));
        const imageUrl = DEMO_IMAGES[demoIndex++ % DEMO_IMAGES.length];
        return { imageUrl, demo: true };
    }

    const { prompt, negativePrompt } = options;

    // ── Primary: SD3-Large (best instruction-following) ────────────
    try {
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("model", "sd3-large");          // Best quality + instruction-following
        form.append("aspect_ratio", "16:9");          // 16:9 = YouTube thumbnail ratio
        form.append("output_format", "png");
        if (negativePrompt) form.append("negative_prompt", negativePrompt);

        const res = await fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
                Accept: "image/*",
            },
            body: form,
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("SD3-Large error:", res.status, errText);
            throw new Error(`SD3-Large ${res.status}: ${errText}`);
        }

        const buf = await res.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        return { imageUrl: `data:image/png;base64,${b64}`, modelUsed: "SD3-Large" };

    } catch (err) {
        console.warn("SD3-Large failed, trying Core:", err);

        // ── Fallback: Core with cinematic style ───────────────────────
        try {
            const form2 = new FormData();
            form2.append("prompt", prompt);
            form2.append("aspect_ratio", "16:9");
            form2.append("output_format", "png");
            form2.append("style_preset", "cinematic");
            if (negativePrompt) form2.append("negative_prompt", negativePrompt);

            const res2 = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
                    Accept: "image/*",
                },
                body: form2,
            });

            if (!res2.ok) throw new Error(`Core: ${res2.status}`);

            const buf2 = await res2.arrayBuffer();
            const b642 = Buffer.from(buf2).toString("base64");
            return { imageUrl: `data:image/png;base64,${b642}`, modelUsed: "Core" };

        } catch (err2) {
            // Don't silently fall back to demo — surface the real error
            const errMsg = err2 instanceof Error ? err2.message : String(err2);
            console.error("[Stability AI] All models failed. Final error:", errMsg);
            throw new Error(`Stability AI generation failed: ${errMsg}`);
        }
    }
}

export async function enhanceImage(imageBase64: string, prompt: string): Promise<GenerateResult> {
    return generateImage({
        prompt: `${prompt}, ultra HD, hyperrealistic, 8k, professional quality, cinematic lighting`,
        negativePrompt: "blurry, low quality, artifacts, watermark",
    });
}
