"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

interface Props {
  onChange: (urls: string[]) => void;
  initialUrls?: string[]; // pre-fill for the edit page
  maxFiles?: number;      // defaults to 8; pass 1 for a single-image use like an avatar
}

export default function ImageDropzone({ onChange, initialUrls = [], maxFiles = 8 }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep in sync if the parent swaps which product is being edited. Keyed
  // on the joined string (not the array reference) since a new array with
  // the same urls is passed on every parent render.
  const initialUrlsKey = initialUrls.join(",");
  useEffect(() => setUrls(initialUrls), [initialUrlsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) throw new Error((await res.json()).error ?? "upload_failed");
        const { url } = await res.json();
        uploaded.push(url);
      }
      const next = maxFiles === 1 ? uploaded.slice(0, 1) : [...urls, ...uploaded].slice(0, maxFiles);
      setUrls(next);
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload_failed");
    } finally {
      setUploading(false);
    }
  }

  function remove(url: string) {
    const next = urls.filter((u) => u !== url);
    setUrls(next);
    onChange(next);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-gray-light bg-gray-bg py-6 text-sm font-medium text-mute"
      >
        {uploading
          ? isAr ? "جاري الرفع..." : "Uploading..."
          : maxFiles === 1
          ? isAr ? "📷 دوس لرفع صورة" : "📷 Tap to upload a photo"
          : isAr ? `📷 دوس لرفع الصور (حتى ${maxFiles})` : `📷 Tap to upload photos (up to ${maxFiles})`}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={maxFiles !== 1}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {urls.map((u) => (
            <div key={u} className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-light">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(u)}
                className="absolute end-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-lg bg-black/60 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
