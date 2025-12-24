"use client";

/**
 * Screenshot Upload Component
 *
 * Allows users to capture and upload screenshots for support tickets.
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

type ScreenshotUploadProps = {
  onUpload: (file: File, preview: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  maxSizeMB?: number;
};

export function ScreenshotUpload({
  onUpload,
  onRemove,
  disabled = false,
  maxSizeMB = 5,
}: ScreenshotUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File too large. Maximum size is ${maxSizeMB}MB`);
        return;
      }

      setUploading(true);

      try {
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          const previewUrl = reader.result as string;
          setPreview(previewUrl);
          onUpload(file, previewUrl);
          setUploading(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Failed to process image:", err);
        setError("Failed to process image");
        setUploading(false);
      }
    },
    [onUpload, maxSizeMB]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onRemove?.();
  }, [onRemove]);

  const handleCaptureScreen = useCallback(async () => {
    // Check if screen capture is supported
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen capture not supported in this browser");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // Create video element to capture frame
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      // Create canvas to capture frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);

      // Stop the stream
      stream.getTracks().forEach((track) => track.stop());

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `screenshot-${Date.now()}.png`, {
              type: "image/png",
            });

            const previewUrl = canvas.toDataURL("image/png");
            setPreview(previewUrl);
            onUpload(file, previewUrl);
          }
          setUploading(false);
        },
        "image/png",
        0.9
      );
    } catch (err) {
      console.error("Screen capture failed:", err);
      setError("Screen capture cancelled or failed");
      setUploading(false);
    }
  }, [onUpload]);

  if (preview) {
    return (
      <div className="relative inline-block">
        <img
          src={preview}
          alt="Screenshot preview"
          className="max-w-[200px] max-h-[150px] rounded border object-cover"
        />
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
          onClick={handleRemove}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          Upload Image
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCaptureScreen}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-1" />
          )}
          Capture Screen
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Simple inline image preview
 */
export function ImagePreview({
  src,
  alt,
  onRemove,
}: {
  src: string;
  alt?: string;
  onRemove?: () => void;
}) {
  return (
    <div className="relative inline-block">
      <img
        src={src}
        alt={alt || "Attached image"}
        className="max-w-[200px] max-h-[150px] rounded border object-cover"
      />
      {onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
