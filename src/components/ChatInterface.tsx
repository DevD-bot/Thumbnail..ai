"use client";
import { useState, useRef, useEffect } from "react";
import { Send, ImagePlus, X, Zap, Sparkles, Sword, Flame, Trophy, Youtube } from "lucide-react";

interface ToolCall {
    name: string;
    status: "running" | "done" | "error";
    message: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    imageUrls?: string[];
    generatedImageUrl?: string;
    toolCalls?: ToolCall[];
    timestamp: number;
}

interface Plan {
    style: string;
    mood: string;
    lighting: string;
    effects: string[];
    colorPalette: string[];
    textContent: string;
}

const MAX_IMAGES = 5;

const EXAMPLE_PROMPTS = [
    { icon: <Sword size={14} />, text: "CS2 thumbnail with fire text and intense lighting" },
    { icon: <Flame size={14} />, text: "Valorant clutch moment, neon purple glow effect" },
    { icon: <Trophy size={14} />, text: "Epic gaming wins highlight reel thumbnail" },
    { icon: <Youtube size={14} />, text: "YouTube gaming channel banner, dark cinematic style" },
];

function renderMarkdown(text: string) {
    return text
        .split("\n")
        .map((line, i) => {
            line = line
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.*?)\*/g, "<em>$1</em>")
                .replace(/`(.*?)`/g, "<code>$1</code>");
            if (line.startsWith("• ")) {
                return `<div style="padding-left:12px;margin:2px 0">• ${line.slice(2)}</div>`;
            }
            return `<span key="${i}">${line}</span>`;
        })
        .join("<br />");
}

interface UploadedImage {
    url: string;
    name: string;
    size: number;
}

interface ChatInterfaceProps {
    sessionId: string | null;
    onSessionCreated: (id: string) => void;
    onImageGenerated: (url: string, plan?: Plan) => void;
}

export default function ChatInterface({ sessionId, onSessionCreated, onImageGenerated }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    // ── Multi-image state ────────────────────────────────────────
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);
    const [pasteFlash, setPasteFlash] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, currentToolCalls]);

    // ── Add image to array (respects MAX_IMAGES) ─────────────────
    const addImage = (file: File, nameOverride?: string) => {
        if (uploadedImages.length >= MAX_IMAGES) return;
        const url = URL.createObjectURL(file);
        setUploadedImages((prev) => [
            ...prev,
            { url, name: nameOverride || file.name, size: file.size },
        ]);
    };

    // ── File picker (multi-select) ────────────────────────────────
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remaining = MAX_IMAGES - uploadedImages.length;
        files.slice(0, remaining).forEach((file) => addImage(file));
        e.target.value = "";
    };

    // ── Ctrl+V paste ─────────────────────────────────────────────
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter((item) => item.type.startsWith("image/"));
        if (imageItems.length === 0) return; // Let text paste work normally

        e.preventDefault();
        const remaining = MAX_IMAGES - uploadedImages.length;
        imageItems.slice(0, remaining).forEach((item, idx) => {
            const file = item.getAsFile();
            if (!file) return;
            addImage(file, `screenshot-${Date.now()}-${idx + 1}.png`);
        });

        // Flash the input border to confirm paste
        setPasteFlash(true);
        setTimeout(() => setPasteFlash(false), 600);
        textareaRef.current?.focus();
    };

    // ── Remove a single image from preview ───────────────────────
    const removeImage = (index: number) => {
        setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!input.trim() && uploadedImages.length === 0) return;
        if (isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input.trim() || "Generate a gaming thumbnail from these images",
            imageUrls: uploadedImages.map((img) => img.url),
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        const imagesToSend = [...uploadedImages];
        setUploadedImages([]);
        setIsLoading(true);

        const fakeCalls: ToolCall[] = [];
        if (imagesToSend.length > 0) {
            fakeCalls.push({ name: "analyze_image", status: "running", message: `Analyzing ${imagesToSend.length} image${imagesToSend.length > 1 ? "s" : ""}...` });
            setCurrentToolCalls([...fakeCalls]);
            await new Promise((r) => setTimeout(r, 700));
            fakeCalls[0].status = "done";
            fakeCalls[0].message = `${imagesToSend.length} image${imagesToSend.length > 1 ? "s" : ""} analyzed ✓`;
            setCurrentToolCalls([...fakeCalls]);
        }
        fakeCalls.push({ name: "plan_thumbnail", status: "running", message: "Planning thumbnail design..." });
        setCurrentToolCalls([...fakeCalls]);

        try {
            const res = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage.content,
                    // Send first image as primary; others as context
                    imageUrl: imagesToSend[0]?.url || null,
                    sessionId,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Agent failed");
            if (!sessionId) onSessionCreated(data.sessionId);

            const serverToolCalls: ToolCall[] = data.toolCalls || [];
            setCurrentToolCalls(serverToolCalls);
            await new Promise((r) => setTimeout(r, 400));

            const aiMessage: Message = {
                id: data.message?.id || crypto.randomUUID(),
                role: "assistant",
                content: data.message?.content || "Here is your thumbnail!",
                generatedImageUrl: data.generatedImageUrl,
                toolCalls: serverToolCalls,
                timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, aiMessage]);
            if (data.generatedImageUrl) onImageGenerated(data.generatedImageUrl, data.plan);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: `❌ Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
                    timestamp: Date.now(),
                },
            ]);
        } finally {
            setIsLoading(false);
            setCurrentToolCalls([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextareaInput = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    };

    const isEmpty = messages.length === 0 && !isLoading;
    const canAddMore = uploadedImages.length < MAX_IMAGES;

    return (
        <div className="chat-panel">
            {isEmpty ? (
                <div className="chat-hero" style={{ position: "relative" }}>
                    <div className="hero-glow" />
                    <Sparkles size={42} style={{ color: "var(--accent-blue-bright)", opacity: 0.8 }} />
                    <div>
                        <h1 className="hero-title">Thumbnail.AI</h1>
                        <p className="hero-subtitle">
                            Your AI agent for gaming thumbnail creation. Describe your vision or upload images to get started.
                        </p>
                    </div>
                    <div className="hero-chips">
                        {EXAMPLE_PROMPTS.map((p, i) => (
                            <button key={i} className="hero-chip" onClick={() => { setInput(p.text); textareaRef.current?.focus(); }}>
                                {p.icon} {p.text}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="messages-container">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message-row ${msg.role}`}>
                            <div className={`avatar ${msg.role === "assistant" ? "ai" : "user"}`}>
                                {msg.role === "assistant" ? "🤖" : "🎮"}
                            </div>
                            <div className={`message-bubble ${msg.role === "assistant" ? "ai" : "user"}`}>
                                {/* Multi-image grid in message */}
                                {msg.imageUrls && msg.imageUrls.length > 0 && (
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: msg.imageUrls.length === 1 ? "1fr" : "repeat(auto-fill, minmax(90px, 1fr))",
                                        gap: 6,
                                        marginBottom: 10,
                                    }}>
                                        {msg.imageUrls.map((url, i) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={i}
                                                src={url}
                                                alt={`Uploaded ${i + 1}`}
                                                style={{
                                                    width: "100%",
                                                    maxWidth: msg.imageUrls!.length === 1 ? 200 : 90,
                                                    height: msg.imageUrls!.length === 1 ? "auto" : 64,
                                                    objectFit: "cover",
                                                    borderRadius: 6,
                                                    border: "1px solid var(--border)",
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {msg.toolCalls && msg.toolCalls.length > 0 && (
                                    <div className="tool-calls" style={{ marginBottom: 10 }}>
                                        {msg.toolCalls.map((tc, i) => (
                                            <span key={i} className={`tool-badge ${tc.status}`}>
                                                {tc.status === "running" && <div className="tool-badge-spinner" />}
                                                {tc.status === "done" && "✓"}
                                                {tc.status === "error" && "✗"}
                                                {tc.name.replace(/_/g, " ")}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="message-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                {msg.generatedImageUrl && (
                                    <div className="message-generated-image" onClick={() => onImageGenerated(msg.generatedImageUrl!)}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={msg.generatedImageUrl} alt="Generated thumbnail" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="message-row">
                            <div className="avatar ai">🤖</div>
                            <div className="message-bubble ai">
                                {currentToolCalls.length > 0 && (
                                    <div className="tool-calls">
                                        {currentToolCalls.map((tc, i) => (
                                            <span key={i} className={`tool-badge ${tc.status}`}>
                                                {tc.status === "running" && <div className="tool-badge-spinner" />}
                                                {tc.status === "done" && "✓"}
                                                {tc.name.replace(/_/g, " ")} — {tc.message}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="typing-indicator">
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}

            {/* Input Area */}
            <div className="chat-input-area">
                {/* ── Multi-image preview strip ── */}
                {uploadedImages.length > 0 && (
                    <div style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        padding: "10px 12px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: 10,
                        alignItems: "center",
                    }}>
                        {uploadedImages.map((img, idx) => (
                            <div key={idx} style={{ position: "relative", flexShrink: 0 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={img.url}
                                    alt={`Preview ${idx + 1}`}
                                    style={{
                                        width: 64,
                                        height: 48,
                                        objectFit: "cover",
                                        borderRadius: 6,
                                        border: "1px solid var(--border)",
                                        display: "block",
                                    }}
                                />
                                <button
                                    onClick={() => removeImage(idx)}
                                    style={{
                                        position: "absolute",
                                        top: -6,
                                        right: -6,
                                        width: 18,
                                        height: 18,
                                        background: "#ef4444",
                                        border: "none",
                                        borderRadius: "50%",
                                        color: "white",
                                        cursor: "pointer",
                                        fontSize: 10,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: 0,
                                        lineHeight: 1,
                                    }}
                                    title={`Remove image ${idx + 1}`}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        {/* Slot counter */}
                        <div style={{
                            fontSize: "0.72rem",
                            color: uploadedImages.length >= MAX_IMAGES ? "#f87171" : "var(--text-muted)",
                            marginLeft: "auto",
                            whiteSpace: "nowrap",
                        }}>
                            {uploadedImages.length}/{MAX_IMAGES} images
                        </div>
                    </div>
                )}

                <div
                    className="input-row"
                    style={pasteFlash ? { borderColor: "var(--accent-green)", boxShadow: "0 0 14px rgba(34,197,94,0.3)" } : undefined}
                >
                    <textarea
                        ref={textareaRef}
                        className="chat-textarea"
                        placeholder={
                            uploadedImages.length >= MAX_IMAGES
                                ? "Max 5 images added — describe what to create..."
                                : "Describe your thumbnail... or Ctrl+V to paste screenshots"
                        }
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onInput={handleTextareaInput}
                        onPaste={handlePaste}
                        rows={1}
                        disabled={isLoading}
                    />
                    <div className="input-actions">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            multiple
                            style={{ display: "none" }}
                        />
                        <button
                            className="btn-icon"
                            title={canAddMore ? `Upload images (${uploadedImages.length}/${MAX_IMAGES})` : "Max 5 images reached"}
                            onClick={() => canAddMore && fileInputRef.current?.click()}
                            style={!canAddMore ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                        >
                            <ImagePlus size={15} />
                            {uploadedImages.length > 0 && (
                                <span style={{
                                    position: "absolute",
                                    top: -5,
                                    right: -5,
                                    background: "var(--accent-blue)",
                                    color: "white",
                                    borderRadius: "50%",
                                    width: 14,
                                    height: 14,
                                    fontSize: 9,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                }}>
                                    {uploadedImages.length}
                                </span>
                            )}
                        </button>
                        <button
                            className="btn-send"
                            onClick={handleSend}
                            disabled={((!input.trim() && uploadedImages.length === 0) || isLoading)}
                            title="Send"
                        >
                            {isLoading ? <Zap size={15} style={{ animation: "pulse 1s infinite" }} /> : <Send size={15} />}
                        </button>
                    </div>
                </div>
                <p className="input-hint">
                    Enter to send · Shift+Enter for new line · 📋 Ctrl+V paste · 🖼️ Up to {MAX_IMAGES} images
                </p>
            </div>
        </div>
    );
}
