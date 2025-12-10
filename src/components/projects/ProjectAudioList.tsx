'use client';

import type { ProjectAudio } from '@/lib/projects/db';
import { AudioPlayButtonInline } from '@/components/ui/AudioPlayButton';

interface ProjectAudioListProps {
  audioFiles: ProjectAudio[];
  projectId: string;
  isLegacy: boolean;
}

export function ProjectAudioList({ audioFiles, isLegacy }: ProjectAudioListProps) {
  return (
    <div className="space-y-3">
      {audioFiles.map((audio, index) => (
        <div
          key={audio.id}
          className="flex items-center gap-4 p-4 rounded-xl border border-slate-700 bg-slate-800/30"
        >
          {/* Number/Order */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white">
            {index + 1}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white truncate">
                {audio.title || `Audio ${index + 1}`}
              </p>
              {audio.voice_name && (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs">
                  {audio.voice_name}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 truncate mt-1">
              {audio.text_content.slice(0, 100)}{audio.text_content.length > 100 ? '...' : ''}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>{audio.characters_count.toLocaleString()} chars</span>
              {audio.language_code && <span>{audio.language_code}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Play Button with Progress */}
            <AudioPlayButtonInline src={audio.audio_url} />

            {/* Download Button */}
            <a
              href={audio.audio_url}
              download={`${audio.title || 'audio'}.mp3`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        </div>
      ))}

      {/* Note for legacy projects */}
      {isLegacy && (
        <p className="text-center text-xs text-slate-500 mt-4">
          This is a migrated project. The audio file cannot be modified.
        </p>
      )}
    </div>
  );
}
