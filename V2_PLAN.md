# Thumbnail.AI — V2 Roadmap

> Current status: V1 is live at `http://localhost:3000`. Groq LLM (planner + vision) works. Stability AI image generation is blocked due to **402 Payment Required** (no credits on free tier). V2 resolves this by switching to DALL-E 3 or Gemini Imagen and adds several major feature upgrades.

---

## 🔴 Critical Fix (Blocker)

### Replace Stability AI → DALL-E 3 or Gemini Imagen

**Why:** Stability AI SD3-Large and Core both return `402 Payment Required`. The key is valid but the free account has no generation credits.

#### Option A — OpenAI DALL-E 3 (Recommended)
- API key format: `sk-...`
- Endpoint: `POST https://api.openai.com/v1/images/generations`
- Model: `dall-e-3`
- Native 1792×1024 resolution (closest to 16:9 YouTube thumbnail)
- Best-in-class instruction following
- Cost: ~$0.04 per image (1024×1024), ~$0.08 (1792×1024)
- File to modify: `src/lib/stabilityai.ts` → **rename to `src/lib/imagegen.ts`**

```typescript
// V2 imagegen.ts (OpenAI DALL-E 3)
const response = await openai.images.generate({
  model: "dall-e-3",
  prompt: plan.prompt,
  size: "1792x1024",   // 16:9 YouTube thumbnail
  quality: "hd",
  style: "vivid",      // "vivid" for gaming, "natural" for realistic
  n: 1,
});
```

#### Option B — Google Gemini Imagen 3
- API key format: `AIza...`
- Endpoint via `@google/generative-ai` SDK
- Model: `imagen-3.0-generate-002`
- Best instruction following for text-in-image
- Cost: ~$0.03 per image
- Also supports editing existing images natively

```typescript
// V2 imagegen.ts (Gemini Imagen 3)
const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-002" });
const result = await model.generateImages({
  prompt: plan.prompt,
  numberOfImages: 1,
  aspectRatio: "16:9",
});
```

**Decision needed:** Share your OpenAI key (`sk-...`) OR Google AI key (`AIza...`).

---

## 🚀 V2 Feature Upgrades

### 1. Face Preservation (IP-Adapter / InstantID)
**Problem:** Current face-swap generates a new character that *resembles* the uploaded person but isn't exact.  
**Solution:** Use [InstantID API](https://instantid.github.io/) or local ComfyUI + IP-Adapter for pixel-accurate face preservation.

- Upload your face photo → AI locks your exact face features
- Applies your face to any gaming character/scene
- No more "looks similar, but not me" results

**Implementation:**
```
1. Add InstantID API call in tools.ts
2. Send: reference_face_image + prompt + style_image
3. Returns: thumbnail with exact face transplanted
```

---

### 2. Text-in-Image (Proper Typography)
**Problem:** Stability AI and even DALL-E 3 struggle with rendering readable text inside images.  
**Solution:** Two-layer approach:

```
Layer 1: Generate background + character (no text)
Layer 2: Use sharp/canvas to overlay text with:
  - Custom gaming fonts (Bebas Neue, Rajdhani)
  - Outlined glow effects
  - Drop shadows
  - Neon/fire/glitch styles
```

**Files to add:**
- `src/lib/textoverlay.ts` — canvas text rendering
- `src/app/api/overlay/route.ts` — text overlay API endpoint

---

### 3. 1920×1080 HD Export
**Problem:** Current output is ~1024×576 (SD3) or ~1792×1024 (DALL-E 3).  
**Solution:** Add AI upscaling pass after generation.

```
Generate at native resolution
→ Upscale 2x via Stability AI upscale API (separate endpoint, cheaper)
→ OR use Real-ESRGAN locally
→ Output: true 1920×1080 PNG
```

**API:** `POST https://api.stability.ai/v2beta/stable-image/upscale/conservative`  
Cost: very cheap (~$0.003 per upscale), separate from generation.

---

### 4. Image Editing Mode (img2img)
**Current:** Text-only generation (no image → image editing).  
**V2:** True image editing pipeline:

```
Upload existing thumbnail
→ Describe changes: "add fire around the text" / "change background to space"
→ DALL-E 3 edits image in-place (inpainting)
→ OR Gemini native image editing
```

**DALL-E edit endpoint:**
```typescript
const response = await openai.images.edit({
  image: fs.createReadStream("thumbnail.png"),
  prompt: "Add blazing fire effects around the character",
  model: "dall-e-2",  // dall-e-3 edit not yet available
  size: "1024x1024",
});
```

---

### 5. Session Persistence (Database)
**Problem:** Sessions are in-memory — lost every time the server restarts.  
**Solution:** Add lightweight SQLite or Vercel KV storage.

```
npm install @vercel/kv
```

Store: session history, generated image metadata, user preferences.

---

### 6. Thumbnail History Gallery
**V2 UI:** Add a gallery panel showing all generated thumbnails per session with:
- Grid view of all generations
- Click to restore + regenerate
- Export all as ZIP
- Compare side-by-side

---

### 7. Style Presets
Pre-built one-click styles the user can apply:
- 🔥 Fire/Explosion
- ⚡ Neon Cyberpunk  
- 🎯 CS2 Tactical
- 🏆 Victory/Champion
- 🌌 Space/Galaxy
- 💀 Dark Horror

Each preset = pre-written SD prompt template + color palette + text style.

---

## 📁 V2 File Changes Summary

| File | Change |
|------|--------|
| `src/lib/stabilityai.ts` | Replace with `imagegen.ts` (DALL-E 3 or Gemini Imagen 3) |
| `src/lib/textoverlay.ts` | **NEW** — Canvas text overlay renderer |
| `src/lib/upscale.ts` | **NEW** — 2x AI upscaling to 1920×1080 |
| `src/lib/session.ts` | **NEW** — Persistent session storage (SQLite/KV) |
| `src/app/api/overlay/route.ts` | **NEW** — Text overlay API |
| `src/components/GalleryPanel.tsx` | **NEW** — Thumbnail history gallery |
| `src/components/StylePresets.tsx` | **NEW** — One-click style presets |
| `.env.example` | Add `OPENAI_API_KEY` or `GEMINI_API_KEY` |

---

## ⚡ Quick Start for V2

Once you share your API key, implementation order:

1. **Day 1:** Swap Stability AI → DALL-E 3/Gemini (30 min) — images work immediately
2. **Day 2:** Add text overlay rendering — readable typography in thumbnails
3. **Day 3:** 1920×1080 upscaling — true HD export
4. **Day 4:** Style presets UI — one-click gaming styles
5. **Week 2:** Face preservation via InstantID
6. **Week 2:** Session persistence + gallery view

---

## 🔑 What's Needed to Start V2

Share ONE of these:
- `OPENAI_API_KEY=sk-...` (for DALL-E 3)
- `GEMINI_API_KEY=AIza...` (for Gemini Imagen 3)

That's it — everything else is already built and ready.
