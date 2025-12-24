/**
 * Support Chat Upload API
 *
 * Handles file uploads (screenshots) for support conversations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/support-chat/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;
    const publicToken = formData.get("publicToken") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Verify conversation exists and user has access
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (supabase as any)
      .from("conversations")
      .select("id, user_id, public_token_hash")
      .eq("id", conversationId);

    const { data: conversation, error: convError } = await query.single() as {
      data: { id: string; user_id: string | null; public_token_hash: string | null } | null;
      error: unknown;
    };

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (user) {
      // Authenticated user must own the conversation
      if (conversation.user_id && conversation.user_id !== user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (publicToken) {
      // Public token must match
      const tokenHash = hashToken(publicToken);
      if (conversation.public_token_hash !== tokenHash) {
        return NextResponse.json({ error: "Invalid token" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "png";
    const filename = `support/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Upload] Storage error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(filename);

    // Store attachment reference in message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: msgError } = await (supabase as any).from("support_messages").insert({
      conversation_id: conversationId,
      sender: "user",
      content: "[Attached screenshot]",
      metadata: {
        type: "attachment",
        file_type: file.type,
        file_size: file.size,
        file_url: urlData.publicUrl,
        filename: file.name,
      },
    });

    if (msgError) {
      console.error("[Upload] Message error:", msgError);
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      filename,
    });
  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
