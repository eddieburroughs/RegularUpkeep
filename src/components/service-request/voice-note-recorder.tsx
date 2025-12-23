"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, Play, Pause, Trash2, Upload, Loader2, CheckCircle } from "lucide-react";

interface VoiceNoteRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onUploadComplete?: (url: string, duration: number) => void;
  maxDuration?: number; // in seconds, default 60
  uploadEndpoint?: string;
}

type RecordingState = "idle" | "recording" | "recorded" | "playing" | "uploading" | "uploaded";

export function VoiceNoteRecorder({
  onRecordingComplete,
  onUploadComplete,
  maxDuration = 60,
  uploadEndpoint,
}: VoiceNoteRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        audioBlobRef.current = audioBlob;
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setState("recorded");
        onRecordingComplete(audioBlob, duration);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setState("recording");
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Could not access microphone. Please check your browser permissions.");
    }
  }, [maxDuration, onRecordingComplete, duration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const playRecording = useCallback(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setState("playing");
    }
  }, [audioUrl]);

  const pausePlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState("recorded");
    }
  }, []);

  const deleteRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    audioBlobRef.current = null;
    setDuration(0);
    setState("idle");
  }, [audioUrl]);

  const uploadRecording = useCallback(async () => {
    if (!audioBlobRef.current || !uploadEndpoint) return;

    setState("uploading");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlobRef.current, `voice-note-${Date.now()}.webm`);
      formData.append("duration", duration.toString());

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setState("uploaded");
      onUploadComplete?.(data.url, duration);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload voice note. Please try again.");
      setState("recorded");
    }
  }, [uploadEndpoint, duration, onUploadComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = (duration / maxDuration) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          Voice Note
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Record a voice message describing your emergency (up to {maxDuration} seconds)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio element for playback */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setState("recorded")}
            className="hidden"
          />
        )}

        {/* Error display */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Recording indicator */}
        {state === "recording" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-lg font-mono">{formatTime(duration)}</span>
              <span className="text-sm text-muted-foreground">/ {formatTime(maxDuration)}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Recorded state with duration */}
        {(state === "recorded" || state === "playing" || state === "uploading" || state === "uploaded") && (
          <div className="flex items-center justify-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-mono">{formatTime(duration)}</span>
            <span className="text-sm text-muted-foreground">recorded</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {state === "idle" && (
            <Button onClick={startRecording} size="lg" className="gap-2">
              <Mic className="h-5 w-5" />
              Start Recording
            </Button>
          )}

          {state === "recording" && (
            <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
              <Square className="h-5 w-5" />
              Stop
            </Button>
          )}

          {state === "recorded" && (
            <>
              <Button onClick={playRecording} variant="outline" size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                Play
              </Button>
              <Button onClick={deleteRecording} variant="ghost" size="lg" className="gap-2">
                <Trash2 className="h-5 w-5" />
                Delete
              </Button>
              {uploadEndpoint && (
                <Button onClick={uploadRecording} size="lg" className="gap-2">
                  <Upload className="h-5 w-5" />
                  Upload
                </Button>
              )}
            </>
          )}

          {state === "playing" && (
            <>
              <Button onClick={pausePlayback} variant="outline" size="lg" className="gap-2">
                <Pause className="h-5 w-5" />
                Pause
              </Button>
              <Button onClick={deleteRecording} variant="ghost" size="lg" className="gap-2">
                <Trash2 className="h-5 w-5" />
                Delete
              </Button>
            </>
          )}

          {state === "uploading" && (
            <Button disabled size="lg" className="gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </Button>
          )}

          {state === "uploaded" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Voice note uploaded successfully</span>
            </div>
          )}
        </div>

        {/* Hint */}
        {state === "idle" && (
          <p className="text-xs text-center text-muted-foreground">
            Tip: Describe what you see, any sounds, smells, and how urgent the situation feels
          </p>
        )}
      </CardContent>
    </Card>
  );
}
