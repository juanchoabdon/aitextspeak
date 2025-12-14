'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadBlogImage } from '@/lib/storage/upload';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadBlogImage(formData);

      if (result.success && result.url) {
        onChange(result.url);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
            <Image
              src={value}
              alt="Featured image"
              fill
              className="object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 cursor-pointer hover:border-red-500/50 hover:bg-slate-800 transition-colors">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-slate-400">Click to upload image</span>
              <span className="text-xs text-slate-500">JPG, PNG, GIF, WebP (max 5MB)</span>
            </div>
          )}
        </label>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}









