'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { generateProject, generatePreview, getPreview } from '@/lib/tts/actions';
import type { Voice } from '@/lib/tts/types';
import { VoiceSelectorModal } from './VoiceSelectorModal';

interface GenerateSpeechFormProps {
  voices: Voice[];
  languages: { code: string; name: string }[];
}

const STORAGE_KEY = 'aitextspeak_draft_project';

interface DraftProject {
  title: string;
  text: string;
  languageCode: string;
  voiceId: string;
  sessionKey: string;
  speed: 0.5 | 1 | 1.5 | 2;
  volume: 0.5 | 1 | 1.5 | 2;
}

function generateSessionKey(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function GenerateSpeechForm({ voices, languages }: GenerateSpeechFormProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  // Session key for tracking previews
  const [sessionKey, setSessionKey] = useState<string>('');

  // Form state
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [languageCode, setLanguageCode] = useState('en-US');
  const [voiceId, setVoiceId] = useState('');
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [volume, setVolume] = useState<0.5 | 1 | 1.5 | 2>(1);

  // Voice selector modal
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  // Get selected voice details
  const selectedVoice = voices.find(v => v.voice_id === voiceId);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (hasLoadedDraft) return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft: DraftProject = JSON.parse(saved);
        setTitle(draft.title || '');
        setText(draft.text || '');
        setLanguageCode(draft.languageCode || 'en-US');
        setVoiceId(draft.voiceId || '');
        setSessionKey(draft.sessionKey || generateSessionKey());
        setSpeed(draft.speed || 1);
        setVolume(draft.volume || 1);
        
        // Try to load existing preview
        if (draft.sessionKey) {
          loadExistingPreview(draft.sessionKey);
        }
      } else {
        setSessionKey(generateSessionKey());
      }
    } catch {
      setSessionKey(generateSessionKey());
    }
    setHasLoadedDraft(true);
  }, [hasLoadedDraft]);

  // Load existing preview from server
  const loadExistingPreview = async (key: string) => {
    try {
      const result = await getPreview(key);
      if (result.success && result.audioUrl) {
        setPreviewAudioUrl(result.audioUrl);
      }
    } catch {
      // Ignore errors loading preview
    }
  };

  // Save draft to localStorage whenever form changes
  const saveDraft = useCallback(() => {
    if (!hasLoadedDraft) return;
    
    const draft: DraftProject = {
      title,
      text,
      languageCode,
      voiceId,
      sessionKey,
      speed,
      volume,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [title, text, languageCode, voiceId, sessionKey, speed, volume, hasLoadedDraft]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  const characterCount = text.length;
  const maxCharacters = 5000;
  const previewCharacters = Math.min(200, text.length);

  // Handle voice selection from modal
  function handleVoiceSelect(voice: Voice) {
    setVoiceId(voice.voice_id);
    setPreviewAudioUrl(null); // Clear preview when voice changes
  }

  // Generate preview
  async function handlePreview() {
    if (!text.trim() || !voiceId) return;
    
    setError(null);
    setIsGeneratingPreview(true);
    setPreviewAudioUrl(null);

    try {
      const result = await generatePreview({
        text,
        voice_id: voiceId,
        voice_name: selectedVoice?.name || voiceId,
        provider: selectedVoice?.provider || 'azure',
        language_code: languageCode,
        session_key: sessionKey,
        speed,
        volume,
      });

      if (result.success && result.audioUrl) {
        setPreviewAudioUrl(result.audioUrl);
        // Auto-play the preview
        const audioUrl = result.audioUrl;
        setTimeout(() => {
          if (previewAudioRef.current && audioUrl) {
            previewAudioRef.current.src = audioUrl;
            previewAudioRef.current.play();
            setIsPlayingPreview(true);
          }
        }, 100);
      } else {
        setError(result.error || 'Failed to generate preview');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsGeneratingPreview(false);
    }
  }

  // Generate full project
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!voiceId) {
      setError('Please select a voice first');
      return;
    }
    
    setError(null);
    setIsGenerating(true);
    setGeneratedAudioUrl(null);

    try {
      const result = await generateProject({
        title: title || 'Untitled Project',
        text,
        voice_id: voiceId,
        provider: selectedVoice?.provider || 'azure',
        language_code: languageCode,
        voice_name: selectedVoice?.name || voiceId,
        session_key: sessionKey,
        speed,
        volume,
      });

      if (result.success && result.audioUrl) {
        setGeneratedAudioUrl(result.audioUrl);
        // Clear draft on successful creation
        localStorage.removeItem(STORAGE_KEY);
        setSessionKey(generateSessionKey());
        setPreviewAudioUrl(null);
      } else {
        setError(result.error || 'Failed to generate speech');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }

  function togglePlayback() {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }

  function togglePreviewPlayback() {
    if (!previewAudioRef.current) return;

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play();
    }
  }

  function handleAudioEnded() {
    setIsPlaying(false);
  }

  function handlePreviewEnded() {
    setIsPlayingPreview(false);
  }

  function handleViewProjects() {
    router.push('/dashboard/projects');
  }

  function handleClearDraft() {
    localStorage.removeItem(STORAGE_KEY);
    setTitle('');
    setText('');
    setLanguageCode('en-US');
    setVoiceId('');
    setPreviewAudioUrl(null);
    setGeneratedAudioUrl(null);
    setSessionKey(generateSessionKey());
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SSML / Prosody controls */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Advanced</h3>
            <button
              type="button"
              onClick={() => setText((t) => (t ? `${t} <break time=\"1s\"/>` : `<break time=\"1s\"/>`))}
              className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
            >
              Insert pause
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Speed</label>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value) as 0.5 | 1 | 1.5 | 2)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none text-sm"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-300">Volume</label>
                <span className="text-xs text-slate-400">{volume}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.5}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value) as 0.5 | 1 | 1.5 | 2)}
                className="mt-2 w-full accent-amber-500"
                aria-label="Volume"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>0.5x</span>
                <span>1x</span>
                <span>1.5x</span>
                <span>2x</span>
              </div>
            </div>
          </div>
        </div>
        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Success State */}
        {generatedAudioUrl && (
          <div className="rounded-xl border border-green-500/50 bg-green-500/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400">Project Created!</h3>
                <p className="text-sm text-slate-400">Your audio has been saved</p>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={generatedAudioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleAudioEnded}
              className="hidden"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-400 transition-colors"
              >
                {isPlaying ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play
                  </>
                )}
              </button>

              <a
                href={generatedAudioUrl}
                download
                className="flex items-center gap-2 rounded-lg border border-green-500/50 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/10 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>

              <button
                type="button"
                onClick={handleViewProjects}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                View All Projects
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                placeholder="Enter a name for your project"
              />
            </div>

            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Text to Convert *
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                rows={10}
                maxLength={maxCharacters}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                placeholder="Enter or paste your text here..."
              />
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-500">
                  Preview uses first {previewCharacters} characters
                </span>
                <span className={characterCount > maxCharacters * 0.9 ? 'text-amber-500' : 'text-slate-500'}>
                  {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Preview Section */}
            {previewAudioUrl && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                      <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-400">Your Text Preview</p>
                      <p className="text-xs text-slate-400">First 200 characters • {selectedVoice?.name}</p>
                    </div>
                  </div>

                  <audio
                    ref={previewAudioRef}
                    src={previewAudioUrl}
                    onPlay={() => setIsPlayingPreview(true)}
                    onPause={() => setIsPlayingPreview(false)}
                    onEnded={handlePreviewEnded}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={togglePreviewPlayback}
                    className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 transition-colors"
                  >
                    {isPlayingPreview ? (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                        </svg>
                        Pause
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Play Preview
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Language Selection */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Language
              </label>
              <select
                value={languageCode}
                onChange={(e) => {
                  setLanguageCode(e.target.value);
                  setVoiceId(''); // Reset voice when language changes
                  setPreviewAudioUrl(null);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Selection */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Voice
              </label>
              
              <button
                type="button"
                onClick={() => setIsVoiceSelectorOpen(true)}
                className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                  selectedVoice
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-dashed border-slate-600 bg-slate-800/30 hover:border-amber-500/50 hover:bg-slate-800/50'
                }`}
              >
                {selectedVoice ? (
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedVoice.gender === 'Female' ? 'bg-pink-500' : 'bg-blue-500'
                    }`}>
                      <span className="text-white font-bold">
                        {selectedVoice.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{selectedVoice.name}</p>
                      <p className="text-xs text-slate-400">{selectedVoice.gender}</p>
                    </div>
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-amber-500 font-medium">Choose a voice</span>
                  </div>
                )}
              </button>
            </div>

            {/* Preview Button */}
            <button
              type="button"
              onClick={handlePreview}
              disabled={isGeneratingPreview || !text.trim() || !voiceId}
              className="w-full rounded-xl border border-amber-500 bg-transparent py-3 font-semibold text-amber-500 hover:bg-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPreview ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Preview...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                  </svg>
                  Preview Your Text
                </span>
              )}
            </button>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={isGenerating || !text.trim() || !voiceId}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 font-semibold text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Project...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Create Project
                </span>
              )}
            </button>

            {/* Clear Draft Button */}
            {(title || text || voiceId) && (
              <button
                type="button"
                onClick={handleClearDraft}
                className="w-full rounded-xl border border-slate-700 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Clear Draft
              </button>
            )}

            {/* Draft saved indicator */}
            {(title || text) && (
              <p className="text-center text-xs text-slate-500">
                ✓ Draft auto-saved
              </p>
            )}
          </div>
        </div>
      </form>

      {/* Voice Selector Modal */}
      <VoiceSelectorModal
        isOpen={isVoiceSelectorOpen}
        onClose={() => setIsVoiceSelectorOpen(false)}
        onSelect={handleVoiceSelect}
        voices={voices}
        selectedVoiceId={voiceId}
        languageCode={languageCode}
      />
    </>
  );
}
