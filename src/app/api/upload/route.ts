// ================================================================
// app/api/upload/route.ts — Image upload handler
// ================================================================
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import os from "os";

const UPLOAD_DIR = path.join(os.tmpdir(), "thumbnail-ai-uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("image") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, or WebP." }, { status: 400 });
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
        }

        const imageId = uuidv4();
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${imageId}.${ext}`;
        const filePath = path.join(UPLOAD_DIR, fileName);

        // Write to disk
        const bytes = await file.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(bytes));

        // Return base64 for immediate use
        const base64 = Buffer.from(bytes).toString("base64");
        const imageUrl = `data:${file.type};base64,${base64}`;

        return NextResponse.json({
            imageId,
            imageUrl,
            fileName: file.name,
            size: file.size,
            filePath,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
