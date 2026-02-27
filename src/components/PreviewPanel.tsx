"use client";
import { Download, ImageIcon, Palette, Lightbulb } from "lucide-react";

interface Plan {
    style?: string;
    mood?: string;
    lighting?: string;
    effects?: string[];
    colorPalette?: string[];
    textContent?: string;
}

interface PreviewPanelProps {
    imageUrl: string | null;
    plan: Plan | null;
}

export default function PreviewPanel({ imageUrl, plan }: PreviewPanelProps) {
    const handleDownload = async () => {
        if (!imageUrl) return;
        try {
            const link = document.createElement("a");
            if (imageUrl.startsWith("data:")) {
                link.href = imageUrl;
            } else {
                const res = await fetch(imageUrl);
                const blob = await res.blob();
                link.href = URL.createObjectURL(blob);
            }
            link.download = `thumbnail-${Date.now()}.png`;
            link.click();
        } catch {
            // fallback
            window.open(imageUrl, "_blank");
        }
    };

    const effects = plan?.effects || [];
    const palette = plan?.colorPalette || [];

    return (
        <div className="preview-panel">
            <div className="preview-header">
                <h3>
                    <ImageIcon size={15} />
                    Preview
                </h3>
                {imageUrl && (
                    <span style={{ fontSize: "0.72rem", color: "var(--accent-green)", fontWeight: 500 }}>
                        ● Live
                    </span>
                )}
            </div>

            <div className="preview-body">
                {!imageUrl ? (
                    <div className="preview-empty" style={{ flex: 1, minHeight: 200 }}>
                        <div className="preview-empty-icon">🖼️</div>
                        <p style={{ fontWeight: 500, color: "var(--text-secondary)" }}>No thumbnail yet</p>
                        <p style={{ fontSize: "0.78rem" }}>
                            Describe a thumbnail in the chat or upload an image to get started
                        </p>
                    </div>
                ) : (
                    <div className="preview-image-card">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Generated thumbnail" />
                        <div className="preview-image-actions">
                            <button className="btn-download" onClick={handleDownload}>
                                <Download size={13} />
                                Download PNG
                            </button>
                        </div>
                    </div>
                )}

                {plan && (
                    <>
                        <div className="plan-details">
                            <h4><Palette size={11} /> Style Details</h4>
                            <div className="plan-tag-list">
                                {plan.style && <span className="plan-tag">{plan.style}</span>}
                                {plan.mood && <span className="plan-tag orange">{plan.mood}</span>}
                                {plan.lighting && <span className="plan-tag purple">{plan.lighting}</span>}
                                {effects.slice(0, 4).map((e, i) => (
                                    <span key={i} className="plan-tag">{e}</span>
                                ))}
                            </div>
                        </div>

                        {palette.length > 0 && (
                            <div className="plan-details">
                                <h4><Lightbulb size={11} /> Color Palette</h4>
                                <div className="color-swatches">
                                    {palette.map((color, i) => (
                                        <div
                                            key={i}
                                            className="color-swatch"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {plan.textContent && (
                            <div className="plan-details">
                                <h4>✏️ Text Overlay</h4>
                                <div style={{
                                    fontSize: "1.1rem",
                                    fontWeight: 800,
                                    fontFamily: "var(--font-heading)",
                                    background: "linear-gradient(135deg, var(--accent-orange-bright), var(--accent-blue-bright))",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                }}>
                                    {plan.textContent}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
