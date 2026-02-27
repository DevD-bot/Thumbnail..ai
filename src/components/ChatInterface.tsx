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
    imageUrl?: string;
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

interface ChatInterfaceProps {
    sessionId: string | null;
    onSessionCreated: (id: string) => void;
    onImageGenerated: (url: string, plan?: Plan) => void;
}

export default function ChatInterface({ sessionId, onSessionCreated, onImageGenerated }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [uploadedImage, setUploadedImage] = useState<{ url: string; name: string; size: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, currentToolCalls]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setUploadedImage({ url, name: file.name, size: file.size });
        e.target.value = "";
    };

    // Handle Ctrl+V image paste from clipboard
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = Array.from(e.clipboardData.items);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (imageItem) {
            e.preventDefault(); // Don't insert image data as text
            const file = imageItem.getAsFile();
            if (!file) return;
            const url = URL.createObjectURL(file);
            setUploadedImage({
                url,
                name: `pasted-image-${Date.now()}.png`,
                size: file.size,
            });
            // Show a subtle flash on the preview to indicate paste worked
            textareaRef.current?.focus();
        }
        // If it's text, let default paste behaviour handle it (do nothing)
    };

    const handleSend = async () => {
        if (!input.trim() && !uploadedImage) return;
        if (isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input.trim() || "Generate a gaming thumbnail from this image",
            imageUrl: uploadedImage?.url,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        const imageToSend = uploadedImage;
        setUploadedImage(null);
        setIsLoading(true);

        // Fake streaming tool calls
        const fakeCalls: ToolCall[] = [];
        if (imageToSend) {
            fakeCalls.push({ name: "analyze_image", status: "running", message: "Analyzing uploaded image..." });
            setCurrentToolCalls([...fakeCalls]);
            await new Promise((r) => setTimeout(r, 700));
            fakeCalls[0].status = "done";
            fakeCalls[0].message = "Image analyzed ✓";
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
                    imageUrl: imageToSend?.url || null,
                    sessionId,
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Agent failed");

            if (!sessionId) onSessionCreated(data.sessionId);

            // Show tool calls progressively
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

            if (data.generatedImageUrl) {
                onImageGenerated(data.generatedImageUrl, data.plan);
            }
        } catch (err) {
            const errMessage: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `❌ Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errMessage]);
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

    return (
        <div className="chat-panel">
            {isEmpty ? (
                <div className="chat-hero" style={{ position: "relative" }}>
                    <div className="hero-glow" />
                    <Sparkles size={42} style={{ color: "var(--accent-blue-bright)", opacity: 0.8 }} />
                    <div>
                        <h1 className="hero-title">Thumbnail.AI</h1>
                        <p className="hero-subtitle">
                            Your AI agent for gaming thumbnail creation. Describe your vision or upload an image to get started.
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
                                {msg.imageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={msg.imageUrl} alt="Uploaded" className="message-image-attach" />
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
                                <div
                                    className="message-content"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                />
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
                {uploadedImage && (
                    <div className="upload-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={uploadedImage.url} alt="Upload preview" className="upload-preview-img" />
                        <div className="upload-preview-info">
                            <div className="upload-preview-name">{uploadedImage.name}</div>
                            <div className="upload-preview-size">{(uploadedImage.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button className="btn-remove-upload" onClick={() => setUploadedImage(null)}>
                            <X size={14} />
                        </button>
                    </div>
                )}
                <div className="input-row">
                    <textarea
                        ref={textareaRef}
                        className="chat-textarea"
                        placeholder="Describe your thumbnail... or Ctrl+V to paste a screenshot"
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
                            style={{ display: "none" }}
                        />
                        <button className="btn-icon" title="Upload image" onClick={() => fileInputRef.current?.click()}>
                            <ImagePlus size={15} />
                        </button>
                        <button
                            className="btn-send"
                            onClick={handleSend}
                            disabled={(!input.trim() && !uploadedImage) || isLoading}
                            title="Send"
                        >
                            {isLoading ? <Zap size={15} style={{ animation: "pulse 1s infinite" }} /> : <Send size={15} />}
                        </button>
                    </div>
                </div>
                <p className="input-hint">Enter to send · Shift+Enter for new line · 📋 Ctrl+V to paste screenshot</p>
            </div>
        </div>
    );
}
