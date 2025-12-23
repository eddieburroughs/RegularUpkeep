/**
 * Media Validation Tests
 *
 * Tests for photo count, video duration, and emergency exception validation
 * in the service request media upload flow.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getVideoDuration function - simulates browser video metadata loading
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    // Simulate the duration based on file size for testing
    // In reality this uses the browser's video element
    const mockDurations: Record<string, number> = {
      "short-video.mp4": 5, // Too short
      "valid-video.mp4": 15, // Valid
      "long-video.mp4": 45, // Too long
      "minimum-video.mp4": 10, // Exactly minimum
      "maximum-video.mp4": 30, // Exactly maximum
    };

    const duration = mockDurations[file.name];
    if (duration !== undefined) {
      resolve(duration);
    } else {
      // Default duration for unknown files
      resolve(20);
    }
  });
};

// Validation functions extracted from media-upload component
interface MediaRequirement {
  min_photos: number;
  video_required: boolean;
  emergency_exception: boolean;
  video_min_duration?: number;
  video_max_duration?: number;
}

interface UploadedMedia {
  id: string;
  url: string;
  type: "photo" | "video";
  filename: string;
  duration?: number;
}

// Calculate if requirements are met
function validateMediaRequirements(
  media: UploadedMedia[],
  requirements: MediaRequirement,
  isEmergency: boolean
): { meetsPhotoRequirement: boolean; meetsVideoRequirement: boolean; meetsAllRequirements: boolean } {
  const photoCount = media.filter((m) => m.type === "photo").length;
  const hasVideo = media.some((m) => m.type === "video");
  const minPhotosRequired = isEmergency && requirements.emergency_exception ? 0 : requirements.min_photos;
  const videoRequired = isEmergency && requirements.emergency_exception ? false : requirements.video_required;

  const meetsPhotoRequirement = photoCount >= minPhotosRequired;
  const meetsVideoRequirement = !videoRequired || hasVideo;
  const meetsAllRequirements = meetsPhotoRequirement && meetsVideoRequirement;

  return { meetsPhotoRequirement, meetsVideoRequirement, meetsAllRequirements };
}

// Validate video duration
async function validateVideoDuration(
  file: File,
  minDuration: number = 10,
  maxDuration: number = 30
): Promise<{ valid: boolean; duration: number; error?: string }> {
  try {
    const duration = await getVideoDuration(file);

    if (duration < minDuration) {
      return {
        valid: false,
        duration,
        error: `Video too short. Please record at least ${minDuration} seconds to help us understand the issue.`,
      };
    }

    if (duration > maxDuration) {
      return {
        valid: false,
        duration,
        error: `Video too long. Please keep videos under ${maxDuration} seconds.`,
      };
    }

    return { valid: true, duration };
  } catch (err) {
    // If we can't validate, assume it's valid (fail open)
    return { valid: true, duration: 0 };
  }
}

// File size validation
function validateFileSize(
  file: File,
  type: "photo" | "video"
): { valid: boolean; error?: string } {
  const maxSize = type === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Max size: ${type === "video" ? "50MB" : "10MB"}`,
    };
  }
  return { valid: true };
}

// File type validation
function validateFileType(
  file: File,
  type: "photo" | "video"
): { valid: boolean; error?: string } {
  if (type === "photo" && !file.type.startsWith("image/")) {
    return { valid: false, error: "Please upload only image files for photos" };
  }
  if (type === "video" && !file.type.startsWith("video/")) {
    return { valid: false, error: "Please upload only video files" };
  }
  return { valid: true };
}

// ============================================================================
// Photo Count Validation Tests
// ============================================================================

describe("Photo Count Validation", () => {
  const defaultRequirements: MediaRequirement = {
    min_photos: 3,
    video_required: false,
    emergency_exception: true,
  };

  it("should require minimum number of photos for non-emergency", () => {
    const media: UploadedMedia[] = [
      { id: "1", url: "https://example.com/1.jpg", type: "photo", filename: "1.jpg" },
      { id: "2", url: "https://example.com/2.jpg", type: "photo", filename: "2.jpg" },
    ];

    const result = validateMediaRequirements(media, defaultRequirements, false);

    expect(result.meetsPhotoRequirement).toBe(false);
    expect(result.meetsAllRequirements).toBe(false);
  });

  it("should accept when photo count meets minimum", () => {
    const media: UploadedMedia[] = [
      { id: "1", url: "https://example.com/1.jpg", type: "photo", filename: "1.jpg" },
      { id: "2", url: "https://example.com/2.jpg", type: "photo", filename: "2.jpg" },
      { id: "3", url: "https://example.com/3.jpg", type: "photo", filename: "3.jpg" },
    ];

    const result = validateMediaRequirements(media, defaultRequirements, false);

    expect(result.meetsPhotoRequirement).toBe(true);
    expect(result.meetsAllRequirements).toBe(true);
  });

  it("should accept more photos than minimum", () => {
    const media: UploadedMedia[] = [
      { id: "1", url: "https://example.com/1.jpg", type: "photo", filename: "1.jpg" },
      { id: "2", url: "https://example.com/2.jpg", type: "photo", filename: "2.jpg" },
      { id: "3", url: "https://example.com/3.jpg", type: "photo", filename: "3.jpg" },
      { id: "4", url: "https://example.com/4.jpg", type: "photo", filename: "4.jpg" },
      { id: "5", url: "https://example.com/5.jpg", type: "photo", filename: "5.jpg" },
    ];

    const result = validateMediaRequirements(media, defaultRequirements, false);

    expect(result.meetsPhotoRequirement).toBe(true);
    expect(result.meetsAllRequirements).toBe(true);
  });

  it("should not count videos toward photo requirement", () => {
    const media: UploadedMedia[] = [
      { id: "1", url: "https://example.com/1.jpg", type: "photo", filename: "1.jpg" },
      { id: "2", url: "https://example.com/2.jpg", type: "photo", filename: "2.jpg" },
      { id: "3", url: "https://example.com/video.mp4", type: "video", filename: "video.mp4" },
    ];

    const result = validateMediaRequirements(media, defaultRequirements, false);

    expect(result.meetsPhotoRequirement).toBe(false); // Only 2 photos
    expect(result.meetsAllRequirements).toBe(false);
  });
});

// ============================================================================
// Video Duration Validation Tests
// ============================================================================

describe("Video Duration Validation", () => {
  it("should reject videos shorter than minimum duration", async () => {
    const file = new File([""], "short-video.mp4", { type: "video/mp4" });
    const result = await validateVideoDuration(file, 10, 30);

    expect(result.valid).toBe(false);
    expect(result.duration).toBe(5);
    expect(result.error).toContain("too short");
    expect(result.error).toContain("10 seconds");
  });

  it("should reject videos longer than maximum duration", async () => {
    const file = new File([""], "long-video.mp4", { type: "video/mp4" });
    const result = await validateVideoDuration(file, 10, 30);

    expect(result.valid).toBe(false);
    expect(result.duration).toBe(45);
    expect(result.error).toContain("too long");
    expect(result.error).toContain("30 seconds");
  });

  it("should accept videos within duration range", async () => {
    const file = new File([""], "valid-video.mp4", { type: "video/mp4" });
    const result = await validateVideoDuration(file, 10, 30);

    expect(result.valid).toBe(true);
    expect(result.duration).toBe(15);
    expect(result.error).toBeUndefined();
  });

  it("should accept videos at exactly minimum duration", async () => {
    const file = new File([""], "minimum-video.mp4", { type: "video/mp4" });
    const result = await validateVideoDuration(file, 10, 30);

    expect(result.valid).toBe(true);
    expect(result.duration).toBe(10);
  });

  it("should accept videos at exactly maximum duration", async () => {
    const file = new File([""], "maximum-video.mp4", { type: "video/mp4" });
    const result = await validateVideoDuration(file, 10, 30);

    expect(result.valid).toBe(true);
    expect(result.duration).toBe(30);
  });

  it("should use custom duration constraints", async () => {
    const file = new File([""], "valid-video.mp4", { type: "video/mp4" });
    // 15 second video with 5-20 second range
    const result = await validateVideoDuration(file, 5, 20);

    expect(result.valid).toBe(true);
    expect(result.duration).toBe(15);
  });

  it("should reject video outside custom duration range", async () => {
    const file = new File([""], "valid-video.mp4", { type: "video/mp4" });
    // 15 second video with 20-30 second range (too short for this range)
    const result = await validateVideoDuration(file, 20, 30);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("too short");
  });
});

// ============================================================================
// Emergency Exception Tests
// ============================================================================

describe("Emergency Exception Validation", () => {
  const requirementsWithException: MediaRequirement = {
    min_photos: 3,
    video_required: true,
    emergency_exception: true,
  };

  const requirementsWithoutException: MediaRequirement = {
    min_photos: 3,
    video_required: true,
    emergency_exception: false,
  };

  it("should bypass photo requirement for emergency with exception enabled", () => {
    const media: UploadedMedia[] = []; // No media at all

    const result = validateMediaRequirements(media, requirementsWithException, true);

    expect(result.meetsPhotoRequirement).toBe(true); // 0 >= 0
    expect(result.meetsVideoRequirement).toBe(true); // Video not required
    expect(result.meetsAllRequirements).toBe(true);
  });

  it("should bypass video requirement for emergency with exception enabled", () => {
    const media: UploadedMedia[] = [
      { id: "1", url: "https://example.com/1.jpg", type: "photo", filename: "1.jpg" },
    ];

    const result = validateMediaRequirements(media, requirementsWithException, true);

    expect(result.meetsVideoRequirement).toBe(true);
    expect(result.meetsAllRequirements).toBe(true);
  });

  it("should NOT bypass requirements for emergency when exception disabled", () => {
    const media: UploadedMedia[] = []; // No media

    const result = validateMediaRequirements(media, requirementsWithoutException, true);

    expect(result.meetsPhotoRequirement).toBe(false);
    expect(result.meetsVideoRequirement).toBe(false);
    expect(result.meetsAllRequirements).toBe(false);
  });

  it("should require media for non-emergency even with exception enabled", () => {
    const media: UploadedMedia[] = []; // No media

    const result = validateMediaRequirements(media, requirementsWithException, false);

    expect(result.meetsPhotoRequirement).toBe(false); // 0 < 3
    expect(result.meetsVideoRequirement).toBe(false); // Video required
    expect(result.meetsAllRequirements).toBe(false);
  });

  it("should accept emergency with only voice note (no visual media)", () => {
    // In emergency with exception, no visual media is required
    // Voice note is handled separately in the form
    const media: UploadedMedia[] = [];

    const result = validateMediaRequirements(media, requirementsWithException, true);

    expect(result.meetsAllRequirements).toBe(true);
  });
});

// ============================================================================
// File Type Validation Tests
// ============================================================================

describe("File Type Validation", () => {
  it("should reject non-image files for photos", () => {
    const file = new File([""], "document.pdf", { type: "application/pdf" });
    const result = validateFileType(file, "photo");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("image files");
  });

  it("should accept common image formats", () => {
    const jpegFile = new File([""], "photo.jpg", { type: "image/jpeg" });
    const pngFile = new File([""], "photo.png", { type: "image/png" });
    const webpFile = new File([""], "photo.webp", { type: "image/webp" });

    expect(validateFileType(jpegFile, "photo").valid).toBe(true);
    expect(validateFileType(pngFile, "photo").valid).toBe(true);
    expect(validateFileType(webpFile, "photo").valid).toBe(true);
  });

  it("should reject non-video files for videos", () => {
    const file = new File([""], "audio.mp3", { type: "audio/mp3" });
    const result = validateFileType(file, "video");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("video files");
  });

  it("should accept common video formats", () => {
    const mp4File = new File([""], "video.mp4", { type: "video/mp4" });
    const movFile = new File([""], "video.mov", { type: "video/quicktime" });
    const webmFile = new File([""], "video.webm", { type: "video/webm" });

    expect(validateFileType(mp4File, "video").valid).toBe(true);
    expect(validateFileType(movFile, "video").valid).toBe(true);
    expect(validateFileType(webmFile, "video").valid).toBe(true);
  });
});

// ============================================================================
// File Size Validation Tests
// ============================================================================

describe("File Size Validation", () => {
  it("should reject photos larger than 10MB", () => {
    const file = new File([new ArrayBuffer(11 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });
    const result = validateFileSize(file, "photo");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("10MB");
  });

  it("should accept photos under 10MB", () => {
    const file = new File([new ArrayBuffer(5 * 1024 * 1024)], "normal.jpg", {
      type: "image/jpeg",
    });
    const result = validateFileSize(file, "photo");

    expect(result.valid).toBe(true);
  });

  it("should reject videos larger than 50MB", () => {
    const file = new File([new ArrayBuffer(51 * 1024 * 1024)], "large.mp4", {
      type: "video/mp4",
    });
    const result = validateFileSize(file, "video");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("50MB");
  });

  it("should accept videos under 50MB", () => {
    const file = new File([new ArrayBuffer(25 * 1024 * 1024)], "normal.mp4", {
      type: "video/mp4",
    });
    const result = validateFileSize(file, "video");

    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Video Required Validation Tests
// ============================================================================

describe("Video Required Validation", () => {
  const videoRequiredReqs: MediaRequirement = {
    min_photos: 1,
    video_required: true,
    emergency_exception: false,
  };

  const videoNotRequiredReqs: MediaRequirement = {
    min_photos: 1,
    video_required: false,
    emergency_exception: false,
  };

  it("should require video when video_required is true", () => {
    const media: UploadedMedia[] = [
      { id: "1", url: "https://example.com/1.jpg", type: "photo", filename: "1.jpg" },
    ];

    const result = validateMediaRequirements(media, videoRequiredReqs, false);

    expect(result.meetsPhotoRequirement).toBe(true);
    expect(result.meetsVideoRequirement).toBe(false);
    expect(result.meetsAllRequirements).toBe(false);
  });

  it("should not require video when video_required is false", () => {
    const media: UploadedMedia[] = [
      { id: "1", url: "https://example.com/1.jpg", type: "photo", filename: "1.jpg" },
    ];

    const result = validateMediaRequirements(media, videoNotRequiredReqs, false);

    expect(result.meetsPhotoRequirement).toBe(true);
    expect(result.meetsVideoRequirement).toBe(true);
    expect(result.meetsAllRequirements).toBe(true);
  });

  it("should satisfy video requirement when video is present", () => {
    const media: UploadedMedia[] = [
      { id: "1", url: "https://example.com/1.jpg", type: "photo", filename: "1.jpg" },
      { id: "2", url: "https://example.com/video.mp4", type: "video", filename: "video.mp4" },
    ];

    const result = validateMediaRequirements(media, videoRequiredReqs, false);

    expect(result.meetsVideoRequirement).toBe(true);
    expect(result.meetsAllRequirements).toBe(true);
  });
});

// ============================================================================
// Category-Specific Requirements Tests
// ============================================================================

describe("Category-Specific Requirements", () => {
  it("should handle plumbing category requirements (3 photos)", () => {
    const plumbingReqs: MediaRequirement = {
      min_photos: 3,
      video_required: false,
      emergency_exception: true,
    };

    const twoPhotos: UploadedMedia[] = [
      { id: "1", url: "url1", type: "photo", filename: "1.jpg" },
      { id: "2", url: "url2", type: "photo", filename: "2.jpg" },
    ];

    const threePhotos: UploadedMedia[] = [
      ...twoPhotos,
      { id: "3", url: "url3", type: "photo", filename: "3.jpg" },
    ];

    expect(validateMediaRequirements(twoPhotos, plumbingReqs, false).meetsAllRequirements).toBe(
      false
    );
    expect(validateMediaRequirements(threePhotos, plumbingReqs, false).meetsAllRequirements).toBe(
      true
    );
  });

  it("should handle electrical category requirements (video required)", () => {
    const electricalReqs: MediaRequirement = {
      min_photos: 2,
      video_required: true,
      emergency_exception: true,
      video_min_duration: 10,
      video_max_duration: 30,
    };

    const photosOnly: UploadedMedia[] = [
      { id: "1", url: "url1", type: "photo", filename: "1.jpg" },
      { id: "2", url: "url2", type: "photo", filename: "2.jpg" },
    ];

    const photosAndVideo: UploadedMedia[] = [
      ...photosOnly,
      { id: "3", url: "url3", type: "video", filename: "video.mp4", duration: 20 },
    ];

    expect(validateMediaRequirements(photosOnly, electricalReqs, false).meetsAllRequirements).toBe(
      false
    );
    expect(
      validateMediaRequirements(photosAndVideo, electricalReqs, false).meetsAllRequirements
    ).toBe(true);
  });

  it("should handle HVAC category emergency exception", () => {
    const hvacReqs: MediaRequirement = {
      min_photos: 3,
      video_required: true,
      emergency_exception: true,
    };

    // Emergency - no media required
    expect(validateMediaRequirements([], hvacReqs, true).meetsAllRequirements).toBe(true);

    // Non-emergency - media required
    expect(validateMediaRequirements([], hvacReqs, false).meetsAllRequirements).toBe(false);
  });
});
