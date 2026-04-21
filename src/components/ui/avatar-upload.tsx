"use client";

import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Bucket = "team-logos" | "player-images" | "avatars";

type Props = {
  /** Existing URL from the database (shown as default preview). */
  currentUrl: string | null;
  /** Which storage bucket to upload to. */
  bucket: Bucket;
  /** Called after every successful upload (new URL) or clear (null). */
  onUpload: (url: string | null) => void;
  /** Avatar diameter in px. Default: 88. */
  size?: number;
  /** Circle (default) or rounded square. */
  shape?: "circle" | "square";
  /** Alt text for the preview image. */
  alt?: string;
};

export function AvatarUpload({
  currentUrl,
  bucket,
  onUpload,
  size = 88,
  shape = "circle",
  alt = "Uploaded image",
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select a JPG, PNG, WebP, or GIF file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    // Show an immediate local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);

      setPreviewUrl(publicUrl);
      onUpload(publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      // Revert preview to whatever was there before
      setPreviewUrl(currentUrl);
    } finally {
      setUploading(false);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setPreviewUrl(null);
    onUpload(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Clickable avatar area */}
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          title="Click to upload image"
          className={`relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${shapeClass}`}
        >
          {previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl}
              alt={alt}
              className={`h-full w-full object-cover ${shapeClass}`}
            />
          ) : (
            <Camera className="h-6 w-6 text-muted-foreground" />
          )}

          {/* Uploading spinner overlay */}
          {uploading && (
            <div
              className={`absolute inset-0 flex items-center justify-center bg-black/40 ${shapeClass}`}
            >
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </button>

        {/* Clear / remove button */}
        {previewUrl && !uploading && (
          <button
            type="button"
            onClick={handleClear}
            title="Remove image"
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {error ? (
        <p className="max-w-[200px] text-[11px] text-destructive">{error}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {uploading ? "Uploading…" : "Click to upload · JPG, PNG, WebP · Max 2 MB"}
        </p>
      )}
    </div>
  );
}
