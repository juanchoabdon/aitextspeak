'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createProjectAudio } from '@/lib/projects/actions';
import { generatePreview } from '@/lib/tts/actions';
import type { Voice } from '@/lib/tts/types';
import { VoiceSelectorModal } from '@/components/tts/VoiceSelectorModal';
import { AudioPlayButton } from '@/components/ui/AudioPlayButton';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { useUsage } from '@/hooks/useUsage';
import { countBillableCharacters } from '@/lib/tts/ssml';
import {
  trackAudioAdded,
  trackPreviewGenerated,
  trackGenerationFailed,
  trackUpgradeModalShown,
  trackVoiceSelectorOpened,
  trackVoiceSelected,
  trackLanguageBlocked,
} from '@/lib/analytics/events';

interface AddAudioFormProps {
  projectId: string;
  voices: Voice[];
  languages: { code: string; name: string }[];
}

function generateSessionKey(): string {
  return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function AddAudioForm({ projectId, voices, languages }: AddAudioFormProps) {
  const router = useRouter();
  const { usage, checkCanGenerate, refetch: refetchUsage } = useUsage();

  // Form state
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [languageCode, setLanguageCode] = useState('en-US');
  const [voiceId, setVoiceId] = useState('');
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [volume, setVolume] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [sessionKey] = useState(generateSessionKey);

  // Voice selector modal
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
  
  // Upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);

  // Get selected voice details
  const selectedVoice = voices.find(v => v.voice_id === voiceId);

  const characterCount = countBillableCharacters(text);
  const maxCharacters = usage?.isUnlimited ? 50000 : (usage?.charactersRemaining || 5000);
  
  // Check if user is approaching or over limit
  const isOverLimit = usage && !usage.isUnlimited && characterCount > usage.charactersRemaining;
  const isApproachingLimit = usage && !usage.isUnlimited && usage.percentUsed >= 80;
  
  // Refetch usage when component mounts
  useEffect(() => {
    refetchUsage();
  }, [refetchUsage]);

  // Handle voice selection from modal
  function handleVoiceSelect(voice: Voice) {
    setVoiceId(voice.voice_id);
    setPreviewAudioUrl(null);
    trackVoiceSelected({
      voiceId: voice.voice_id,
      voiceName: voice.name,
      provider: voice.provider,
      gender: voice.gender || 'Unknown',
      language: voice.language_code,
    });
  }

  // Check usage limits before generating
  async function checkUsageLimits(): Promise<boolean> {
    const result = await checkCanGenerate(characterCount);
    
    if (!result.allowed) {
      setUpgradeMessage(result.reason || 'You have reached your usage limit.');
      setShowUpgradeModal(true);
      trackUpgradeModalShown({
        trigger: 'usage_limit',
        currentPlan: usage?.planName || 'Free',
        message: result.reason,
      });
      return false;
    }
    
    return true;
  }

  // Generate preview
  async function handlePreview() {
    if (!text.trim() || !voiceId) return;
    
    // Show loading immediately
    setError(null);
    setIsGeneratingPreview(true);
    setPreviewAudioUrl(null);

    try {
      // Check limits before preview (previews also count toward usage)
      const canGenerate = await checkUsageLimits();
      if (!canGenerate) {
        setIsGeneratingPreview(false);
        return;
      }

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
        trackPreviewGenerated({
          voiceId: voiceId,
          voiceName: selectedVoice?.name || voiceId,
          characterCount: Math.min(text.length, 200),
          provider: selectedVoice?.provider || 'azure',
          language: languageCode,
        });
        // Refetch usage after preview
        refetchUsage();
      } else {
        setError(result.error || 'Failed to generate preview');
        trackGenerationFailed({
          errorMessage: result.error || 'Unknown error',
          voiceId: voiceId,
          provider: selectedVoice?.provider,
          characterCount: Math.min(text.length, 200),
          type: 'preview',
        });
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsGeneratingPreview(false);
    }
  }

  // Save audio to project
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!voiceId) {
      setError('Please select a voice first');
      return;
    }
    
    // Show loading immediately
    setError(null);
    setIsGenerating(true);

    try {
      // Check usage limits before saving
      const canGenerate = await checkUsageLimits();
      if (!canGenerate) {
        setIsGenerating(false);
        return;
      }

      const result = await createProjectAudio({
        project_id: projectId,
        title: title || undefined,
        text,
        voice_id: voiceId,
        voice_name: selectedVoice?.name || voiceId,
        provider: selectedVoice?.provider || 'azure',
        language_code: languageCode,
        speed,
        volume,
      });

      if (result.success) {
        trackAudioAdded({
          projectId: projectId,
          characterCount: text.length,
          voiceId: voiceId,
          voiceName: selectedVoice?.name || voiceId,
          provider: selectedVoice?.provider || 'azure',
          language: languageCode,
        });
        // Refetch usage after saving
        refetchUsage();
        // Clear form
        setTitle('');
        setText('');
        setPreviewAudioUrl(null);
        // Refresh page to show new audio
        router.refresh();
      } else {
        setError(result.error || 'Failed to create audio');
        trackGenerationFailed({
          errorMessage: result.error || 'Unknown error',
          voiceId: voiceId,
          provider: selectedVoice?.provider,
          characterCount: text.length,
          type: 'full',
        });
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Usage Warning */}
        {usage && !usage.isUnlimited && (
          <div className={`rounded-xl border px-4 py-3 ${
            usage.hasReachedLimit
              ? 'border-red-500/50 bg-red-500/10'
              : isApproachingLimit
              ? 'border-amber-500/50 bg-amber-500/10'
              : 'border-slate-700 bg-slate-800/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">
                Monthly Usage: <span className={usage.hasReachedLimit ? 'text-red-400' : isApproachingLimit ? 'text-amber-400' : 'text-white'}>
                  {usage.planName}
                </span>
              </span>
              <span className="text-sm text-slate-400">
                {usage.charactersUsed.toLocaleString()} / {usage.charactersLimit.toLocaleString()} chars
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  usage.hasReachedLimit ? 'bg-red-500' : isApproachingLimit ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
              />
            </div>
            {usage.hasReachedLimit && (
              <p className="mt-2 text-sm text-red-400">
                You&apos;ve reached your limit. <button type="button" onClick={() => setShowUpgradeModal(true)} className="underline hover:text-red-300">Upgrade now</button> to continue.
              </p>
            )}
            {isApproachingLimit && !usage.hasReachedLimit && (
              <p className="mt-2 text-sm text-amber-400">
                You&apos;re approaching your limit. Consider <button type="button" onClick={() => setShowUpgradeModal(true)} className="underline hover:text-amber-300">upgrading</button> for more characters.
              </p>
            )}
          </div>
        )}

        {/* Over limit warning for current text */}
        {isOverLimit && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Your text has {characterCount.toLocaleString()} characters, but you only have {usage?.charactersRemaining?.toLocaleString() || 0} remaining this month.
            <button type="button" onClick={() => setShowUpgradeModal(true)} className="ml-1 underline hover:text-red-300">
              Upgrade now
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Title <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                placeholder="e.g., Introduction, Chapter 1, Outro..."
              />
            </div>

            {/* Text Input */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-300">
                  Text to Convert *
                </label>
                <button
                  type="button"
                  onClick={() => setText((t) => (t ? `${t} <break time=\"1s\"/>` : `<break time=\"1s\"/>`))}
                  className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                >
                  Insert pause
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                rows={8}
                maxLength={maxCharacters + 2000}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                placeholder="Enter or paste your text here..."
              />
              <div className="mt-2 flex justify-end text-sm">
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
                      <p className="text-sm font-medium text-amber-400">Preview Ready</p>
                      <p className="text-xs text-slate-400">First 200 characters • {selectedVoice?.name}</p>
                    </div>
                  </div>

                  <AudioPlayButton
                    src={previewAudioUrl}
                    variant="amber"
                    autoPlay={true}
                    showTime={true}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          <div className="space-y-4">
            {/* Language Selection */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Language
                </label>
                {usage?.allowedLanguages !== 'all' && (
                  <span className="text-xs text-amber-400">
                    🔒 English only on Free plan
                  </span>
                )}
              </div>
              <select
                value={languageCode}
                onChange={(e) => {
                  const newLang = e.target.value;
                  // Check if language is allowed
                  if (usage?.allowedLanguages !== 'all') {
                    const langPrefix = newLang.toLowerCase().split('-')[0];
                    const isAllowed = usage?.allowedLanguages?.some(allowed => 
                      allowed.toLowerCase().startsWith(langPrefix) || 
                      langPrefix === allowed.toLowerCase().split('-')[0]
                    );
                    if (!isAllowed) {
                      trackLanguageBlocked(newLang, usage?.planName || 'Free');
                      trackUpgradeModalShown({
                        trigger: 'language_locked',
                        currentPlan: usage?.planName || 'Free',
                        message: 'Language not available on current plan',
                      });
                      setUpgradeMessage('This language is only available on paid plans. Upgrade to access 50+ languages!');
                      setShowUpgradeModal(true);
                      return;
                    }
                  }
                  setLanguageCode(newLang);
                  setVoiceId('');
                  setPreviewAudioUrl(null);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none text-sm"
              >
                {languages.map((lang) => {
                  const langPrefix = lang.code.toLowerCase().split('-')[0];
                  const isLocked = usage?.allowedLanguages !== 'all' && 
                    !usage?.allowedLanguages?.some(allowed => 
                      allowed.toLowerCase().startsWith(langPrefix) || 
                      langPrefix === allowed.toLowerCase().split('-')[0]
                    );
                  return (
                    <option key={lang.code} value={lang.code}>
                      {isLocked ? '🔒 ' : ''}{lang.name}{isLocked ? ' (Pro)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Voice Selection */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Voice
              </label>
              
                <button
                  type="button"
                  onClick={() => {
                    setIsVoiceSelectorOpen(true);
                    trackVoiceSelectorOpened(languageCode);
                  }}
                className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                  selectedVoice
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-dashed border-slate-600 bg-slate-800/30 hover:border-amber-500/50 hover:bg-slate-800/50'
                }`}
              >
                {selectedVoice ? (
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedVoice.gender === 'Female' ? 'bg-pink-500' : 'bg-blue-500'
                    }`}>
                      <span className="text-white font-bold text-xs">
                        {selectedVoice.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate text-sm">{selectedVoice.name}</p>
                      <p className="text-xs text-slate-400">{selectedVoice.gender}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-amber-500 font-medium text-sm">Choose a voice</span>
                  </div>
                )}
              </button>
            </div>

            {/* Prosody Controls */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
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

            {/* Affiliate Program */}
            <Link
              href="/affiliates"
              className="block rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-600/10 p-4 hover:border-amber-500/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Affiliate Program</p>
                  <p className="mt-1 text-xs text-slate-300">Earn commission by sharing AI TextSpeak.</p>
                </div>
                <span className="text-sm font-semibold text-amber-400 whitespace-nowrap">Learn More →</span>
              </div>
            </Link>

            {/* Preview Button */}
            <button
              type="button"
              onClick={handlePreview}
              disabled={isGeneratingPreview || !text.trim() || !voiceId}
              className="w-full rounded-xl border border-amber-500 bg-transparent py-2.5 text-sm font-semibold text-amber-500 hover:bg-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPreview ? 'Generating...' : 'Preview Voice'}
            </button>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isGenerating || !text.trim() || !voiceId}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 font-semibold text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Audio'
              )}
            </button>

            <p className="text-center text-xs text-slate-500">
              Once saved, audio cannot be modified
            </p>
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
        allowedLanguages={usage?.allowedLanguages}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade to Continue"
        message={upgradeMessage}
        currentPlan={usage?.planName || 'Free'}
        charactersUsed={usage?.charactersUsed || 0}
        charactersLimit={usage?.charactersLimit || 0}
      />
    </>
  );
}

