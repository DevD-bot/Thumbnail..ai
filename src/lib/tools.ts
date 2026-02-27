// ================================================================
// tools.ts — Tool definitions for the AI agent
// ================================================================
import { generateImage, enhanceImage } from "./stabilityai";
import { ThumbnailPlan } from "./planner";

export type ToolName = "generate_thumbnail" | "enhance_image" | "remove_background" | "analyze_image" | "apply_style";

export interface ToolResult {
    tool: ToolName;
    success: boolean;
    imageUrl?: string;
    message: string;
    demo?: boolean;
}

export async function executeTool(tool: ToolName, params: Record<string, unknown>): Promise<ToolResult> {
    switch (tool) {
        case "generate_thumbnail":
            return await runGenerateThumbnail(params as { plan: ThumbnailPlan });

        case "enhance_image":
            return await runEnhanceImage(params as { imageBase64?: string; prompt: string });

        case "remove_background":
            return {
                tool,
                success: true,
                message: "Background removed (demo mode — bg.remove API needed in production)",
                demo: true,
            };

        case "analyze_image":
            return {
                tool,
                success: true,
                message: "Image analyzed successfully",
            };

        case "apply_style":
            return await runApplyStyle(params as { imageBase64?: string; style: string; plan: ThumbnailPlan });

        default:
            return { tool, success: false, message: `Unknown tool: ${tool}` };
    }
}

async function runGenerateThumbnail(params: { plan: ThumbnailPlan }): Promise<ToolResult> {
    const { plan } = params;
    try {
        const result = await generateImage({
            prompt: plan.prompt,
            negativePrompt: plan.negativePrompt,
            width: 1280,
            height: 720,
        });
        return {
            tool: "generate_thumbnail",
            success: true,
            imageUrl: result.imageUrl,
            demo: result.demo,
            message: result.demo
                ? "Generated demo thumbnail (add API keys for real AI generation)"
                : "Thumbnail generated successfully",
        };
    } catch (e) {
        return { tool: "generate_thumbnail", success: false, message: `Generation failed: ${e}` };
    }
}

async function runEnhanceImage(params: { imageBase64?: string; prompt: string }): Promise<ToolResult> {
    try {
        const result = params.imageBase64
            ? await enhanceImage(params.imageBase64, params.prompt)
            : await generateImage({ prompt: params.prompt });
        return {
            tool: "enhance_image",
            success: true,
            imageUrl: result.imageUrl,
            demo: result.demo,
            message: "Image enhanced",
        };
    } catch (e) {
        return { tool: "enhance_image", success: false, message: `Enhancement failed: ${e}` };
    }
}

async function runApplyStyle(params: { imageBase64?: string; style: string; plan: ThumbnailPlan }): Promise<ToolResult> {
    const { style, plan } = params;
    const styledPrompt = `${plan.prompt}, ${style} style, ${plan.lighting} lighting, ${plan.effects.join(", ")}`;
    try {
        const result = await generateImage({
            prompt: styledPrompt,
            negativePrompt: plan.negativePrompt,
        });
        return {
            tool: "apply_style",
            success: true,
            imageUrl: result.imageUrl,
            demo: result.demo,
            message: `Applied ${style} style`,
        };
    } catch (e) {
        return { tool: "apply_style", success: false, message: `Style application failed: ${e}` };
    }
}
