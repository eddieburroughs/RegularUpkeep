"use client";

/**
 * Media Upload Component
 *
 * Handles photo and video upload for service requests with
 * category-specific requirements.
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  Video,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MediaRequirement {
  min_photos: number;
  video_required: boolean;
  emergency_exception: boolean;
}

interface UploadedMedia {
  id: string;
  url: string;
  type: "photo" | "video";
  filename: string;
}

interface MediaUploadProps {
  category: string;
  requirements: MediaRequirement;
  isEmergency: boolean;
  serviceRequestId: string;
  onMediaChange: (media: UploadedMedia[]) => void;
  initialMedia?: UploadedMedia[];
}

export function MediaUpload({
  category,
  requirements,
  isEmergency,
  serviceRequestId,
  onMediaChange,
  initialMedia = [],
}: MediaUploadProps) {
  const [media, setMedia] = useState<UploadedMedia[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Calculate if requirements are met
  const photoCount = media.filter((m) => m.type === "photo").length;
  const hasVideo = media.some((m) => m.type === "video");
  const minPhotosRequired = isEmergency && requirements.emergency_exception ? 0 : requirements.min_photos;
  const videoRequired = isEmergency && requirements.emergency_exception ? false : requirements.video_required;

  const meetsPhotoRequirement = photoCount >= minPhotosRequired;
  const meetsVideoRequirement = !videoRequired || hasVideo;
  const meetsAllRequirements = meetsPhotoRequirement && meetsVideoRequirement;

  const handleFileUpload = useCallback(
    async (files: FileList, type: "photo" | "video") => {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const totalFiles = files.length;
      let uploaded = 0;

      try {
        const newMedia: UploadedMedia[] = [];

        for (const file of Array.from(files)) {
          // Validate file type
          if (type === "photo" && !file.type.startsWith("image/")) {
            throw new Error("Please upload only image files for photos");
          }
          if (type === "video" && !file.type.startsWith("video/")) {
            throw new Error("Please upload only video files");
          }

          // Validate file size (max 50MB for videos, 10MB for photos)
          const maxSize = type === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
          if (file.size > maxSize) {
            throw new Error(
              `File too large. Max size: ${type === "video" ? "50MB" : "10MB"}`
            );
          }

          // Generate unique filename
          const ext = file.name.split(".").pop();
          const filename = `${serviceRequestId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

          // Upload to Supabase storage
          const { data, error: uploadError } = await supabase.storage
            .from("service-request-media")
            .upload(filename, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("service-request-media")
            .getPublicUrl(data.path);

          newMedia.push({
            id: data.path,
            url: urlData.publicUrl,
            type,
            filename: file.name,
          });

          uploaded++;
          setUploadProgress((uploaded / totalFiles) * 100);
        }

        const updatedMedia = [...media, ...newMedia];
        setMedia(updatedMedia);
        onMediaChange(updatedMedia);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [media, onMediaChange, serviceRequestId, supabase.storage]
  );

  const handleRemoveMedia = useCallback(
    async (id: string) => {
      try {
        // Remove from storage
        await supabase.storage.from("service-request-media").remove([id]);

        // Update state
        const updatedMedia = media.filter((m) => m.id !== id);
        setMedia(updatedMedia);
        onMediaChange(updatedMedia);
      } catch (err) {
        setError("Failed to remove media");
      }
    },
    [media, onMediaChange, supabase.storage]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photos & Video
        </CardTitle>
        <CardDescription>
          {isEmergency && requirements.emergency_exception
            ? "Media is optional for emergencies, but helpful"
            : `Upload at least ${minPhotosRequired} photo${minPhotosRequired > 1 ? "s" : ""}${videoRequired ? " and a video" : ""} of the issue`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Requirements Status */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {meetsPhotoRequirement ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            <span className="text-sm">
              {photoCount}/{minPhotosRequired} photos
            </span>
          </div>
          {videoRequired && (
            <div className="flex items-center gap-2">
              {meetsVideoRequirement ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-sm">Video {hasVideo ? "uploaded" : "required"}</span>
            </div>
          )}
        </div>

        {/* Upload Buttons */}
        <div className="flex gap-3">
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files, "photo")}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={(e) => {
                const input = (e.target as HTMLElement).closest("label")?.querySelector("input");
                input?.click();
              }}
            >
              <Camera className="mr-2 h-4 w-4" />
              Add Photos
            </Button>
          </label>
          <label className="flex-1">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files, "video")}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={(e) => {
                const input = (e.target as HTMLElement).closest("label")?.querySelector("input");
                input?.click();
              }}
            >
              <Video className="mr-2 h-4 w-4" />
              Add Video
            </Button>
          </label>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Uploading...</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Media Preview */}
        {media.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {media.map((item) => (
              <div key={item.id} className="relative group">
                {item.type === "photo" ? (
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={item.url}
                      alt="Uploaded"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(item.id)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-1 left-1">
                  {item.type === "photo" ? (
                    <ImageIcon className="h-4 w-4 text-white drop-shadow" />
                  ) : (
                    <Video className="h-4 w-4 text-white drop-shadow" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {media.length === 0 && !uploading && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No media uploaded yet</p>
            <p className="text-xs">Photos help us understand the issue better</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
